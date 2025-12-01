# 如何查看 Railway 應用 URL

## 方法一：在 Settings 頁面查看（最簡單）

### 步驟：

1. 在 Railway 專案中，點擊您的**應用服務**（例如：`adesign`）
2. 點擊頂部導航欄的「**Settings**」標籤
3. 在「**Networking**」部分，您會看到：
   - **Public Domain**：這是您的應用 URL
   - 格式類似：`https://your-app-name.up.railway.app`
4. 如果還沒有設置，會顯示「**Generate Domain**」按鈕

### 如果沒有 Public Domain：

1. 在 Settings → Networking 頁面
2. 點擊「**Generate Domain**」按鈕
3. Railway 會自動生成一個 URL（格式：`https://[隨機名稱].up.railway.app`）
4. 這個 URL 就是您的應用地址

## 方法二：在 Deployments 頁面查看

1. 在 Railway 專案中，點擊您的應用服務
2. 點擊「**Deployments**」標籤
3. 找到最新的部署
4. 在部署詳情中，通常會顯示應用的 URL

## 方法三：在服務卡片上查看

1. 在 Railway 專案的「**Architecture**」視圖中
2. 點擊您的應用服務卡片
3. 在彈出的面板中，通常會顯示服務的 URL

## 方法四：使用 Railway CLI

```bash
# 安裝 Railway CLI
npm i -g @railway/cli

# 登入
railway login

# 連接到專案
railway link

# 查看服務信息（包括 URL）
railway status
```

## 如何設置自定義域名（可選）

如果您想使用自己的域名：

1. 在 Settings → Networking 頁面
2. 找到「**Custom Domains**」部分
3. 點擊「**Add Custom Domain**」
4. 輸入您的域名（例如：`app.yourdomain.com`）
5. Railway 會提供 DNS 記錄，添加到您的域名提供商
6. 等待 DNS 生效（通常幾分鐘到幾小時）

## 重要提示

### 獲取 URL 後：

1. **複製完整的 URL**，格式類似：
   ```
   https://your-app-name.up.railway.app
   ```

2. **用於 GOOGLE_REDIRECT_URI**：
   ```
   https://your-app-name.up.railway.app/api/oauth/callback
   ```

3. **在 Google Cloud Console 中設置**：
   - 前往 Google Cloud Console → 憑證 → OAuth 用戶端 ID
   - 在「已授權的重新導向 URI」中添加：
     ```
     https://your-app-name.up.railway.app/api/oauth/callback
     ```

### URL 格式說明

Railway 生成的 URL 格式：
- **格式**：`https://[服務名稱]-[隨機字符].up.railway.app`
- **範例**：`https://adesign-production.up.railway.app`
- **或**：`https://adesign-abc123.up.railway.app`

## 常見問題

### Q: 找不到 URL？

**A**: 
- 確認服務已經成功部署
- 檢查 Settings → Networking 頁面
- 如果沒有，點擊「Generate Domain」生成一個

### Q: URL 會改變嗎？

**A**: 
- Railway 自動生成的 URL 通常不會改變
- 除非您刪除並重新創建服務
- 建議設置自定義域名以獲得穩定的 URL

### Q: 可以更改 URL 嗎？

**A**: 
- Railway 自動生成的 URL 無法更改
- 但您可以設置自定義域名來覆蓋它

### Q: 如何確認 URL 是否正確？

**A**: 
1. 複製 URL 到瀏覽器訪問
2. 如果看到您的應用（或登入頁面），表示 URL 正確
3. 如果看到錯誤，檢查服務是否正在運行

## 快速檢查步驟

1. ✅ 前往 Railway → 您的專案 → 應用服務
2. ✅ 點擊「Settings」標籤
3. ✅ 查看「Networking」部分
4. ✅ 複製「Public Domain」的 URL
5. ✅ 用於設置 `GOOGLE_REDIRECT_URI`

---

**提示**：如果您的應用還沒有部署，URL 可能還不存在。先完成部署，然後再查看 URL。

