# LINE Messaging 預約設定與試點手冊

本文件供商家管理者與 Reservio 維運人員設定、驗收及排查 LINE 聊天式預約。

## 1. 上線前準備

商家需要：

- LINE 官方帳號。
- LINE Developers Provider 與 Messaging API channel。
- Channel ID。
- Channel Secret。
- 長效 Channel Access Token。
- Reservio 商家管理員帳號。

Reservio production 必須設定：

- `LINE_CREDENTIAL_ENCRYPTION_KEY`：固定且安全保存的 Base64 32-byte 金鑰。
- `LINE_WEBHOOK_BASE_URL`：外部可存取的 HTTPS 網址，例如 `https://www.reserv-io.com`。
- PostgreSQL 備份及還原程序。

不要把 Channel Secret、Access Token 或 encryption key 寫入 Git、工單、聊天訊息或 log。

## 2. 商家啟用步驟

1. 在 LINE Developers Console 建立 Messaging API channel。
2. 在 Reservio 使用商家帳號進入「LINE Messaging API 串接」。
3. 輸入 Channel ID、Channel Secret 與 Channel Access Token。
4. 暫時保持「啟用 LINE 串接」關閉並儲存。
5. 複製 Reservio 顯示的 Webhook URL。
6. 在 LINE Developers Console 將該網址填入 Webhook URL。
7. 啟用 `Use webhook`，並關閉會與 Reservio 重複回覆的自動回應。
8. 回到 Reservio 開啟串接並儲存。
9. 點擊「測試連線」，確認以下三項中的前兩項成功：
   - Webhook
   - Token validation
   - Rich Menu
10. 點擊「建立 Rich Menu」，確認 Rich Menu 狀態成功。
11. 使用測試 LINE 帳號加商家官方帳號為好友並執行驗收表。

## 3. Rich Menu 行為

第一版包含三個固定 postback action：

| 入口 | Postback data | 行為 |
|---|---|---|
| 立即預約 | `reservio.action=book` | 啟動聊天式預約 |
| 我的預約 | `reservio.action=my_reservations` | 回覆「功能準備中」 |
| 查詢可預約時段 | `reservio.action=availability` | 回覆「功能準備中」 |

後端依 postback data 路由，不依顯示文字判斷。

## 4. 試點驗收表

每一家商家都要用不同 LINE 測試帳號執行：

- [ ] 有效日期：完成服務、日期、時段、姓名、電話及確認，Reservio 後台出現 LINE 來源預約。
- [ ] 不營業日期：回覆「當日不營業」，狀態仍停留在日期輸入。
- [ ] 無可用時段：提示改選日期，不建立預約。
- [ ] 時段競爭：兩個帳號選同時段，只有第一筆成功，第二筆回到日期選擇。
- [ ] 重新開始：流程中點擊「重新開始」，先前輸入資料不再沿用。
- [ ] Webhook 重送：相同 event ID 重送時不建立第二筆預約或重複回覆。
- [ ] 限流：短時間超過設定訊息數時收到「操作太頻繁，請稍後再試」。
- [ ] 個資檢查：production log 不包含電話、姓名、LINE user ID、token 或完整訊息。

記錄每項的日期、測試人員、商家 ID、event ID 與結果；不要記錄客戶輸入內容。

## 5. 兩階段 rollout

### 第一家：內部試點

1. 只啟用第一家內部商家。
2. 完成全部驗收情境。
3. 至少觀察一個完整營業週期。
4. 每日檢查：
   - `line_event_failed`
   - `line_api ... outcome=FAILED`
   - `line_reservation_conflict`
   - LINE 預約完成數
5. 確認沒有重複預約、漏回覆、個資 log 或持續性 retry。

### 第二家：受控試點

第一家觀察完成且沒有未解決的高嚴重度問題後才啟用第二家。第二家需重新執行完整驗收表，不可直接沿用第一家的結果。

## 6. 觀測與資料保存

可用 event ID 串接以下紀錄：

- `line_webhook_ingested`
- `line_event_processing`
- `line_event_processed`
- `line_event_failed`

其他重要紀錄：

- `line_conversation_saved`：只記 conversation state。
- `line_api`：記錄 operation、latency、outcome 與 error type。
- `line_reservation_completed`
- `line_cleanup`

預設保存期限：

- 已處理或失敗 webhook event：30 天。
- conversation：最後更新後 14 天。
- PENDING event 不會被清理，以免刪除尚待重試的事件。
- 每日 03:30 執行清理。

可透過 production 環境變數調整：

- `LINE_EVENT_RETENTION_DAYS`
- `LINE_CONVERSATION_RETENTION_DAYS`
- `LINE_CLEANUP_CRON`
- `LINE_RATE_LIMIT_PER_MINUTE`
- `LINE_RATE_LIMIT_WINDOW_SECONDS`

