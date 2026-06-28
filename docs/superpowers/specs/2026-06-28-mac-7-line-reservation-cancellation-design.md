# MAC-7 LINE 我的預約與取消流程設計

## 目標

改善 LINE「我的預約」Flex Message 的資訊層級，讓使用者在多筆預約的 carousel 中可直接辨識服務、日期、時間與狀態。同時讓 LINE 取消預約與 Web 客戶端共用相同狀態轉換：待確認預約直接取消，已確認預約必須先提供原因並送出取消申請，待商家確認後才正式取消。

## 範圍

此次修改涵蓋：

- LINE「我的預約」預約卡片的標題、日期、時間與狀態顯示。
- LINE 待確認與已確認預約的分流取消流程。
- 已確認預約取消原因的 Quick Reply 與自由文字輸入。
- LINE 對話中待處理取消預約的狀態保存與清除。
- Web 與 LINE 共用的客戶取消狀態轉換、時間戳與商家通知。
- 對應的單元測試與整合驗證。

不修改商家後台既有的取消申請確認／駁回流程，不新增「其他原因」Quick Reply，不新增服務人員欄位，也不擴充已取消或取消申請中的預約卡片查詢範圍。

## 架構

`ReservationService` 保留客戶取消規則的唯一實作。既有 Web API 仍以登入使用者與預約 ID 驗證所有權，再呼叫共用狀態轉換；LINE 對話先依商家、LINE 綁定客戶及預約 ID 驗證所有權，再把已驗證的預約、取消原因與 `LINE` 操作者交給同一套轉換。共用邏輯負責狀態、取消原因、時間戳、更新者、儲存與商家通知，避免 LINE 再次複製 Web 規則。

`LineReservationConversation` 負責互動編排。`LineConversation` 新增待取消預約 ID，`LineConversationState` 新增 `ENTERING_CANCEL_REASON`，讓使用者點擊已確認預約的取消按鈕後，可以在下一則文字訊息中安全地延續同一筆預約。開始新預約、手動取消流程、完成取消申請、發生錯誤或對話逾時時，都會清除待取消預約 ID。

此功能沿用目前 JPA `ddl-auto: update` 建立新增欄位，不新增手寫資料庫 migration。

## 我的預約 Flex Message

每張 bubble 以預約 `title` 作為主標題；若標題缺失，使用「預約」作為安全替代文字。主標題下方依序顯示格式化日期、時間與中文狀態：

- `PENDING` 顯示「待確認」。
- `CONFIRMED` 顯示「已確認」。

日期與時間維持各自可辨識的欄位，時間固定以 `HH:mm` 顯示，避免 `LocalTime.toString()` 因秒數而產生不一致格式。Carousel 的 alt text 仍為「我的預約」，既有柔和紅色「取消預約」按鈕與 postback 格式保持不變。

此次不顯示商家名稱，因同一個 LINE 官方帳號的查詢已受限於目前商家；也不顯示服務人員，因現有 `Reservation` 沒有可用的服務人員關聯。

## 取消資料流

### 待確認預約

1. 使用者點擊「取消預約」。
2. LINE 端重新查詢預約，驗證商家、客戶所有權及 `PENDING` 狀態。
3. 共用取消邏輯將狀態改為 `CANCELLED`，`cancelReason` 設為 `null`，寫入 `cancelledAt`、`updatedAt` 與 `updatedBy=LINE`。
4. 系統通知商家預約狀態已更新。
5. LINE 回覆：`您已取消「{服務名稱}」的預約。`

### 已確認預約

1. 使用者點擊「取消預約」。
2. LINE 端重新查詢預約，驗證商家、客戶所有權及 `CONFIRMED` 狀態。
3. 對話保存該預約 ID，狀態改為 `ENTERING_CANCEL_REASON`。
4. LINE 詢問：`請問您取消「{服務名稱}」預約的原因？`，並提供四個 Quick Reply：
   - 時間無法配合
   - 臨時有事
   - 已不需要服務
   - 想改約其他時間
