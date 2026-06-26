# LINE 已綁定客戶資料預填設計

## 目標

當客戶已將商家的 LINE 帳號綁定至 Reservio 帳號，後續透過 LINE 預約時，不重複要求輸入已知的姓名與電話。

## 行為

客戶選定可預約時段後，系統查詢 `(business_id, line_user_id)` 對應的 `LineCustomer`：

- 未找到或尚未綁定：維持目前流程，依序詢問姓名與電話。
- 已綁定，姓名與電話都有：預填至 conversation，直接進入 `CONFIRMING` 並顯示完整確認訊息。
- 已綁定，只有姓名：預填姓名，進入 `ENTERING_PHONE`。
- 已綁定，只有電話：預填電話，進入 `ENTERING_NAME`；客戶輸入姓名後直接進入 `CONFIRMING`。
- 已綁定，兩者都缺：維持目前流程。

空白字串視為缺失。

## 資料來源

使用 `LineCustomer.displayName` 與 `LineCustomer.phone`。這兩個欄位保存客戶上一次透過該商家 LINE 預約時提供的聯絡資料，因此綁定狀態仍以 `LineCustomer.linkedUser != null` 判斷。

本次不新增 `UserData` 個人資料欄位，也不使用 username 取代真實姓名。

## 更新規則

客戶若因缺少欄位而重新輸入姓名或電話，完成預約時既有 `LineCustomerService.resolveCustomer()` 會更新 `LineCustomer`，供下次預約使用。

本次不提供在 LINE 對話中主動修改已存在姓名或電話的入口；需要修改時可解除綁定，或後續另行設計聯絡資料管理功能。

## 實作

- `LineCustomerService` 新增唯讀查詢方法，回傳已綁定客戶的預填資料。
- `LineReservationConversation.selectTime()` 在有效時段選定後套用預填資料。
- 共用確認摘要產生方法，避免 `enterPhone()` 與直接確認路徑重複。
- `enterName()` 若電話已預填，輸入姓名後直接進入確認。

## 測試

- 未綁定客戶仍先詢問姓名。
- 已綁定且資料完整時直接顯示確認摘要。
- 已綁定只缺電話時只詢問電話。
- 已綁定只缺姓名時只詢問姓名，輸入後直接確認。
- 已綁定但兩者皆缺時維持原流程。
