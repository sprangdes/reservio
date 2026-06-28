# MAC-6 LINE 預約月曆排版與可讀性設計

## 目標

修正 LINE 預約日期月曆的星期與日期欄位偏移，讓不同月份都維持穩定的七欄版面，並放大日期文字與整個日期 cell 的可點擊範圍，以改善高齡使用者的辨識與操作體驗。既有可預約日期判斷、對話狀態與 postback 行為維持不變。

## 範圍

此次只調整 `LineReservationConversation` 產生的日期月曆 Flex JSON：

- 月份 bubble、body 留白、星期列、日期列、日期 cell 與文字樣式。
- 每月固定輸出六個日期列，每列固定七個 cell。
- 可選日期 cell 的點擊區與文字縮放設定。
- 針對月曆結構、大小與既有 postback 的自動化測試。

不修改可預約日期的業務規則、可預約時段查詢、日期選取後的流程、其他 Flex Message 或 LINE webhook 處理。

## 根因

現行星期列直接將文字元件作為水平 row 的 child，日期列則將包含文字的 box 作為 child。兩者雖然都設定 `flex: 1`，但元件類型、padding 與內容結構不同，因此 LINE Flex renderer 會以不同條件計算欄寬與內容位置。空白日期 cell 也缺少與一般日期一致的 padding，進一步造成星期、空白格與日期的視覺基準不一致。

月份目前只輸出實際需要的週數，因此四、五、六週月份的 bubble 高度也不同。現有 `sm` 日期字級與 `4px` padding 則限制了文字和點擊範圍。

## 版面設計

每個月份 bubble 使用 `giga` size，carousel 中所有 bubble 保持相同 size。body 使用明確且較精簡的 padding，提高可用寬度，同時保留足夠邊界。

月曆使用固定六列乘七欄的 grid。每個水平 row 的七個 child 都是相同結構的垂直 box，並設定 `flex: 1`。星期 cell、日期 cell 與空白 cell 共用相同的容器屬性、水平置中方式與垂直 padding；差異只存在於文字內容、顏色及可選日期的 action。row 使用小幅且一致的間距，避免不必要留白。

月份需要少於六週時，在尾端補齊完整空白列。月份開頭與結尾的空白格也使用相同容器結構，避免單位數、雙位數或空內容改變欄位配置。

## 可讀性與操作

日期基準字級由 `sm` 放大為 `md`，星期基準字級使用 `sm`。日期與星期文字設定 `scaling: true`，配合 LINE App 的使用者字體大小設定；同時設定 `adjustMode: shrink-to-fit`，避免放大後的雙位數日期超出 cell。

cell 增加垂直 padding，讓整列高度與可點擊範圍同步增加。可選日期的 action 仍掛在外層 cell，因此 cell 內的留白也屬於點擊區。不可選日期與空白 cell 不增加 action。

LINE 13.6.0 以前的行動版不支援 `scaling`，但仍會顯示放大後的基準字級。Bubble size `giga` 是 LINE Flex 支援的標準 size。實作避免固定欄寬，依官方建議使用相同 `flex` 比例，以降低裝置螢幕尺寸差異造成的排版偏移。

參考：

- [LINE Flex Message layout](https://developers.line.biz/en/docs/messaging-api/flex-message-layout/)
- [LINE Messaging API reference](https://developers.line.biz/en/reference/messaging-api/nojs/)

## 資料流與錯誤處理

月曆仍由目前日期起算至三個月後，依月份建立 carousel。每個真實日期仍經過既有營業日與可用時段判斷；只有可選日期取得 postback action。

action 的 `type`、`label`、`data` 與 `displayText` 完整保留，選取後仍由 `handlePostback` 解析 `reservio.action=select_date&date=...`。此次沒有新增執行期錯誤分支或外部依賴。

LINE 規定 carousel JSON 最大為 50 KB。測試會序列化實際月曆內容並驗證大小未超限，避免固定六列與新增可讀性屬性讓訊息失效。

## 測試與驗證

以 `LineReservationConversationTest` 驗證實際產生的 Flex JSON：

- 每個月份 bubble 都使用 `giga`，且 body padding 與 row spacing 一致。
- 星期列與六個日期列都包含七個相同結構、`flex: 1` 的 cell。
- 四、五、六週月份都固定輸出 42 個日期位置，前後空白格正確。
- 單位數與雙位數日期使用相同字級、padding、縮放與縮排保護設定。
- 可選日期 action 的 `data`、`label` 與 `displayText` 維持原值；不可選日期沒有 action。
- 序列化後的 carousel JSON 小於 50 KB。

先執行聚焦的 `LineReservationConversationTest`，再執行完整 Maven test suite。最後輸出實際 Flex JSON，貼入 LINE Flex Message Simulator 檢查星期與日期對齊、六列高度、字體與可點擊區域；若環境缺少 LINE Simulator 權限，保留 JSON 檔供有權限的帳號完成實機或模擬驗收。
