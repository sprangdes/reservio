# LINE 預約帳號綁定與客戶姓名快照設計

## 目標

解決兩個目前已確認的問題：

1. 客戶透過商家 LINE 官方帳號完成預約後，預約只綁定系統建立的臨時 LINE 客戶帳號，因此登入 Reservio 後看不到該預約。
2. 商家查看 LINE 預約時，客戶名稱顯示為系統產生的臨時帳號名稱，缺乏辨識度。

本次採用 LINE 官方 Account Link API，讓客戶主動登入並確認綁定。綁定成功後，將該 LINE 客戶在同一商家的既有 LINE 預約轉移至正式 Reservio 客戶帳號。

## 範圍

### 包含

- LINE 預約保存客戶輸入的姓名與電話快照。
- 商家預約列表優先顯示預約姓名快照。
- 未綁定的 LINE 客戶完成預約後收到「綁定 Reservio 帳號」按鈕。
- 使用 LINE Account Link API 完成安全綁定。
- 綁定成功後轉移同一商家、同一 LINE 客戶的既有 LINE 預約。
- 綁定後的新預約直接歸屬正式 Reservio 帳號。
- 提供解除綁定能力，符合 LINE Account Link API 使用要求。

### 不包含

- 依姓名、電話或 Email 自動推測帳號。
- 跨商家自動共用綁定狀態。
- 「我的預約」Rich Menu 功能的完整聊天查詢流程。
- 合併或刪除綁定前建立的臨時 `UserData`。
- 把非 LINE 來源預約轉移至其他帳號。

## 核心決策

### 綁定單位

綁定狀態以 `business_id + line_user_id` 為單位，保存在 `LineCustomer`。

不同商家的 Messaging API channel 可能隸屬不同 LINE Provider，因此同一位 LINE 使用者在不同商家可能取得不同的 `lineUserId`。每個商家都必須獨立完成綁定，不能假設 Reservio LINE Login 的 `lineUserId` 一定相同。

### 不直接取代既有臨時帳號欄位

保留 `LineCustomer.user` 作為原本的臨時 LINE 客戶帳號，新增 nullable 的 `linkedUser`：

- `user`：每個 `LineCustomer` 原有且唯一的臨時帳號。
- `linkedUser`：客戶確認綁定後的正式 Reservio 帳號，可被多個商家的 `LineCustomer` 共用。

這能保留既有資料與唯一限制，同時支援同一個 Reservio 帳號綁定多個商家，不需要把既有 `user_id` unique constraint 改成多對一。

### 預約歸屬

- 尚未綁定：使用 `LineCustomer.user` 建立預約。
- 已綁定：使用 `LineCustomer.linkedUser` 建立預約。
- 綁定成功：將該 `LineCustomer.user` 在同一商家、來源為 `LINE` 的既有預約更新為 `linkedUser`。
- 解除綁定後：未來預約恢復使用臨時帳號；已轉移的歷史預約仍保留在正式帳號，不反向搬回，避免使用者已看過或操作過的預約突然消失。

## 資料模型

### Reservation

新增：

```text
customer_name varchar(255) nullable
customer_phone varchar(50) nullable
```

LINE 預約建立時寫入聊天流程中由客戶輸入的姓名與電話。這兩個欄位是建立當下的快照，不會因帳號名稱、LINE 暱稱或聯絡資料後續變更而改變。

既有 WEB 預約可以維持 `null`，API 顯示時使用既有 username 作為 fallback。

### LineCustomer

新增：

```text
linked_user_id bigint nullable
linked_at timestamp nullable
```

`linked_user_id` 是對 `user_data.id` 的 many-to-one 關聯，不設 unique constraint。

### LineAccountLink

新增獨立實體保存短效、單次使用的綁定狀態：

```text
id
business_id
line_customer_id
request_token_hash
line_link_token_ciphertext
nonce_hash nullable
target_user_id nullable
status: CREATED | AWAITING_LINE | COMPLETED | FAILED | EXPIRED
expires_at
created_at
completed_at nullable
```

安全規則：

- 對外 linking URL 只包含不可預測的 request token。
- DB 只保存 request token 與 nonce 的 SHA-256 hash。
- LINE link token 使用既有 credential encryption key 加密保存。
- request token 與 LINE link token 最長有效 10 分鐘。
- nonce 使用安全亂數產生，至少 128 bits。
- 每筆 request 與 nonce 只能成功使用一次。

目前專案使用 Hibernate `ddl-auto=update`，新增 nullable 欄位與新表可由既有部署方式建立，不需要修改既有 constraint。

## 完整流程

### 1. 完成 LINE 預約

1. 客戶在聊天流程輸入姓名與電話。
2. 系統取得或建立 `LineCustomer`。
3. 系統以 `linkedUser` 或臨時 `user` 建立預約。
4. 預約同時保存 `customerName` 與 `customerPhone`。
5. 若 `linkedUser` 已存在，只回覆預約成功，不顯示綁定按鈕。
6. 若尚未綁定：
   - 呼叫 `POST /v2/bot/user/{userId}/linkToken`。
   - 建立短效 `LineAccountLink`。
   - 以 LINE buttons template 回覆預約成功與「綁定 Reservio 帳號」按鈕。
7. 若 link token API 暫時失敗，預約本身仍視為成功，只回覆預約成功文字並記錄警告，不回滾預約。

尚未綁定的客戶每次完成預約時都可以再次看到綁定按鈕；綁定成功後永久停止提示。第一版不加入「不再提醒」，避免客戶關閉後沒有可重新啟動綁定的入口。

### 2. 開啟綁定頁

按鈕開啟：

```text
https://www.reserv-io.com/line/account-link?request={opaque-token}
```