5. 使用者可點選 Quick Reply，或直接輸入任何其他非空白文字。系統不提供「其他原因」選項，也不增加第二層輸入步驟。
6. 送出前再次查詢並驗證同一筆預約仍屬於該客戶且狀態仍為 `CONFIRMED`。
7. 共用取消邏輯將狀態改為 `CANCEL_REQUESTED`，保存修剪空白後的原因，寫入 `updatedAt` 與 `updatedBy=LINE`，但不寫入 `cancelledAt`。
8. 系統通知商家有客戶狀態更新，並清除對話中的待取消預約資料。
9. LINE 回覆：`已收到您取消「{服務名稱}」的申請。\n\n商家確認後，將完成取消並另行通知您。`

商家後續仍使用既有 `handleCancelRequestForBusiness` 決定同意或駁回；只有同意時才轉為 `CANCELLED` 並寫入 `cancelledAt`。

## 共用取消規則

共用狀態轉換只接受 `PENDING` 或 `CONFIRMED`：

- `PENDING` 不需要原因，直接轉為 `CANCELLED`。
- `CONFIRMED` 必須提供修剪後非空白的原因，轉為 `CANCEL_REQUESTED`。
- `COMPLETED`、`CANCEL_REQUESTED`、`CANCELLED` 或已結束的預約均拒絕操作。

Web 原有入口維持相同授權查詢，並改由同一共用方法完成更新。這會讓後端落實原有方法註解所載的「CONFIRMED 時原因必填」，而非把空字串存入資料庫。

## 錯誤處理

- 無效或缺少預約 ID：回覆取消資料不正確，要求重新查詢。
- LINE 尚未對應客戶：回覆找不到 LINE 預約紀錄。
- 預約不屬於目前商家／客戶，或狀態已不可取消：不洩漏預約資訊，回覆找不到可取消的預約。
- 等待原因期間收到空白輸入：維持 `ENTERING_CANCEL_REASON` 並再次要求輸入，不送出申請。
- 等待原因期間預約狀態被其他操作改變：清除待取消狀態，回覆預約狀態已變更並要求重新查詢。
- 對話逾時或使用者開始其他預約流程：清除待取消預約 ID，避免後續文字誤套用到舊預約。

所有預約查詢都同時檢查商家及已解析的客戶 ID，防止竄改 postback 預約 ID 操作其他使用者的預約。

## 測試與驗證

`LineReservationConversationTest` 驗證：

- 預約卡主標題為服務名稱，並顯示固定格式日期、時間與中文狀態。
- 多筆預約 carousel 的每張卡片各自呈現正確服務與時間。
- `PENDING` 取消不詢問原因，呼叫共用取消邏輯並回覆服務名稱。
- `CONFIRMED` 取消保存預約 ID、進入原因狀態，且 Quick Reply 精確包含四個常用原因。
- Quick Reply 文字與自訂非空白原因都能送出取消申請並回覆服務名稱。
- 無效 ID、所有權不符、狀態變更、空白原因、重設與逾時不會誤取消預約。

`ReservationServiceTest` 驗證 Web 與 LINE 共用的狀態轉換：

- `PENDING` 轉為 `CANCELLED`、原因清空並寫入取消時間。
- `CONFIRMED` 有原因時轉為 `CANCEL_REQUESTED`，不寫入取消時間。
- `CONFIRMED` 空白原因被拒絕。
- 不可取消或已結束狀態被拒絕。
- 成功更新後只儲存一次並通知商家。

先執行聚焦的 LINE 對話與 ReservationService 測試，再執行完整 Maven test suite。Flex Message 另輸出 JSON 到 `target/`，確認 carousel 結構與 LINE Flex 限制相容；若無 LINE Simulator 權限，保留 JSON 供實機驗收。
