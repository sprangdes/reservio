# LINE Messaging Reservations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓每個 Reservio 商家綁定自己的 LINE 官方帳號，客戶不需登入 Reservio，即可在 LINE 聊天室完成服務、日期、時段與聯絡資料選擇並建立預約。

**Architecture:** 功能先以獨立 `com.reservio.line` 模組放在現有 Spring Boot 應用程式中，與現有預約核心共用資料庫及交易。Webhook 使用商家專屬隨機 key 識別 channel、驗證 LINE signature、保存事件後交由 worker 處理；對話流程使用持久化狀態機，避免部署或重啟造成預約流程遺失。

**Tech Stack:** Java 17、Spring Boot 3.2、Spring MVC、Spring Data JPA、PostgreSQL、React/Vite、LINE Messaging API

---

## Scope boundaries

第一版包含：

- 每個商家自行設定 Channel ID、Channel Secret、Channel Access Token。
- 系統產生該商家的 webhook URL。
- 驗證 LINE webhook signature 並防止事件重複處理。
- Rich Menu／文字指令啟動「立即預約」。
- 聊天室內完成服務、日期、時段、姓名、電話與最後確認。
- 客戶免登入，以 `business + LINE user ID` 建立獨立身分。
- 預約建立前再次檢查時段，避免聊天期間時段被占用。

第一版不包含：

- Reservio 帳號與 LINE 客戶身分綁定。
- AI／自然語言理解；僅支援明確指令、日期格式和 Quick Reply 選項。
- 「我的預約」、取消預約與改期。
- 自動替商家建立 LINE 官方帳號或 Messaging API channel。
- 將 LINE 模組拆成獨立微服務。

## Phase 1：資料模型與預約核心解耦

目的：先讓 LINE 預約可以安全地使用既有預約規則，不模擬網站登入 session。

主要檔案：

- Create: `src/main/java/com/reservio/line/entity/BusinessLineChannel.java`
- Create: `src/main/java/com/reservio/line/entity/LineCustomer.java`
- Create: `src/main/java/com/reservio/line/repo/BusinessLineChannelRepo.java`
- Create: `src/main/java/com/reservio/line/repo/LineCustomerRepo.java`
- Create: `src/main/java/com/reservio/service/ReservationCommandService.java`
- Modify: `src/main/java/com/reservio/service/ReservationService.java`
- Modify: `src/main/java/com/reservio/entity/Reservation.java`
- Test: `src/test/java/com/reservio/service/ReservationCommandServiceTest.java`

工作內容：

- [x] 建立商家 LINE channel 與 LINE 客戶資料模型及唯一索引。
- [x] 在 `Reservation` 記錄預約來源，例如 `WEB`、`LINE`。
- [x] 從現有 `ReservationService.saveReservation()` 抽出不依賴 `getCurrentUser()` 的預約建立 use case。
- [x] 明確傳入 customer、business、service、date、start time 與 source。
- [x] 在同一資料庫交易內重新驗證時段並建立預約。
- [x] 保留網站既有 API 行為，改由網站流程呼叫新的 use case。
- [x] 增加單元測試：成功建立、時段衝突、非該商家服務、停用服務與無效日期。
- [x] 執行 `mvn -Dtest='*Test,!DatabaseConnectionTest' test`，24 項測試通過；`DatabaseConnectionTest` 仍需外部資料庫設定。
- [x] Commit：`refactor: extract reservation creation use case`

完成標準：

- 網站既有預約流程仍可使用。
- 測試可在沒有 Spring Security session 的情況建立 LINE 來源預約。
- 同一商家同一時段的競爭情況不會建立重複預約。

## Phase 2：商家 LINE 設定與憑證保護

目的：讓商家在 Reservio 後台安全地設定自己的 Messaging API channel。

主要檔案：

- Create: `src/main/java/com/reservio/line/config/LineMessagingProperties.java`
- Create: `src/main/java/com/reservio/line/security/LineCredentialCipher.java`
- Create: `src/main/java/com/reservio/line/controller/LineIntegrationController.java`
- Create: `src/main/java/com/reservio/line/controller/request/LineChannelSettingsRequest.java`
- Create: `src/main/java/com/reservio/line/controller/response/LineChannelSettingsResponse.java`
- Create: `src/main/java/com/reservio/line/service/LineChannelSettingsService.java`
- Modify: `src/main/java/com/reservio/config/SecurityConfig.java`
- Modify: `src/main/resources/application.yml`
- Modify: `src/main/resources/application-prod.yml`
- Modify: `docker-compose.yml`
- Modify: `frontend/src/api.ts`
- Create: `frontend/src/pages/LineIntegrationPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Navbar.tsx`
- Test: `src/test/java/com/reservio/line/service/LineChannelSettingsServiceTest.java`
- Test: `src/test/java/com/reservio/line/controller/LineIntegrationControllerTest.java`

工作內容：

