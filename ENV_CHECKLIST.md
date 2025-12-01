# 環境變數檢查清單

## 您已設置的環境變數 ✅

根據您的 Railway Variables 頁面，您已經設置了：

1. ✅ `CLOUDFLARE_ACCOUNT_ID`
2. ✅ `CLOUDFLARE_R2_ACCESS_KEY_ID`
3. ✅ `CLOUDFLARE_R2_BUCKET`
4. ✅ `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
5. ✅ `GEMINI_API_KEY`
6. ✅ `JWT_SECRET`
7. ✅ `MYSQL_URL`

## 缺少的必需環境變數 ❌

根據代碼檢查，您還需要設置以下 **Google OAuth** 相關的環境變數：

### 1. GOOGLE_CLIENT_ID ❌
- **用途**：Google OAuth 客戶端 ID
- **必需**：是（用於用戶登入）
- **如何獲取**：見下方說明

### 2. GOOGLE_CLIENT_SECRET ❌
- **用途**：Google OAuth 客戶端密鑰
- **必需**：是（用於用戶登入）
- **如何獲取**：見下方說明

### 3. GOOGLE_REDIRECT_URI ❌
- **用途**：OAuth 回調 URL
- **必需**：是（用於用戶登入）
- **格式**：`https://your-app.up.railway.app/api/oauth/callback`
- **如何設置**：使用您的 Railway 應用 URL

## 可選的環境變數（建議設置）

### 4. CLOUDFLARE_R2_PUBLIC_URL ⚠️
- **用途**：R2 公共訪問 URL（用於圖片公開訪問）
- **必需**：否（但建議設置）
- **格式**：
  - 如果使用 R2.dev：`https://pub-xxxxx.r2.dev`
  - 如果使用自定義域名：`https://cdn.yourdomain.com`
- **如何獲取**：在 Cloudflare R2 Bucket 設置中配置公共訪問

### 5. OWNER_OPEN_ID
- **用途**：管理員的 Open ID（可選功能）
- **必需**：否
- **可以暫時不設置**

## 完整環境變數清單

### 必需環境變數（10 個）

```bash
# 數據庫
MYSQL_URL=mysql://...  ✅ 已設置

# 認證
JWT_SECRET=...  ✅ 已設置

# Google OAuth（缺少！）
GOOGLE_CLIENT_ID=your-google-client-id  ❌ 缺少
GOOGLE_CLIENT_SECRET=your-google-client-secret  ❌ 缺少
GOOGLE_REDIRECT_URI=https://your-app.up.railway.app/api/oauth/callback  ❌ 缺少

# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID=...  ✅ 已設置
CLOUDFLARE_R2_BUCKET=...  ✅ 已設置
CLOUDFLARE_R2_ACCESS_KEY_ID=...  ✅ 已設置
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...  ✅ 已設置

# Gemini API
GEMINI_API_KEY=...  ✅ 已設置
```

### 可選環境變數

```bash
# Cloudflare R2 公共 URL（建議設置）
CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev  ⚠️ 建議設置

# 管理員 Open ID（可選）
OWNER_OPEN_ID=...  ⚠️ 可選
```

## 如何獲取缺少的 Google OAuth 變數

### 步驟 1：前往 Google Cloud Console

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 登入您的 Google 帳號
3. 創建新專案或選擇現有專案

### 步驟 2：啟用 Google+ API

1. 在左側選單，點擊「**API 和服務**」→「**程式庫**」
2. 搜索「**Google+ API**」或「**Google Identity**」
3. 點擊並啟用

### 步驟 3：創建 OAuth 憑證

1. 前往「**API 和服務**」→「**憑證**」
2. 點擊「**建立憑證**」→「**OAuth 用戶端 ID**」
3. 如果是第一次，需要先配置「**OAuth 同意畫面**」：
   - 選擇「**外部**」（除非您有 Google Workspace）
   - 填寫應用程式名稱（例如：廣告圖生成工具）
   - 填寫您的電子郵件
   - 完成其他必填欄位
   - 保存並繼續
4. 創建 OAuth 用戶端 ID：
   - **應用程式類型**：選擇「**網頁應用程式**」
   - **名稱**：輸入描述性名稱（例如：廣告圖生成工具）
   - **已授權的 JavaScript 來源**：可以留空或添加您的域名
   - **已授權的重新導向 URI**：**重要！** 添加：
     ```
     https://your-app.up.railway.app/api/oauth/callback
     ```
     （將 `your-app.up.railway.app` 替換為您的實際 Railway URL）
5. 點擊「**建立**」
6. **立即複製**：
   - **用戶端 ID** → 這就是 `GOOGLE_CLIENT_ID`
   - **用戶端密鑰** → 這就是 `GOOGLE_CLIENT_SECRET`

### 步驟 4：在 Railway 中添加環境變數

1. 在 Railway 專案的應用服務中
2. 點擊「Variables」標籤頁
3. 添加以下三個變數：

#### GOOGLE_CLIENT_ID
- 點擊「+ New Variable」
- **Name**: `GOOGLE_CLIENT_ID`
- **Value**: 貼上您剛才複製的用戶端 ID
- 點擊「Add」

#### GOOGLE_CLIENT_SECRET
- 點擊「+ New Variable」
- **Name**: `GOOGLE_CLIENT_SECRET`
- **Value**: 貼上您剛才複製的用戶端密鑰
- 點擊「Add」

#### GOOGLE_REDIRECT_URI
- 點擊「+ New Variable」
- **Name**: `GOOGLE_REDIRECT_URI`
- **Value**: `https://your-app.up.railway.app/api/oauth/callback`
  - **重要**：將 `your-app.up.railway.app` 替換為您的實際 Railway 應用 URL
  - 您可以在 Railway 應用的「Settings」→「Networking」中找到您的 URL
- 點擊「Add」

## 檢查清單

設置完成後，確認您有以下環境變數：

- [x] MYSQL_URL
- [x] JWT_SECRET
- [ ] **GOOGLE_CLIENT_ID** ← 需要設置
- [ ] **GOOGLE_CLIENT_SECRET** ← 需要設置
- [ ] **GOOGLE_REDIRECT_URI** ← 需要設置
- [x] CLOUDFLARE_ACCOUNT_ID
- [x] CLOUDFLARE_R2_BUCKET
- [x] CLOUDFLARE_R2_ACCESS_KEY_ID
- [x] CLOUDFLARE_R2_SECRET_ACCESS_KEY
- [ ] CLOUDFLARE_R2_PUBLIC_URL ← 建議設置
- [x] GEMINI_API_KEY

## 重要提醒

1. **GOOGLE_REDIRECT_URI 必須與 Google Cloud Console 中設置的完全一致**
2. 如果您的 Railway URL 改變了，需要同時更新：
   - Railway 中的 `GOOGLE_REDIRECT_URI` 環境變數
   - Google Cloud Console 中的「已授權的重新導向 URI」
3. 設置完成後，需要重新部署應用才能生效

## 下一步

設置完所有環境變數後：

1. ✅ 確認所有變數已添加
2. ✅ 確認 `GOOGLE_REDIRECT_URI` 與 Google Cloud Console 中的設置一致
3. ✅ 重新部署應用（Railway 會自動部署）
4. ✅ 測試 Google OAuth 登入功能

