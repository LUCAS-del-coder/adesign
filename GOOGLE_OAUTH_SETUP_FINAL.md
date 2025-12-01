# Google OAuth 最終設置步驟

## 您的 Railway URL

```
https://adesign-production.up.railway.app
```

## 步驟 1：在 Railway 設置 GOOGLE_REDIRECT_URI

### 在 Railway 中添加環境變數：

1. 在 Railway 專案中，點擊您的應用服務（`adesign`）
2. 點擊「Variables」標籤頁
3. 點擊「+ New Variable」
4. 輸入：
   - **Name**: `GOOGLE_REDIRECT_URI`
   - **Value**: `https://adesign-production.up.railway.app/api/oauth/callback`
5. 點擊「Add」

**重要**：必須包含完整路徑 `/api/oauth/callback`

## 步驟 2：在 Google Cloud Console 設置

### 2.1 前往 Google Cloud Console

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 登入您的 Google 帳號
3. 選擇或創建專案

### 2.2 啟用 Google+ API

1. 在左側選單，點擊「**API 和服務**」→「**程式庫**」
2. 搜索「**Google+ API**」或「**Google Identity**」
3. 點擊並啟用

### 2.3 配置 OAuth 同意畫面（如果是第一次）

1. 前往「**API 和服務**」→「**OAuth 同意畫面**」
2. 選擇「**外部**」（除非您有 Google Workspace）
3. 填寫必填欄位：
   - **應用程式名稱**：廣告圖生成工具（或您喜歡的名稱）
   - **使用者支援電子郵件**：您的電子郵件
   - **應用程式標誌**：可選
   - **應用程式首頁連結**：`https://adesign-production.up.railway.app`
   - **應用程式隱私權政策連結**：可選
   - **應用程式服務條款連結**：可選
   - **已授權網域**：`railway.app`（可選，但建議添加）
4. 點擊「**儲存並繼續**」
5. 在「範圍」頁面，點擊「**儲存並繼續**」
6. 在「測試使用者」頁面，可以跳過（點擊「**儲存並繼續**」）
7. 完成設置

### 2.4 創建 OAuth 憑證

1. 前往「**API 和服務**」→「**憑證**」
2. 點擊「**+ 建立憑證**」→「**OAuth 用戶端 ID**」
3. 如果提示配置 OAuth 同意畫面，請先完成上面的步驟
4. 填寫表單：
   - **應用程式類型**：選擇「**網頁應用程式**」
   - **名稱**：`廣告圖生成工具`（或您喜歡的名稱）
   - **已授權的 JavaScript 來源**：
     - 可以留空
     - 或添加：`https://adesign-production.up.railway.app`
   - **已授權的重新導向 URI**：**重要！**
     - 點擊「**+ 新增 URI**」
     - 輸入：`https://adesign-production.up.railway.app/api/oauth/callback`
     - **必須與 Railway 中的 GOOGLE_REDIRECT_URI 完全一致！**
5. 點擊「**建立**」

### 2.5 複製憑證

創建後，您會看到一個彈窗，顯示：
- **用戶端 ID**：一串很長的字符（例如：`123456789-abcdefg.apps.googleusercontent.com`）
- **用戶端密鑰**：另一串字符（例如：`GOCSPX-abcdefghijklmnop`）

**立即複製這兩個值！**

## 步驟 3：在 Railway 添加 Google OAuth 環境變數

### 3.1 添加 GOOGLE_CLIENT_ID

1. 在 Railway 應用服務的「Variables」頁面
2. 點擊「+ New Variable」
3. 輸入：
   - **Name**: `GOOGLE_CLIENT_ID`
   - **Value**: 貼上您剛才複製的用戶端 ID
4. 點擊「Add」

### 3.2 添加 GOOGLE_CLIENT_SECRET

1. 點擊「+ New Variable」
2. 輸入：
   - **Name**: `GOOGLE_CLIENT_SECRET`
   - **Value**: 貼上您剛才複製的用戶端密鑰
3. 點擊「Add」

## 步驟 4：驗證所有環境變數

確認您有以下所有環境變數：

- [x] `MYSQL_URL`
- [x] `JWT_SECRET`
- [ ] `GOOGLE_CLIENT_ID` ← 需要添加
- [ ] `GOOGLE_CLIENT_SECRET` ← 需要添加
- [ ] `GOOGLE_REDIRECT_URI` ← 需要添加（值：`https://adesign-production.up.railway.app/api/oauth/callback`）
- [x] `CLOUDFLARE_ACCOUNT_ID`
- [x] `CLOUDFLARE_R2_BUCKET`
- [x] `CLOUDFLARE_R2_ACCESS_KEY_ID`
- [x] `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- [x] `GEMINI_API_KEY`

## 步驟 5：重新部署應用

1. 所有環境變數設置完成後
2. Railway 會自動觸發新的部署
3. 或手動點擊「Deploy」按鈕

## 步驟 6：測試登入功能

1. 部署完成後，訪問：`https://adesign-production.up.railway.app`
2. 點擊「登入」按鈕
3. 應該會跳轉到 Google 登入頁面
4. 登入後應該會跳轉回您的應用

## 重要提醒

### URL 必須完全一致

以下兩個地方的 URL 必須**完全相同**：

1. **Railway 環境變數**：
   ```
   GOOGLE_REDIRECT_URI=https://adesign-production.up.railway.app/api/oauth/callback
   ```

2. **Google Cloud Console**：
   ```
   https://adesign-production.up.railway.app/api/oauth/callback
   ```

### 常見錯誤

- ❌ 缺少 `https://` 前綴
- ❌ 缺少 `/api/oauth/callback` 路徑
- ❌ URL 中有多餘的空格
- ❌ 大小寫不一致（雖然通常不影響）

## 如果遇到問題

### 問題：登入後顯示錯誤

**檢查**：
1. 確認 `GOOGLE_REDIRECT_URI` 與 Google Cloud Console 中的設置完全一致
2. 確認 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET` 正確
3. 查看 Railway 的 Logs，檢查錯誤信息

### 問題：無法跳轉到 Google 登入

**檢查**：
1. 確認 `GOOGLE_CLIENT_ID` 已設置
2. 確認 OAuth 同意畫面已配置
3. 確認 Google+ API 已啟用

## 完成！

設置完成後，您的應用應該可以：
- ✅ 使用 Google 帳號登入
- ✅ 上傳圖片到 Cloudflare R2
- ✅ 使用 Gemini API 生成廣告圖變體

---

**您的完整 URL**：`https://adesign-production.up.railway.app`

**回調 URL**：`https://adesign-production.up.railway.app/api/oauth/callback`