- [ ] 增加 `LINE_CREDENTIAL_ENCRYPTION_KEY`，使用 authenticated encryption 保存 secret 與 token。
- [ ] 產生不可猜測、可輪替的商家 webhook key。
- [ ] 建立取得設定、儲存設定、停用串接與輪替 webhook key 的 API。
- [ ] API 回應只顯示遮罩後憑證，禁止回傳密文或明文。
- [ ] 驗證目前登入者只能管理自己的商家 channel。
- [ ] 後台頁面顯示 webhook URL、Channel ID、Secret、Access Token 與啟用狀態。
- [ ] Secret 與 token 欄位留白時表示不修改既有值。
- [ ] 增加 controller、ownership、加解密與遮罩測試。
- [ ] 執行後端測試與 `npm run build`。
- [ ] Commit：`feat: add business LINE channel settings`

完成標準：

- 商家可以自行完成設定並複製 webhook URL。
- 資料庫、API response 與應用 log 均不出現明文 secret/token。
- 商家之間無法讀取或修改彼此設定。

## Phase 3：Webhook 接收、驗證、去重與背景處理

目的：先建立可靠訊息入口，尚不處理完整預約對話。

主要檔案：

- Create: `src/main/java/com/reservio/line/entity/LineWebhookEvent.java`
- Create: `src/main/java/com/reservio/line/enums/LineWebhookEventStatus.java`
- Create: `src/main/java/com/reservio/line/repo/LineWebhookEventRepo.java`
- Create: `src/main/java/com/reservio/line/controller/LineWebhookController.java`
- Create: `src/main/java/com/reservio/line/service/LineSignatureVerifier.java`
- Create: `src/main/java/com/reservio/line/service/LineWebhookIngestionService.java`
- Create: `src/main/java/com/reservio/line/service/LineWebhookWorker.java`
- Create: `src/main/java/com/reservio/line/service/LineMessagingClient.java`
- Modify: `src/main/java/com/reservio/config/SecurityConfig.java`
- Test: `src/test/java/com/reservio/line/controller/LineWebhookControllerTest.java`
- Test: `src/test/java/com/reservio/line/service/LineWebhookWorkerTest.java`

工作內容：

- [ ] 新增公開且略過 CSRF 的 webhook endpoint：`POST /api/integrations/line/webhook/{webhookKey}`。
- [ ] 使用原始 request body 和該商家的 Channel Secret 驗證 `X-Line-Signature`。
- [ ] signature 無效回傳 `401`，不存在或停用的 webhook key 回傳 `404`。
- [ ] 以 LINE webhook event ID 建立唯一索引，重送事件只回傳成功、不重複入列。
- [ ] controller 只負責驗證及保存事件，快速回傳 `200`。
- [ ] worker 使用狀態、attempt count、next attempt time 處理重試。
- [ ] 實作 reply message client，將 token 解密限制在送出請求前。
- [ ] 第一個 vertical slice：收到「立即預約」時回覆固定文字。
- [ ] 測試有效 signature、無效 signature、未知商家、事件重送與 worker retry。
- [ ] Commit：`feat: add reliable LINE webhook ingestion`

完成標準：

- LINE Developers Console 的 webhook verification 可以成功。
- 同一 event 重送多次，只會產生一筆事件和一次業務處理。
- LINE API 暫時失敗時可重試，且不阻塞 webhook HTTP response。

## Phase 4：聊天式預約狀態機

目的：完成第一條端到端預約 happy path。

主要檔案：

- Create: `src/main/java/com/reservio/line/entity/LineConversation.java`
- Create: `src/main/java/com/reservio/line/enums/LineConversationState.java`
- Create: `src/main/java/com/reservio/line/repo/LineConversationRepo.java`
- Create: `src/main/java/com/reservio/line/conversation/LineReservationConversation.java`
- Create: `src/main/java/com/reservio/line/conversation/LineDateParser.java`
- Create: `src/main/java/com/reservio/line/message/LineMessageFactory.java`
- Modify: `src/main/java/com/reservio/line/service/LineWebhookWorker.java`
- Modify: `src/main/java/com/reservio/service/ReservationTimeService.java`
- Test: `src/test/java/com/reservio/line/conversation/LineReservationConversationTest.java`
- Test: `src/test/java/com/reservio/line/conversation/LineDateParserTest.java`

狀態：

```text
IDLE
→ SELECTING_SERVICE
→ ENTERING_DATE
→ SELECTING_TIME
→ ENTERING_NAME
→ ENTERING_PHONE
→ CONFIRMING
→ COMPLETED
```

工作內容：

