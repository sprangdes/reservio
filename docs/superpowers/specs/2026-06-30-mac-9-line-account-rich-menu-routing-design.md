# MAC-9 LINE 帳號綁定與 Rich Menu 狀態分流設計

## 目標

依商家 LINE 使用者是否已綁定 Reservio 客戶帳號，顯示不同的 Rich Menu：

- 未綁定：立即預約、我的預約、綁定 LINE 帳號。
- 已綁定：立即預約、我的預約、修改我的資料。

綁定必須透過 LINE Login，保存 LINE Login subject、Messaging API userId 與 Reservio user 的關聯。綁定前後透過 LINE 建立的預約都必須歸戶至正式 Reservio 客戶帳號，並可在 Web 查詢。

## 現況與範圍

專案已具備 LINE Login、LINE Account Link、`LineCustomer.linkedUser`、既有 LINE 預約轉移、綁定後預約歸戶、解除綁定及 LINE 預約查詢。本次在既有機制上補齊：

- 每個商家兩套 Rich Menu 與 per-user 指派。
- Rich Menu 的綁定入口與未綁定「我的預約」引導。
- 強制以 LINE Login 完成綁定。
- 同商家重複身分綁定防護。
- 客戶資料編輯 API 與頁面。

本次客戶資料只包含使用者名稱與 Email，不新增電話欄位。既有預約姓名與電話快照維持不變。

## 核心決策

### 每個商家建立兩套 Rich Menu

`BusinessLineChannel` 保存未綁定與已綁定兩個 Rich Menu ID。未綁定版設為 LINE 官方帳號的 default menu；已綁定客戶透過 LINE per-user Rich Menu API 指派已綁定版。

此方案能真正改變第三格顯示文字。單一 menu 搭配 backend 分流只能改變點擊結果，無法符合標籤必須隨狀態變更的驗收條件。

### 綁定以既有 Account Link 模型為主

關聯由現有資料模型共同表達：

- `UserData.lineUserId`：LINE Login subject。
- `LineCustomer.lineUserId`：該商家 Messaging API userId。
- `LineCustomer.linkedUser`：Reservio 客戶帳號。

不複製 subject 到 `LineCustomer`，避免同一身分存在兩份可能不一致的資料。

### 綁定強制使用 LINE Login

綁定頁不允許一般帳密 session 直接確認。使用者必須由 LINE Login 登入，且確認 API 必須再次驗證目標 `UserData` 為 `ROLE_USER` 且 `lineUserId` 非空。

### 同商家一對一防護

同一 `business + Messaging API userId` 已由 `LineCustomer` unique constraint 保證唯一。本次再阻擋：

- 同一 Messaging API userId 綁定另一個 Reservio 帳號。
- 同一 Reservio／LINE Login 帳號在同一商家綁定另一個 Messaging API userId。

不同商家仍可各自綁定，因為 Messaging API userId 可能受 LINE Provider 範圍影響而不同。

## 資料模型

### BusinessLineChannel

沿用既有 `rich_menu_id` 作為未綁定 menu，新增已綁定 menu 欄位：

```text
rich_menu_id varchar(100) nullable
linked_rich_menu_id varchar(100) nullable
rich_menu_updated_at timestamp nullable
```

這避免不必要的欄位搬移；部署前既有 menu 自然成為待替換的未綁定 menu。專案使用 Hibernate `ddl-auto=update`，新增欄位保持 nullable。

`LineCustomer` 與 `UserData` 不新增關聯欄位。

## Rich Menu 定義與建立流程

兩套 menu 的前兩格相同：

1. `reservio.action=book`
2. `reservio.action=my_reservations`

第三格：

- 未綁定版：postback `reservio.action=link_account`，標籤「綁定 LINE 帳號」。
- 已綁定版：URI action 指向 Reservio `/profile`，標籤「修改我的資料」。

商家 provision 流程：

1. 建立兩套 menu。
2. 分別上傳對應圖片。
3. 兩套都成功後，將未綁定版設為 default。
4. 查詢商家所有已綁定 `LineCustomer`，逐一指派新的已綁定版。
5. 保存兩個新 menu ID 與更新時間。
6. 最後才清理舊 menu；清理失敗只記錄警告，不撤銷已成功的新設定。

若建立或上傳中途失敗，保留舊 menu 設定並盡力刪除本次已建立但未啟用的 menu。

## 未綁定流程

### 點擊「綁定 LINE 帳號」

1. Webhook 收到 `link_account` postback 與 Messaging API userId。
2. 系統取得或建立該商家的 `LineCustomer`。專用方法不得以 `null` 覆蓋既有姓名或電話。
3. 若客戶已綁定，回覆「已完成綁定」，並重新指派已綁定 menu。
4. 若未綁定，發行 LINE Account Link token 與 10 分鐘 request token。
5. 回覆含「使用 LINE 登入並綁定」URI 按鈕的訊息。

LINE API 暫時無法發行 token 時，回覆可重試訊息，不修改任何預約或綁定資料。

### 點擊「我的預約」

- 已綁定：使用 `linkedUser` 查詢未來預約，沿用現有卡片與取消流程。
- 未綁定：不顯示臨時帳號預約，直接建立相同的 Account Link 引導。

## LINE Login 與 Account Link

