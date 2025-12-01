# Railway 數據庫連接問題解決方案

## 問題：找不到 DATABASE_URL

在 Railway 的 MySQL 服務 Variables 頁面中，您可能看到的是 `MYSQL_URL` 而不是 `DATABASE_URL`。

## 解決方案

### 方法一：使用 MYSQL_URL（已自動支持）

我已經更新了代碼，現在會自動使用 `MYSQL_URL` 如果 `DATABASE_URL` 不存在。

**您不需要做任何操作**，代碼會自動使用 `MYSQL_URL`。

### 方法二：手動創建 DATABASE_URL（可選）

如果您想統一使用 `DATABASE_URL`，可以手動創建：

1. 在 MySQL 服務的「Variables」頁面
2. 找到 `MYSQL_URL` 變數
3. 點擊右側的「⋯」選單
4. 選擇「Copy Value」（複製值）
5. 點擊「+ New Variable」
6. 輸入：
   - **Name**: `DATABASE_URL`
   - **Value**: 貼上剛才複製的 `MYSQL_URL` 值
7. 點擊「Add」

### 方法三：在應用服務中使用 Shared Variable（推薦）

1. 切換到您的**應用服務**（不是 MySQL 服務）
2. 點擊「Variables」標籤頁
3. 點擊「**Shared Variable**」按鈕（右上角）
4. 選擇 MySQL 服務
5. 選擇 `MYSQL_URL` 或 `DATABASE_URL`（如果存在）
6. 這樣應用服務就可以使用數據庫連接了

## 驗證連接

設置完成後，運行數據庫遷移來測試：

```bash
railway run pnpm db:migrate
```

如果成功，表示數據庫連接正常。

## 注意事項

- Railway 的 MySQL 服務通常提供 `MYSQL_URL` 而不是 `DATABASE_URL`
- 代碼現在會自動檢查兩個變數名稱
- 如果兩個都不存在，會顯示錯誤信息