- [ ] 以 `(business_id, line_user_id)` 保存唯一 active conversation。
- [ ] 「立即預約」建立或重設流程，回覆啟用中的服務 Quick Reply。
- [ ] 服務選擇必須驗證屬於目前商家且仍為 active。
- [ ] 支援 `6/29`、`06/29`、`2026/6/29`，未指定年份時選擇最近且非過去的日期。
- [ ] 日期不營業時維持 `ENTERING_DATE`，回覆「當日不營業」。
- [ ] 無可用時段時維持 `ENTERING_DATE`，提示改選其他日期。
- [ ] 有時段時使用 Quick Reply 顯示可預約時間。
- [ ] 收集姓名與電話，電話採最小格式驗證。
- [ ] 確認訊息列出商家、服務、日期、時間、姓名與電話。
- [ ] 客戶選擇確認後呼叫 `ReservationCommandService` 建立預約。
- [ ] 如果最後確認時時段已被占用，返回日期／時段選擇，不建立預約。
- [ ] 「取消」或「重新開始」可隨時清除目前流程。
- [ ] conversation 超過 30 分鐘視為過期，下一則訊息提示重新開始。
- [ ] 對每個 state 增加成功、錯誤輸入、過期和重複 event 測試。
- [ ] Commit：`feat: add LINE reservation conversation`

完成標準：

- 客戶不登入 Reservio，即可完整建立一筆 LINE 來源預約。
- 非預期文字不會推進錯誤狀態。
- 應用重啟後仍可從原本狀態繼續。

## Phase 5：Rich Menu 與商家啟用流程

目的：降低商家設定成本，讓客戶可直接點擊「立即預約」。

主要檔案：

- Create: `src/main/java/com/reservio/line/service/LineRichMenuService.java`
- Create: `src/main/java/com/reservio/line/controller/response/LineIntegrationStatusResponse.java`
- Modify: `src/main/java/com/reservio/line/controller/LineIntegrationController.java`
- Modify: `frontend/src/pages/LineIntegrationPage.tsx`
- Test: `src/test/java/com/reservio/line/service/LineRichMenuServiceTest.java`

工作內容：

- [ ] 增加「測試連線」動作，呼叫 LINE API 確認 token 可用。
- [ ] 增加「建立／更新 Rich Menu」動作。
- [ ] 第一版 Rich Menu 顯示三個入口，但只有「立即預約」啟用。
- [ ] 「我的預約」與「查詢可預約時段」回覆「功能準備中」，避免使用者無反應。
- [ ] Rich Menu action 使用固定 postback data，而不是依賴顯示文字比對。
- [ ] 後台顯示 webhook、token validation 與 Rich Menu 三項檢查結果。
- [ ] 增加 LINE API 成功、授權失敗、rate limit 與 timeout 測試。
- [ ] Commit：`feat: add LINE rich menu provisioning`

完成標準：

- 商家照後台步驟即可完成 LINE Developers Console 與 Reservio 設定。
- 客戶點擊 Rich Menu 的「立即預約」會啟動 Phase 4 的狀態機。

## Phase 6：營運可靠性、觀測與上線

目的：在兩家試點商家使用前補齊安全、監控及操作手冊。

主要檔案：

- Modify: `src/main/resources/application-prod.yml`
- Modify: `docker-compose.yml`
- Modify: `README.md`
- Create: `docs/line-messaging-setup.md`
- Create: `src/test/java/com/reservio/line/LineReservationIntegrationTest.java`

工作內容：

- [ ] 為 webhook ingestion、處理成功、處理失敗、LINE API latency 與預約完成記錄結構化 log。
- [ ] log 只記錄 business ID、event ID、conversation state 和錯誤類型，不記錄 token、電話與完整訊息。
- [ ] 設定事件與 conversation 保存期限及每日清理工作。
- [ ] 限制單一 LINE user／商家的訊息處理頻率。
- [ ] 建立從 webhook 到 reservation 的整合測試。
- [ ] 使用 LINE 測試帳號執行有效日期、不營業、無時段、時段競爭、重新開始與 webhook 重送測試。
- [ ] 撰寫商家設定步驟、憑證輪替、停用串接與故障排查文件。
- [ ] 先啟用第一家內部試點，觀察後再開第二家。
- [ ] Commit：`docs: add LINE Messaging rollout guide`

完成標準：

- 可從 event ID 追蹤一次對話處理，但 log 不洩漏個資或憑證。
- 商家可以依文件自行完成設定。
- 兩家試點的端到端情境測試全部通過。

## Future phases

第一版穩定後再分開規劃：

1. 「我的預約」查詢。
2. LINE 內取消與改期。
3. LINE 客戶與既有 Reservio 帳號綁定。
4. 預約確認、取消與提醒的主動推播。
5. 商家數量或訊息量增加後，評估把 `com.reservio.line` 抽成獨立 gateway。

## Recommended delivery checkpoints

| Checkpoint | 可展示成果 | 建議是否部署 |
|---|---|---|
| Phase 1 | 無 session 的預約核心 | 僅測試環境 |
| Phase 2 | 商家可設定 LINE channel | 僅測試環境 |
| Phase 3 | LINE webhook 可安全收發固定訊息 | 測試 LINE 帳號 |
| Phase 4 | 聊天室完整建立預約 | 第一家試點 |
| Phase 5 | Rich Menu 與完整啟用流程 | 第二家試點 |
| Phase 6 | 監控、文件、限流與正式驗收 | 正式開放 |
