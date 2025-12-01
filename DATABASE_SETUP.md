# 數據庫設置指南 - DATABASE_URL 建立教學

本指南詳細說明如何建立和獲取 `DATABASE_URL` 環境變數。

## 方法一：使用 Railway 提供的 MySQL（推薦）

### 步驟 1：在 Railway 創建 MySQL 服務

1. 登入 [Railway](https://railway.app)
2. 進入您的專案
3. 點擊「**+ New**」按鈕
4. 選擇「**Database**」
5. 選擇「**Add MySQL**」
6. Railway 會自動創建一個 MySQL 數據庫服務

### 步驟 2：獲取 DATABASE_URL

Railway 會自動生成 `DATABASE_URL` 環境變數：

1. 在 Railway 專案中，點擊您創建的 **MySQL 服務**（不是您的應用服務）
2. 點擊「**Variables**」標籤頁
3. 您會看到一個名為 `DATABASE_URL` 的環境變數
4. 格式類似：
   ```
   mysql://root:password@containers-us-west-xxx.railway.app:1234/railway
   ```

### 步驟 3：將 DATABASE_URL 添加到應用服務

有兩種方式：

#### 方式 A：自動共享（推薦）

1. 在 MySQL 服務的「Variables」頁面
2. 找到 `DATABASE_URL` 變數
3. 點擊右側的「**⋯**」選單
4. 選擇「**Reference Variable**」
5. 選擇您的應用服務
6. Railway 會自動將變數共享給應用服務

#### 方式 B：手動複製

1. 複製 MySQL 服務中的 `DATABASE_URL` 值
2. 點擊您的**應用服務**（不是 MySQL 服務）
3. 點擊「**Variables**」標籤頁
4. 點擊「**+ New Variable**」
5. 輸入：
   - **Name**: `DATABASE_URL`
   - **Value**: 貼上剛才複製的 URL
6. 點擊「**Add**」

---

## 方法二：使用外部 MySQL 服務

如果您想使用外部 MySQL 服務（如 PlanetScale、AWS RDS、DigitalOcean 等），需要手動構建 `DATABASE_URL`。

### DATABASE_URL 格式

```
mysql://[用戶名]:[密碼]@[主機地址]:[端口]/[數據庫名稱]?[參數]
```

### 詳細說明

- **用戶名**：數據庫用戶名（例如：`root`、`admin`）
- **密碼**：數據庫密碼（如果包含特殊字符，需要 URL 編碼）
- **主機地址**：數據庫服務器地址（IP 或域名）
- **端口**：MySQL 端口（通常是 `3306`）
- **數據庫名稱**：要連接的數據庫名稱
- **參數**：可選的連接參數（例如：`?ssl=true`）

### 範例

#### 範例 1：基本連接
```
mysql://root:mypassword@localhost:3306/my_database
```

#### 範例 2：帶 SSL 的連接
```
mysql://user:pass@db.example.com:3306/mydb?ssl=true
```

#### 範例 3：PlanetScale
```
mysql://username:password@aws.connect.psdb.cloud/database_name?sslaccept=strict
```

#### 範例 4：包含特殊字符的密碼
如果密碼包含特殊字符（如 `@`、`#`、`%`），需要 URL 編碼：
- `@` → `%40`
- `#` → `%23`
- `%` → `%25`
- `&` → `%26`

例如，密碼是 `p@ss#word`：
```
mysql://root:p%40ss%23word@localhost:3306/mydb
```

---

## 方法三：使用 PlanetScale（免費 MySQL）

### 步驟 1：創建 PlanetScale 帳號

1. 前往 [PlanetScale](https://planetscale.com/)
2. 註冊帳號（免費計劃提供 5GB 存儲）

### 步驟 2：創建數據庫

1. 登入 PlanetScale Dashboard
2. 點擊「**Create database**」
3. 輸入數據庫名稱
4. 選擇區域（建議選擇離您最近的）
5. 點擊「**Create database**」

### 步驟 3：獲取連接字符串

1. 在數據庫頁面，點擊「**Connect**」按鈕
2. 選擇「**General**」標籤
3. 複製「**Connection string**」
4. 格式類似：
   ```
   mysql://username:password@aws.connect.psdb.cloud/database_name?sslaccept=strict
   ```

### 步驟 4：添加到 Railway

1. 在 Railway 專案的應用服務中
2. 點擊「**Variables**」標籤頁
3. 添加新變數：
   - **Name**: `DATABASE_URL`
   - **Value**: 貼上 PlanetScale 的連接字符串

---

## 方法四：使用本地 MySQL（開發環境）

### 步驟 1：安裝 MySQL

**macOS**:
```bash
brew install mysql
brew services start mysql
```

**Windows**:
下載並安裝 [MySQL Installer](https://dev.mysql.com/downloads/installer/)

**Linux (Ubuntu/Debian)**:
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
```

### 步驟 2：創建數據庫和用戶

```bash
# 登入 MySQL
mysql -u root -p

# 創建數據庫
CREATE DATABASE ad_image_generator;

# 創建用戶（可選，或使用 root）
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'your_password';

# 授予權限
GRANT ALL PRIVILEGES ON ad_image_generator.* TO 'app_user'@'localhost';
FLUSH PRIVILEGES;

# 退出
EXIT;
```

### 步驟 3：構建 DATABASE_URL

```
mysql://app_user:your_password@localhost:3306/ad_image_generator
```

### 步驟 4：設置環境變數

創建 `.env` 文件（在專案根目錄）：
```bash
DATABASE_URL=mysql://app_user:your_password@localhost:3306/ad_image_generator
```

---

## 驗證 DATABASE_URL 是否正確

### 方法 1：使用 Railway CLI 測試

```bash
# 安裝 Railway CLI
npm i -g @railway/cli

# 登入
railway login

# 連接到專案
railway link

# 測試數據庫連接
railway run node -e "const mysql = require('mysql2'); const url = process.env.DATABASE_URL; const conn = mysql.createConnection(url); conn.connect((err) => { if (err) { console.error('連接失敗:', err); process.exit(1); } else { console.log('連接成功！'); conn.end(); } });"
```

### 方法 2：使用 MySQL 客戶端測試

```bash
# 從 DATABASE_URL 提取信息
# 例如：mysql://user:pass@host:port/db
# 然後使用 mysql 命令連接

mysql -h host -P port -u user -p database_name
```

---

## 常見問題

### Q1: Railway 自動生成的 DATABASE_URL 在哪裡？

**A**: 在 MySQL 服務的「Variables」標籤頁中，不是在應用服務中。

### Q2: 如何將 MySQL 的 DATABASE_URL 共享給應用服務？

**A**: 在 MySQL 服務的 Variables 頁面，點擊 `DATABASE_URL` 右側的「⋯」→「Reference Variable」→ 選擇應用服務。

### Q3: DATABASE_URL 中的密碼包含特殊字符怎麼辦？

**A**: 需要進行 URL 編碼：
- `@` → `%40`
- `#` → `%23`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `=` → `%3D`

### Q4: 如何確認數據庫連接是否成功？

**A**: 運行數據庫遷移命令：
```bash
railway run pnpm db:migrate
```
如果成功，表示連接正常。

### Q5: Railway 的 MySQL 是免費的嗎？

**A**: Railway 提供免費額度，但超出後會收費。建議查看 Railway 的定價頁面。

### Q6: 可以使用 PostgreSQL 嗎？

**A**: 目前代碼使用 MySQL（透過 Drizzle ORM）。如果要改用 PostgreSQL，需要：
1. 修改 `drizzle.config.ts` 中的 `dialect`
2. 安裝 PostgreSQL 驅動
3. 修改數據庫連接字符串格式

---

## 快速檢查清單

設置 DATABASE_URL 後，確認：

- [ ] DATABASE_URL 格式正確（以 `mysql://` 開頭）
- [ ] 用戶名和密碼正確
- [ ] 主機地址和端口正確
- [ ] 數據庫名稱存在
- [ ] 網絡連接正常（如果是遠程數據庫）
- [ ] 用戶有足夠的權限（CREATE、ALTER、INSERT、SELECT 等）

---

## 下一步

設置好 `DATABASE_URL` 後：

1. **運行數據庫遷移**：
   ```bash
   railway run pnpm db:migrate
   ```

2. **驗證連接**：
   - 檢查應用日誌是否有數據庫連接錯誤
   - 嘗試登入應用，確認可以正常使用

3. **備份數據庫**：
   - 定期備份數據庫（Railway 提供自動備份功能）
   - 或使用 `mysqldump` 手動備份

---

**提示**：如果遇到問題，請檢查 Railway 的「Logs」標籤頁，查看詳細的錯誤信息。