目前限流為單一 application instance 的記憶體固定時間窗，適用兩家試點。若部署多個 backend instance，正式擴大前必須改成 Redis 或資料庫共享限流。

## 7. 憑證輪替

### Channel Access Token

1. 在 LINE Developers Console 發行新 token。
2. 在 Reservio 更新 Access Token 並儲存。
3. 執行「測試連線」。
4. 重新建立／更新 Rich Menu。
5. 驗證預約流程後撤銷舊 token。

更新憑證後，Reservio 會清除先前 token/webhook 驗證狀態，必須重新測試。

### Channel Secret

1. 在 LINE Developers Console 更新 Secret。
2. 立即在 Reservio 儲存新 Secret。
3. 執行 Webhook 驗證與完整測試訊息。

### Reservio encryption key

不可直接替換 `LINE_CREDENTIAL_ENCRYPTION_KEY`，否則既有密文無法解密。需要輪替時：

1. 先備份資料庫。
2. 使用舊 key 解密每家商家的憑證。
3. 使用新 key 重新加密並更新。
4. 部署新 key。
5. 對每家商家執行測試連線。

## 8. 停用串接

1. 在 Reservio 點擊「停用串接」。
2. 確認該商家的 webhook URL 回傳 404。
3. 在 LINE Developers Console 關閉 `Use webhook` 或改回人工客服流程。
4. 若為安全事件，立即撤銷 Access Token 並輪替 Channel Secret。

停用不會刪除既有預約。

## 9. 故障排查

### Token validation 失敗

- 401/403：確認 token 屬於同一個 Messaging API channel，重新發行 token。
- 429：等待 rate-limit window 後再試，不要連續點擊。
- Timeout：確認 production 可連線到 `api.line.me` 與 `api-data.line.me`。

### Webhook 驗證失敗

- 確認 URL 完全一致且為 HTTPS。
- 確認 `Use webhook` 已啟用。
- 確認 Reservio 串接狀態已啟用。
- 若更新過 Webhook URL，重新複製 Reservio 顯示的新網址。
- `INVALID_SIGNATURE` 通常代表 Channel Secret 不一致。

### Rich Menu 建立失敗

- 先確認 Token validation 成功。
- 檢查 LINE API 401、403、429 或 timeout。
- 更新操作會先建立並切換新 Rich Menu，再以 best-effort 刪除舊選單；舊選單清理失敗不影響新選單。

### 訊息沒有回覆

- 以 event ID 搜尋 ingestion、processing 與 processed/failed 紀錄。
- 若停在 PENDING，檢查 worker 與資料庫。
- 若為 FAILED，依 `error_type` 排查，不要將完整 payload 貼入工單。
- 確認 reply token 未因長時間延遲而失效。

### 重複預約

- 確認相同 webhook event ID 只有一筆資料。
- 檢查是否有多個不同 LINE event 對同一時段送出確認。
- 保留 event ID、business ID 與 reservation ID 供調查，不要保存聊天內容。
## 10. Reservio 帳號綁定測試

LINE 預約完成後，尚未綁定的客戶會收到「綁定 Reservio 帳號」按鈕。此功能使用 LINE Messaging API Account Link，不需要新增環境變數，但必須符合以下條件：

- `LINE_WEBHOOK_BASE_URL` 必須是客戶可公開存取的 HTTPS 網址。
- Cloudflare 規則必須允許 LINE Platform 對既有 webhook path 發送 `accountLink` event。
- `/line/account-link` 必須由 frontend SPA 正常接管。
- `/api/line/account-links/{requestToken}` 的 GET request 必須可在未登入狀態存取。
- 確認、列表及解除綁定 API 必須保持 session 與 CSRF 保護。

手動測試：

1. 使用尚未綁定的 LINE 帳號，在商家聊天頁完成一筆預約。
2. 確認商家預約列表顯示客戶在聊天流程輸入的姓名，而不是系統產生的 `line_customer_*` 名稱。
3. 點擊「綁定 Reservio 帳號」。
4. 使用既有 Reservio 客戶帳號登入；登入後應返回原本的綁定確認頁。
5. 點擊「確認綁定」，並在 LINE 頁面允許帳號綁定。
6. LINE 聊天室應收到「Reservio 帳號綁定成功，既有 LINE 預約已同步」。
7. 登入 Reservio 客戶帳號，確認綁定前建立的 LINE 預約已出現在「我的預約」。
8. 再建立一筆 LINE 預約，確認不再顯示綁定按鈕，且新預約直接出現在同一 Reservio 帳號。
9. 至「LINE 帳號綁定」頁解除該商家，確認歷史預約仍保留。

故障排查可使用：

```powershell
docker compose logs --since 15m backend |
  Select-String "line_account_link|line_event_failed"
```

系統不會在 log 中輸出 link token、nonce、完整 LINE user ID 或電話。
