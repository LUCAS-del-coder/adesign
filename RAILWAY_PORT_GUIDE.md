# Railway 端口設置指南

## 這是什麼？

這是 Railway 生成公共域名的表單。Railway 需要知道您的應用監聽在哪個端口，才能正確路由流量。

## 應該輸入什麼端口？

### 檢查您的代碼

根據您的代碼，應用會：
1. 首先嘗試使用環境變數 `PORT`（Railway 會自動設置）
2. 如果沒有，使用默認端口 `3000`

### Railway 的默認行為

Railway 會自動設置 `PORT` 環境變數，通常是：
- `8080`（常見）
- `3000`（如果沒有特別設置）
- 或其他可用端口

## 推薦做法

### 方法一：使用 8080（推薦）

1. 在輸入框中輸入：`8080`
2. 點擊「Generate Domain」
3. Railway 會生成公共 URL

**為什麼選擇 8080？**
- Railway 默認使用 8080
- 這是常見的生產環境端口
- 與 Railway 的自動配置最匹配

### 方法二：檢查實際使用的端口

如果您想確認實際端口：

1. 查看 Railway 的環境變數：
   - 前往 Variables 頁面
   - 查看是否有 `PORT` 變數
   - 如果有，使用那個值

2. 或者查看部署日誌：
   - 前往 Deployments 頁面
   - 查看最新部署的日誌
   - 查找類似 "Server running on http://localhost:XXXX" 的訊息

## 快速操作步驟

1. **在端口輸入框中輸入：`8080`**
2. **點擊「Generate Domain」按鈕**
3. **等待幾秒鐘，Railway 會生成一個 URL**
4. **複製生成的 URL**（格式：`https://adesign-xxxxx.up.railway.app`）

## 如果端口不正確怎麼辦？

不用擔心！如果端口設置錯誤：

1. 可以稍後在 Settings → Networking 中修改
2. 或者刪除現有域名，重新生成
3. Railway 會自動檢測正確的端口

## 重要提示

- **Railway 會自動設置 PORT 環境變數**，您的代碼會自動使用它
- **輸入的端口只是用於生成域名**，實際運行時會使用環境變數中的 PORT
- **最安全的選擇是使用 8080**，這是 Railway 的默認值

## 下一步

生成域名後：

1. 複製生成的 URL
2. 用於設置 `GOOGLE_REDIRECT_URI`：
   ```
   https://your-generated-url.up.railway.app/api/oauth/callback
   ```

---

**建議**：直接輸入 `8080` 並點擊「Generate Domain」即可！

