# 故障排除指南

## 問題：導入的圖片看不到

### 可能原因和解決方案

1. **R2 URL 配置問題**
   - ✅ 已修復：現在使用簽名 URL（signed URL）確保圖片可訪問
   - 如果仍然無法顯示，請檢查：
     - `CLOUDFLARE_R2_PUBLIC_URL` 環境變數是否正確配置
     - 或者讓系統自動使用簽名 URL

2. **CORS 問題**
   - 如果圖片 URL 無法在瀏覽器中加載，可能是 CORS 問題
   - 解決方案：在 Cloudflare R2 中配置 CORS 規則

3. **檢查日誌**
   - 查看 Railway 日誌中的 `[Upload]` 和 `[R2]` 相關訊息
   - 確認圖片是否成功上傳到 R2
   - 確認 URL 是否正確生成

## 問題：無法生成圖片

### 可能原因和解決方案

1. **Gemini API 配置**
   - 確認 `GEMINI_API_KEY` 環境變數已設置
   - 確認 API 金鑰有效且有足夠配額

2. **圖片下載問題**
   - Gemini 需要下載原始圖片作為參考
   - 如果原始圖片 URL 無法訪問，生成會失敗
   - 解決方案：確保 R2 URL 可訪問（已使用簽名 URL 修復）

3. **API 錯誤**
   - 查看 Railway 日誌中的 `[Gemini]` 相關訊息
   - 常見錯誤：
     - 403: API 金鑰無權限
     - 429: 配額超限
     - 400: 請求參數錯誤

4. **檢查日誌**
   - 查看 `[Generate]` 相關日誌
   - 確認每個步驟是否成功執行

## 調試步驟

1. **檢查環境變數**
   ```bash
   # 在 Railway 中確認以下環境變數已設置：
   - CLOUDFLARE_ACCOUNT_ID
   - CLOUDFLARE_R2_BUCKET
   - CLOUDFLARE_R2_ACCESS_KEY_ID
   - CLOUDFLARE_R2_SECRET_ACCESS_KEY
   - CLOUDFLARE_R2_PUBLIC_URL (可選，建議設置)
   - GEMINI_API_KEY
   - DATABASE_URL 或 MYSQL_URL
   ```

2. **測試圖片上傳**
   - 上傳一張圖片
   - 查看 Railway 日誌，確認：
     - `[Upload] Uploading to R2` 出現
     - `[Upload] R2 returned URL` 顯示 URL
     - `[Upload] Successfully saved to database` 出現

3. **測試圖片生成**
   - 選擇一張已上傳的圖片
   - 點擊「生成 3 張變體圖」
   - 查看 Railway 日誌，確認：
     - `[Generate] Starting variant generation` 出現
     - `[Gemini] 開始並行生成` 出現
     - `[Generate] Successfully generated` 出現

4. **檢查瀏覽器控制台**
   - 打開瀏覽器開發者工具（F12）
   - 查看 Console 標籤頁
   - 查看 Network 標籤頁，確認圖片請求是否成功

## 常見錯誤訊息

### "R2 upload failed"
- 檢查 R2 憑證是否正確
- 檢查 bucket 名稱是否正確
- 檢查網絡連接

### "GEMINI_API_KEY 未設定"
- 在 Railway 環境變數中設置 `GEMINI_API_KEY`

### "找不到原始廣告圖"
- 確認圖片已成功上傳
- 檢查數據庫連接

### "無法生成圖片：所有參考圖片都無法訪問"
- 確認原始圖片 URL 可訪問
- 檢查 R2 URL 是否正確

## 如果問題仍然存在

1. 查看完整的 Railway 日誌
2. 檢查瀏覽器控制台的錯誤訊息
3. 確認所有環境變數都已正確設置
4. 嘗試重新上傳圖片
5. 檢查 R2 bucket 的公共訪問設置

