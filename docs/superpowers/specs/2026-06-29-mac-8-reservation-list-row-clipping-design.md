# MAC-8 預約列表最後一列裁切修正設計

## 目標

修正「我的預約」桌面版查詢結果中最後一筆資料列遭列表容器或分頁區裁切的問題，確保文字、狀態 Badge 與操作按鈕完整顯示。同時檢查並統一修正使用相同預約列表版面的頁面，保留固定表頭、固定分頁與資料列區域獨立捲動的既有互動。

## 範圍

此次調整共用的 `.reservation-card` 桌面版高度與 overflow 配置，涵蓋：

- 我的預約。
- 全部預約管理。
- 待處理預約管理。
- 今日預約管理。

手機版維持卡片列表與整頁捲動，不新增內部捲動區。不修改查詢條件、分頁資料、排序、預約狀態或操作行為，也不調整與預約列表無關的表格。

## 根因

現行 `.reservation-card` 與其 `.table-responsive` 分別使用 `calc(100vh - 220px)` 與 `calc(100vh - 360px)` 估算高度，兩者沒有根據實際 card header、篩選列與分頁 footer 的高度協同分配空間。篩選欄位換行、資料列內容增高或 viewport 高度改變時，table 的估算高度可能超出 card body 的實際可用高度。

同時，`.reservation-card .card-body` 設為 `overflow: hidden`，因此超出的最後一列會被直接裁切，而不是在 table 的捲動區內完整呈現。

## 版面設計

`.reservation-card` 繼續使用垂直 Flexbox 與既有 viewport 高度上限。card header 與分頁 footer 維持自然高度，不參與資料區捲動。

`.reservation-card .card-body` 改為可縮小的垂直 flex 容器：

- 使用 `display: flex` 與 `flex-direction: column`。
- 使用 `flex: 1 1 auto` 接收 header 與 footer 之外的空間。
- 使用 `min-height: 0`，允許 body 在父層高度受限時縮小。
- 保留 `overflow: hidden`，讓捲動責任只落在資料區。

篩選區維持自然高度。`.reservation-card .table-responsive` 改為剩餘空間的唯一捲動區：

- 使用 `flex: 1 1 auto` 與 `min-height: 0`。
- 移除獨立的 viewport 高度估算。
- 保留 `overflow-y: auto`，並維持 sticky table header。

這讓表格高度由 card 的實際剩餘空間決定；無論篩選列高度、每頁筆數或資料列內容如何變化，最後一列都會存在於可捲動範圍內。

## 響應式行為

`768px` 以下沿用現有 mobile breakpoint：取消 reservation card 與 table 的高度上限、將 card body overflow 還原為 visible、隱藏 desktop table 並顯示 mobile card list。Mobile override 也會取消桌面版的 flex 高度限制，避免手機列表形成巢狀捲動。

## 測試與驗證

先以可重複的靜態樣式測試鎖定共用 layout contract，驗證：

- card body 是可縮小的垂直 flex 容器。
- table responsive 是填滿剩餘空間的唯一垂直捲動區。
- table 不再使用第二組 `100vh` 高度估算。
- mobile breakpoint 會解除桌面版的高度與 overflow 限制。

接著執行 frontend TypeScript typecheck 與 production build。最後在桌面 viewport 檢查「我的預約、全部預約、待處理、今日預約」：

- 空資料、少量資料與超出可視高度的資料皆正常。
- 不同每頁筆數與會換行的篩選列不會裁切最後一列。
- 捲動至底部後，最後一列的文字、Status Badge 與操作按鈕完整位於 table scrollport 內。
- 表頭與分頁 footer 保持固定，只有資料列區域捲動。

手機 viewport 則確認不出現巢狀捲動，最後一張預約卡與頁面 footer 均可透過整頁捲動完整顯示。
