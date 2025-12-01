# 部署指南（已移除 Manus 依賴）

本指南說明如何部署廣告圖生成工具，現在使用 **Google OAuth** 和 **Cloudflare R2** 替代 Manus 服務。

## 環境變數配置

在 Railway 專案的「Variables」標籤頁中，添加以下環境變數：

### 必需環境變數

```bash
# 數據庫（Railway 提供 MySQL 時會自動生成）
DATABASE_URL=mysql://user:password@host:port/database

# JWT 密鑰（用於 session 加密）
JWT_SECRET=your-secret-key-here

# Google OAuth 配置
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-app.up.railway.app/api/oauth/callback

# Cloudflare R2 配置（用於圖片存儲）
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_R2_BUCKET=your-bucket-name
CLOUDFLARE_R2_ACCESS_KEY_ID=your-r2-access-key-id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-r2-secret-access-key

# 可選：自定義公開 URL（如果配置了自定義域名）
CLOUDFLARE_R2_PUBLIC_URL=https://your-custom-domain.com

# Gemini API 配置
GEMINI_API_KEY=your-gemini-api-key

# 可選配置
OWNER_OPEN_ID=your-open-id
```

## 如何獲取各項配置

### 1. DATABASE_URL

**詳細步驟請參考 `DATABASE_SETUP.md` 文件**

快速步驟：
1. 在 Railway 專案中點擊「+ New」→「Database」→「Add MySQL」
2. Railway 會自動創建 MySQL 服務並生成 `DATABASE_URL`
3. 在 MySQL 服務的「Variables」標籤頁中找到 `DATABASE_URL`
4. 點擊右側「⋯」→「Reference Variable」→ 選擇您的應用服務
5. 這樣應用服務就可以使用數據庫連接了

### 2. JWT_SECRET
生成一個隨機字串：
```bash
openssl rand -base64 32
```

### 3. Google OAuth 配置

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 創建新專案或選擇現有專案
3. 啟用「Google+ API」
4. 前往「憑證」→「建立憑證」→「OAuth 用戶端 ID」
5. 應用程式類型選擇「網頁應用程式」
6. 授權重新導向 URI 設置為：`https://your-app.up.railway.app/api/oauth/callback`
7. 複製「用戶端 ID」和「用戶端密鑰」

### 4. Cloudflare R2 配置

**詳細步驟請參考 `CLOUDFLARE_R2_SETUP.md` 文件**

快速步驟：
1. 前往 [Cloudflare Dashboard](https://dash.cloudflare.com/) → R2 → Create bucket
2. 創建 Bucket 並記錄 Account ID 和 Bucket 名稱
3. 前往「Manage R2 API Tokens」→「Create API Token」
4. 設置權限為「Object Read & Write」，綁定到您的 Bucket
5. **立即保存** Access Key ID 和 Secret Access Key（只顯示一次！）
6. 在 Railway 應用服務的 Variables 中添加所有 R2 相關環境變數
7. （可選）配置 Bucket 公共訪問或自定義域名

### 5. GEMINI_API_KEY
- 前往 [Google AI Studio](https://aistudio.google.com/)
- 登入並創建 API 金鑰

## 部署步驟

### 步驟 1：在 Railway 創建專案
1. 登入 Railway
2. 創建新專案並連接 GitHub 倉庫
3. Railway 會自動開始構建

### 步驟 2：添加 MySQL 數據庫
1. 在 Railway 專案中點擊「+ New」
2. 選擇「Database」→「Add MySQL」
3. Railway 會自動生成 `DATABASE_URL`

### 步驟 3：配置環境變數
在 Railway 專案中設置所有必需的環境變數（見上方清單）

### 步驟 4：運行數據庫遷移
```bash
# 使用 Railway CLI
railway run pnpm db:migrate
```

### 步驟 5：驗證部署
訪問您的 Railway URL，確認：
- ✅ 網站可以正常訪問
- ✅ 可以點擊「登入」按鈕
- ✅ Google OAuth 登入流程正常
- ✅ 登入後可以上傳圖片
- ✅ 可以生成廣告圖變體

## 重要變更說明

### OAuth 認證
- **舊**：使用 Manus OAuth
- **新**：使用 Google OAuth
- 用戶使用 Google 帳號登入

### 存儲服務
- **舊**：使用 Manus Forge API
- **新**：使用 Cloudflare R2
- 所有圖片存儲在您自己的 R2 Bucket 中
- R2 提供免費額度：每月 10GB 存儲 + 100 萬次讀取操作

### 環境變數變更
- 移除：`VITE_APP_ID`, `OAUTH_SERVER_URL`, `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`
- 新增：`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `CLOUDFLARE_*` 相關變數

## 常見問題

### Q: Google OAuth 登入失敗
**A**: 檢查：
- `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET` 是否正確
- `GOOGLE_REDIRECT_URI` 是否與 Google Cloud Console 中設置的一致
- 是否已啟用 Google+ API

### Q: 圖片上傳失敗
**A**: 檢查：
- Cloudflare R2 憑證是否正確
- R2 Bucket 是否存在
- API Token 是否有正確的權限（Object Read & Write）
- 如果使用自定義域名，確認域名已正確連接

### Q: 數據庫連接失敗
**A**: 檢查：
- `DATABASE_URL` 是否已自動生成
- MySQL 服務是否正在運行
- 是否已運行數據庫遷移

## 成本估算

- **Railway**: 免費額度或按使用量付費
- **Cloudflare R2**: 
  - 免費額度：每月 10GB 存儲 + 100 萬次讀取操作
  - 超出後：$0.015/GB 存儲，$4.50/百萬次 Class A 操作（寫入），$0.36/百萬次 Class B 操作（讀取）
- **Google OAuth**: 免費
- **Gemini API**: 按使用量付費

**優勢**：Cloudflare R2 沒有出站流量費用（egress fees），比 AWS S3 更經濟實惠！

---

**最後更新**：2025年1月

