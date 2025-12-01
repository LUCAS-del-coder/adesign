# 部署錯誤修復說明

## 已修復的問題

### 問題 1：OAUTH_SERVER_URL 錯誤

**錯誤信息**：
```
[OAuth] ERROR: OAUTH_SERVER_URL is not configured!
```

**原因**：舊的 `sdk.ts` 文件仍在檢查 `OAUTH_SERVER_URL`，但我們已經改用 Google OAuth。

**修復**：已更新 `sdk.ts`，使其在沒有配置時不會報錯（因為這個服務已經不再使用）。

### 問題 2：路徑解析錯誤

**錯誤信息**：
```
TypeError [ERR_INVALID_ARG_TYPE]: The "paths[0]" argument must be of type string. Received undefined
```

**原因**：`import.meta.dirname` 在生產環境的打包後可能不可用。

**修復**：已更新 `vite.ts` 中的 `serveStatic` 函數，使用 `process.cwd()` 作為備用路徑。

## 下一步操作

### 1. 提交並推送代碼

```bash
git add .
git commit -m "Fix: Remove OAUTH_SERVER_URL dependency and fix path resolution in production"
git push
```

### 2. Railway 會自動重新部署

推送後，Railway 會自動檢測變更並重新部署。

### 3. 檢查部署日誌

部署完成後，檢查 Railway 的 Logs，確認：
- ✅ 沒有 `OAUTH_SERVER_URL` 錯誤
- ✅ 沒有路徑解析錯誤
- ✅ 服務正常啟動

## 如果還有問題

如果部署後仍有問題，請檢查：

1. **所有環境變數是否已設置**：
   - MYSQL_URL
   - JWT_SECRET
   - GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_SECRET
   - GOOGLE_REDIRECT_URI
   - CLOUDFLARE_ACCOUNT_ID
   - CLOUDFLARE_R2_BUCKET
   - CLOUDFLARE_R2_ACCESS_KEY_ID
   - CLOUDFLARE_R2_SECRET_ACCESS_KEY
   - GEMINI_API_KEY

2. **構建是否成功**：
   - 檢查 Railway 的構建日誌
   - 確認 `pnpm build` 成功完成

3. **靜態文件是否存在**：
   - 確認 `dist/public` 目錄存在
   - 確認 `dist/public/index.html` 存在

## 驗證修復

部署成功後，您應該能夠：
- ✅ 訪問網站：`https://adesign-production.up.railway.app`
- ✅ 看到登入頁面
- ✅ 點擊登入按鈕跳轉到 Google OAuth

