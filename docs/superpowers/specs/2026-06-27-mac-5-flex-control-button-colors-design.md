# MAC-5 LINE Flex 流程控制按鈕配色設計

## 目標

讓 LINE 預約流程中的控制按鈕具備明確的語意配色，降低使用者將控制操作誤認為一般選項的機率，同時保持現有文案、排列、尺寸、postback 資料與流程邏輯不變。

## 範圍

套用語意配色的按鈕如下：

- 「確認」使用柔和綠色。
- 「重新開始」使用柔和灰藍色。
- 預約流程中的「取消」與既有預約卡片中的「取消預約」使用柔和紅色。

服務、日期與時段等一般選項按鈕維持現有樣式。不修改按鈕文案、排列、尺寸、動作或任何預約後端邏輯。

## 配色與可讀性

| 操作 | 背景色 | 文字色 | 白字對比度 |
| --- | --- | --- | --- |
| 確認 | `#557A5C` | LINE `primary` 樣式白字 | 4.86:1 |
| 重新開始 | `#5F7185` | LINE `primary` 樣式白字 | 5.02:1 |
| 取消／取消預約 | `#9A5F5F` | LINE `primary` 樣式白字 | 5.03:1 |

三色維持低彩度，且白字對比度皆高於 WCAG AA 一般文字的 4.5:1 基準。

## 實作設計

在 `LineReservationConversation` 中保留現有一般選項 `button(label, data)` helper，另外提供明確接收背景色的控制按鈕 helper。控制按鈕輸出 LINE Flex button JSON 時使用 `primary` style、既有 `sm` height、指定的 `color`，並完整保留原 postback action。

各 Flex Message 建構點明確指定其操作語意與顏色，不依按鈕文案推斷樣式，避免樣式邏輯和中文文案耦合。這也確保日後文案調整不會意外失去配色。

## 資料流與錯誤處理

此次變更只影響送至 LINE Messaging API 的 Flex JSON 呈現屬性。使用者點擊後仍送出原本的 postback data，因此 conversation state、reservation command 與錯誤處理路徑均維持不變。沒有新增執行期錯誤分支或外部依賴。

## 測試策略

以 `LineReservationConversationTest` 驗證實際產生的 Flex JSON：

- 一般服務選項仍使用既有 `secondary` 樣式，且沒有語意色彩。
- 「確認」為 `primary` 且 color 為 `#557A5C`。
- 「重新開始」為 `primary` 且 color 為 `#5F7185`。
- 「取消」與「取消預約」為 `primary` 且 color 為 `#9A5F5F`。
- 各控制按鈕的 label 與 postback data 保持不變。

完成後執行 `LineReservationConversationTest`，再執行完整 Maven test suite，確認預約流程沒有回歸。