前端向 backend 查詢 request 狀態：

- token 無效、過期或已使用：顯示明確錯誤。
- 尚未登入：保留 request token，導向 Reservio 登入頁。
- 已登入 ROLE_USER：顯示商家名稱、綁定說明與確認按鈕。
- ROLE_BUSINESS：拒絕綁定，要求改用客戶帳號。

一般帳密登入及 LINE 客戶登入都必須能回到原本的確認頁。登入 redirect 僅允許站內相對路徑，避免 open redirect。

### 3. 客戶確認

1. backend 重新驗證 request 尚未過期且未使用。
2. 產生安全 nonce，保存 nonce hash 與目前登入的 `targetUser`。
3. 狀態改為 `AWAITING_LINE`。
4. backend 回傳 LINE 官方 account-linking URL：

```text
https://access.line.me/dialog/bot/accountLink?linkToken={linkToken}&nonce={nonce}
```

5. 前端導向該 URL。

### 4. LINE webhook 完成綁定

Webhook worker 新增 account link event 處理：

1. 僅接受 `link.result=ok`。
2. 以 nonce hash 查找 `AWAITING_LINE` request。
3. 驗證 webhook 所屬 `BusinessLineChannel`、event 的 `lineUserId` 與 request 中的 `LineCustomer` 完全一致。
4. 鎖定 `LineCustomer` 與 request，避免 webhook redelivery 重複處理。
5. 設定 `LineCustomer.linkedUser` 與 `linkedAt`。
6. 將符合以下條件的預約轉移至正式帳號：
   - `business_id` 等於 request 商家。
   - `user_id` 等於該 `LineCustomer` 的臨時帳號。
   - `source = LINE`。
7. request 改為 `COMPLETED`。
8. 使用 webhook reply token 回覆「Reservio 帳號綁定成功，既有 LINE 預約已同步」。

若 webhook `result=failed`，request 改為 `FAILED`，不修改任何帳號或預約資料。

Webhook redelivery 必須具備冪等性：已完成的 nonce 再次送達時不得重複轉移或失敗。

## 解除綁定

在 Reservio 客戶端新增 LINE 綁定管理區塊：

- 列出目前帳號已綁定的商家名稱。
- 客戶可以逐一解除。
- 解除時只清除該 `LineCustomer.linkedUser` 與 `linkedAt`。
- 歷史預約不反向轉移。
- 解除後從該商家 LINE 建立的新預約會再次使用臨時帳號，並再次顯示綁定提示。

解除 API 必須驗證目前登入者就是 `linkedUser`，不能只依 client 傳入的 `LineCustomer` ID 執行。

## 商家端顯示與搜尋

`ReservationResponse.username` 保持相容，但內容改為：

```text
reservation.customerName
→ reservation.user.username
→ null
```

因此現有 frontend 不需要大幅修改即可顯示客戶輸入姓名。

商家預約關鍵字搜尋需同時搜尋：

- `reservation.customerName`
- `reservation.user.username`
- `reservation.remark`

排序欄位仍保留既有 username 排序；本次不新增快照姓名排序。

## 錯誤處理

- LINE link token 發行失敗：不影響已完成預約。
- request 過期：顯示「綁定連結已過期，請在下次 LINE 預約完成後重新綁定」。
- request 已使用：顯示完成或不可重複使用狀態。
- 使用商家帳號確認：拒絕並提示使用客戶帳號。
- target user 已經是此 `LineCustomer` 的 linked user：視為冪等成功。
- 此 `LineCustomer` 已綁定另一個正式帳號：拒絕覆蓋，必須先由原帳號解除綁定。
- 同一正式帳號可綁定多個商家。
- account-link webhook 缺少 nonce、LINE user ID 或 reply token：記錄失敗，不修改資料。

## 測試策略

### 單元測試

- LINE 預約保存姓名與電話快照。
- 商家 API 優先回傳 customerName。
- 已綁定客戶使用 linkedUser 建立新預約。
- 未綁定客戶仍使用臨時帳號。
- link token 發行與 linking URL 建立。
- request token、nonce 的過期與單次使用。
- webhook business、lineUserId、nonce 三方驗證。
- 綁定成功只轉移同商家、同臨時帳號、LINE 來源預約。
- redelivery 不重複執行。
- 解除綁定只能由 linked user 執行。

### 整合測試

- 預約完成 → 收到 account link button。
- 登入 → 確認 → LINE callback → 綁定成功。
- 綁定前預約登入不可見，綁定後可見。
- 綁定後再次預約，不再顯示按鈕且預約直接出現在正式帳號。
- 商家預約列表顯示客戶輸入姓名。

## 部署與觀測

新增結構化 log：

```text
line_account_link_created
line_account_link_confirmed
line_account_link_completed
line_account_link_failed
line_account_unlinked
line_reservations_transferred
```

log 只記錄 business ID、request ID、內部 user ID、轉移筆數與結果，不記錄 link token、nonce、LINE user ID 全值或電話。

部署後以第一個測試商家驗證：

1. 未綁定帳號完成 LINE 預約。
2. 商家端顯示輸入姓名。
3. 客戶登入後確認綁定。
4. LINE 收到成功訊息。
5. 客戶 Reservio 預約列表出現綁定前預約。
6. 再次 LINE 預約直接歸屬正式帳號。
7. 解除綁定後再次預約恢復提示。

## 官方依據

- [LINE User account linking](https://developers.line.biz/en/docs/messaging-api/linking-accounts/)
- [LINE Messaging API reference](https://developers.line.biz/en/reference/messaging-api/#issue-link-token)
- [LINE user ID issuing rules](https://developers.line.biz/en/docs/messaging-api/getting-user-ids/)
