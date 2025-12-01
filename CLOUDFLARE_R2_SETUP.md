# Cloudflare R2 設置完整指南

本指南詳細說明如何設置 Cloudflare R2 並將環境變數添加到 Railway。

## 第一步：創建 Cloudflare 帳號

1. 前往 [Cloudflare](https://dash.cloudflare.com/sign-up)
2. 註冊新帳號或登入現有帳號
3. 完成帳號驗證

## 第二步：創建 R2 Bucket

### 步驟 1：進入 R2 頁面

1. 登入 Cloudflare Dashboard
2. 在左側選單中，點擊「**R2**」
3. 如果是第一次使用，點擊「**Get started**」或「**Create bucket**」

### 步驟 2：創建 Bucket

1. 點擊「**Create bucket**」按鈕
2. 輸入 Bucket 名稱（例如：`ad-image-storage`）
   - 名稱必須：
     - 全小寫
     - 只能包含字母、數字和連字號
     - 長度 3-63 個字符
3. 選擇位置（建議選擇離您最近的區域）
4. 點擊「**Create bucket**」

### 步驟 3：記錄 Bucket 信息

創建完成後，記下：
- **Bucket 名稱**：例如 `ad-image-storage`
- **Account ID**：在 R2 頁面右上角可以看到（格式類似：`abc123def456...`）

## 第三步：創建 R2 API Token

### 步驟 1：進入 API Tokens 頁面

1. 在 R2 頁面，點擊右上角的「**Manage R2 API Tokens**」
2. 或直接前往：https://dash.cloudflare.com/[您的帳號ID]/r2/api-tokens

### 步驟 2：創建 API Token

1. 點擊「**Create API token**」按鈕
2. 填寫 Token 信息：
   - **Token name**：輸入一個描述性名稱（例如：`ad-image-generator-token`）
   - **Permissions**：選擇「**Object Read & Write**」
   - **TTL**：可以留空（永久有效）或設置過期時間
   - **Buckets**：選擇「**Specific bucket**」→ 選擇您剛創建的 bucket
3. 點擊「**Create API Token**」

### 步驟 3：保存 Token 信息

**重要**：Token 只會顯示一次，請立即保存！

創建後，您會看到：
- **Access Key ID**：例如 `abc123def456...`
- **Secret Access Key**：例如 `xyz789uvw012...`

**請立即複製並保存這兩個值**，關閉頁面後就無法再查看 Secret Access Key 了！

## 第四步：獲取 Account ID

1. 在 Cloudflare Dashboard 右上角，點擊您的帳號名稱
2. 在「**Overview**」頁面，您會看到「**Account ID**」
3. 複製這個 Account ID（格式類似：`abc123def456...`）

或者：

1. 在 R2 頁面，Account ID 通常顯示在頁面右上角
2. 也可以在 API Token 頁面看到

## 第五步：配置 Bucket 公開訪問（可選）

### 選項 A：使用 R2.dev 公共域名（簡單）

1. 在您的 Bucket 頁面，點擊「**Settings**」標籤
2. 找到「**Public access**」部分
3. 點擊「**Allow Access**」
4. 系統會為您生成一個公共 URL，格式類似：
   ```
   https://pub-xxxxx.r2.dev
   ```
5. 記下這個 URL（用於 `CLOUDFLARE_R2_PUBLIC_URL`）

### 選項 B：使用自定義域名（推薦用於生產環境）

1. 確保您的域名已經添加到 Cloudflare（並使用 Cloudflare 的 DNS）
2. 在 Bucket 的「**Settings**」標籤頁
3. 找到「**Custom Domains**」部分
4. 點擊「**Connect Domain**」
5. 輸入您的子域名（例如：`cdn.yourdomain.com`）
6. Cloudflare 會自動配置 DNS 記錄
7. 等待幾分鐘讓 DNS 生效
8. 使用您的自定義域名作為 `CLOUDFLARE_R2_PUBLIC_URL`

## 第六步：在 Railway 中添加環境變數

### 步驟 1：進入 Railway 專案

1. 登入 [Railway](https://railway.app)
2. 進入您的專案
3. 點擊您的**應用服務**（不是 MySQL 服務）

### 步驟 2：添加環境變數

點擊「**Variables**」標籤頁，然後添加以下變數：

#### 1. CLOUDFLARE_ACCOUNT_ID

- 點擊「**+ New Variable**」
- **Name**: `CLOUDFLARE_ACCOUNT_ID`
- **Value**: 貼上您剛才複製的 Account ID
- 點擊「**Add**」

#### 2. CLOUDFLARE_R2_BUCKET

- 點擊「**+ New Variable**」
- **Name**: `CLOUDFLARE_R2_BUCKET`
- **Value**: 您的 Bucket 名稱（例如：`ad-image-storage`）
- 點擊「**Add**」

#### 3. CLOUDFLARE_R2_ACCESS_KEY_ID

- 點擊「**+ New Variable**」
- **Name**: `CLOUDFLARE_R2_ACCESS_KEY_ID`
- **Value**: 貼上您剛才保存的 Access Key ID
- 點擊「**Add**」

#### 4. CLOUDFLARE_R2_SECRET_ACCESS_KEY

- 點擊「**+ New Variable**」
- **Name**: `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- **Value**: 貼上您剛才保存的 Secret Access Key
- **注意**：這個值會被遮蔽顯示，這是正常的
- 點擊「**Add**」

#### 5. CLOUDFLARE_R2_PUBLIC_URL（可選）

如果您配置了公共訪問：

- 點擊「**+ New Variable**」
- **Name**: `CLOUDFLARE_R2_PUBLIC_URL`
- **Value**: 
  - 如果使用 R2.dev：`https://pub-xxxxx.r2.dev`
  - 如果使用自定義域名：`https://cdn.yourdomain.com`
- 點擊「**Add**」

**注意**：如果不設置這個變數，代碼會嘗試使用 `https://[bucket-name].r2.dev` 格式，但這需要您手動配置公共訪問。

## 完整環境變數清單

在 Railway 的應用服務 Variables 頁面，您應該有以下變數：

```bash
# Cloudflare R2 配置
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_R2_BUCKET=your-bucket-name
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key-id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-access-key
CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev  # 可選
```

## 驗證設置

### 方法 1：檢查 Railway 日誌

1. 在 Railway 中，點擊您的應用服務
2. 點擊「**Deployments**」標籤
3. 查看最新的部署日誌
4. 如果看到數據庫連接錯誤，但沒有 R2 相關錯誤，表示 R2 配置正確

### 方法 2：測試上傳功能

1. 部署應用後，訪問您的網站
2. 嘗試上傳一張圖片
3. 如果上傳成功，表示 R2 配置正確
4. 檢查 Cloudflare R2 Dashboard，應該能看到上傳的文件

### 方法 3：使用 Railway CLI 測試

```bash
# 安裝 Railway CLI
npm i -g @railway/cli

# 登入
railway login

# 連接到專案
railway link

# 檢查環境變數（確認 R2 變數已設置）
railway variables
```

## 常見問題

### Q1: 找不到 Account ID？

**A**: 
- 在 Cloudflare Dashboard 右上角點擊帳號名稱
- 在 Overview 頁面查看 Account ID
- 或在 R2 頁面右上角查看

### Q2: 忘記保存 Secret Access Key？

**A**: 
- 需要重新創建 API Token
- 前往「Manage R2 API Tokens」
- 刪除舊的 Token（可選）
- 創建新的 Token 並立即保存

### Q3: 上傳失敗，提示權限錯誤？

**A**: 檢查：
- API Token 的權限是否為「Object Read & Write」
- API Token 是否綁定到正確的 Bucket
- 環境變數是否正確設置（特別是 Secret Access Key）

### Q4: 圖片無法公開訪問？

**A**: 
- 確認已配置 Bucket 的公共訪問
- 檢查 `CLOUDFLARE_R2_PUBLIC_URL` 是否正確
- 如果使用自定義域名，確認 DNS 已生效

### Q5: 如何查看上傳的文件？

**A**: 
1. 在 Cloudflare Dashboard 中，前往 R2
2. 點擊您的 Bucket
3. 在「Objects」標籤頁查看所有文件

## 安全建議

1. **不要將 API Token 提交到 Git**
   - 確保 `.env` 文件在 `.gitignore` 中
   - 只在 Railway 的環境變數中設置

2. **定期輪換 API Token**
   - 建議每 3-6 個月創建新的 Token
   - 刪除不再使用的舊 Token

3. **限制 Token 權限**
   - 只授予必要的權限（Object Read & Write）
   - 只綁定到需要的 Bucket

4. **使用自定義域名**
   - 生產環境建議使用自定義域名
   - 可以更好地控制訪問和 CDN 配置

## 成本說明

Cloudflare R2 免費額度：
- **存儲**：每月 10GB 免費
- **Class A 操作**（寫入）：每月 100 萬次免費
- **Class B 操作**（讀取）：每月 100 萬次免費
- **出站流量**：完全免費（這是 R2 的優勢！）

超出免費額度後：
- 存儲：$0.015/GB/月
- Class A 操作：$4.50/百萬次
- Class B 操作：$0.36/百萬次

對於大多數應用，免費額度已經足夠使用。

## 下一步

設置完成後：

1. ✅ 確認所有環境變數已添加到 Railway
2. ✅ 重新部署應用（Railway 會自動部署）
3. ✅ 測試圖片上傳功能
4. ✅ 檢查 R2 Dashboard 確認文件已上傳

---

**提示**：如果遇到問題，請檢查 Railway 的「Logs」標籤頁，查看詳細的錯誤信息。