1. 綁定頁保存 request token 與 return path。
2. 未登入或目前 session 不是帶 LINE subject 的客戶帳號時，只提供 LINE Login。
3. LINE Login success handler 回到原綁定頁。
4. 確認 API 驗證 request、`ROLE_USER`、LINE subject 與到期時間。
5. 系統產生 nonce，導向 LINE Account Link URL。
6. Account Link webhook 驗證 business、Messaging API userId、nonce 與 target user。
7. 檢查同商家沒有另一個 `LineCustomer` 綁定同一 target user。
8. 保存 `linkedUser`／`linkedAt`，轉移同商家、臨時 user、`source=LINE` 的既有預約。
9. 指派已綁定 Rich Menu，回覆綁定成功。

Callback redelivery 必須冪等。若資料已完成但 Rich Menu API 暫時失敗，webhook event 保持可重試；後續重送只重試 menu 指派，不重複轉移預約。

## 解除綁定

沿用現有 Web 解除綁定入口。系統先驗證操作者與綁定，再呼叫 per-user Rich Menu unlink API，成功後才以交易清除 `linkedUser`，使使用者回到 default 未綁定版。歷史預約不反向轉移，未來 LINE 預約重新使用臨時帳號。

若 Rich Menu API 失敗，資料庫維持已綁定並回傳可重試錯誤。若 menu 已解除但資料庫交易失敗，系統盡力重新指派已綁定 menu 並記錄錯誤。Log 記錄商家與內部 customer ID，不記錄完整 LINE user ID。

## 客戶資料編輯

### API

新增：

```text
PUT /api/me/profile
```

只允許已登入的 `ROLE_USER` 修改自己的：

- `username`：trim 後長度為 1 至 100 個字元，必須唯一。
- `email`：trim、轉小寫，必須符合 Email 格式且不超過 255 個字元，並且唯一。

Email 改變時將 `emailVerified` 設為 `false`，之後沿用現有 Email 驗證功能。username 改變後必須更新目前 Spring Security authentication principal，避免 session 仍以舊名稱查詢使用者。

驗證錯誤回傳 400；username 或 Email 衝突回傳 409。資料庫 unique constraint 保留為競態條件的最後防線。

### Frontend

新增受保護的 `/profile` route 與表單：

- 初始值來自既有 `/api/me`。
- 顯示使用者名稱與 Email。
- 儲存成功後刷新 AuthContext。
- Email 改變時提示需要重新驗證。
- 顯示 backend 的 400／409 錯誤。

已綁定 Rich Menu 直接使用 URI action 開啟此頁。若瀏覽器沒有 Reservio session，既有 auth guard 導向登入；客戶可用 LINE Login 登入後返回 `/profile`。

## 錯誤與一致性

- 過期或已使用的 request：拒絕並提示重新從 Rich Menu 開始。
- 一般帳密帳號確認：拒絕，要求使用 LINE Login。
- Messaging API userId 已綁另一帳號：拒絕覆蓋。
- 同一 LINE Login 帳號已在同商家綁定另一 Messaging API userId：拒絕並提示先解除。
- Rich Menu 指派失敗：不重複搬移預約，由 webhook redelivery 重試指派。
- 已綁定者使用舊 menu：提示已綁定並自我修復 menu 指派。
- Log 僅包含 business ID、LineCustomer ID、內部 user ID、request ID 與錯誤類型。

## 測試策略

### 單元測試

- `LineMessagingClient`：per-user Rich Menu link／unlink endpoint 與錯誤轉換。
- `LineRichMenuService`：兩套定義、圖片標籤、建立順序、已綁定客戶重新指派、失敗保留舊設定。
- `LineCustomerService`：為綁定建立 customer 時不清除既有聯絡資料。
- `LineReservationConversation`：未綁定的綁定入口與「我的預約」、已綁定誤觸、token 發行失敗。
- `LineAccountLinkService`：缺少 LINE subject、兩種重複綁定、預約轉移與 redelivery 冪等。
- `LineWebhookWorker`：成功後 menu 切換、指派失敗可重試。
- Profile service／controller：驗證、唯一性、Email 驗證重設、session principal 更新與 `ROLE_USER` 權限。
- Frontend：route、初始值、成功更新、Email 提示及 400／409 顯示。

### 整合測試

1. 未綁定 Rich Menu → LINE Login → Account Link callback → 已綁定 Rich Menu。
2. 綁定前 LINE 預約在 callback 後出現在 Web。
3. 綁定後新 LINE 預約直接歸戶正式帳號。
4. 未綁定「我的預約」只顯示綁定引導。
5. 解除綁定後恢復 default menu。
6. 同商家重複 Messaging API userId 綁定被拒絕且預約不搬移。

## 驗收對照

- 兩套 menu 與 per-user 指派滿足未綁定／已綁定標籤分流。
- `link_account` postback 與強制 LINE Login 滿足綁定入口及 subject 保存。
- 現有預約轉移與 linked user 建立流程滿足 Web 可查詢與後續預約歸戶。
- 未綁定 `my_reservations` 分流滿足先綁定引導。
- 已綁定 menu 的 `/profile` URI 與新頁面滿足修改資料入口。
- 同商家一對一防護避免錯誤或重複歸戶。
