# R2 公共 URL 設置指南

## 問題

如果沒有配置 `CLOUDFLARE_R2_PUBLIC_URL`，系統會使用簽名 URL（signed URL）來訪問圖片。簽名 URL 有以下限制：

- **最大有效期：7 天**
- 7 天後 URL 會過期，圖片無法訪問
- 需要定期重新生成 URL

## 解決方案：配置公共 URL

為了讓圖片永久可訪問，建議配置 `CLOUDFLARE_R2_PUBLIC_URL`。

### 方法 1：使用 Cloudflare 自定義域名（推薦）

1. **在 Cloudflare 中設置自定義域名**
   - 前往 Cloudflare Dashboard
   - 選擇您的域名
   - 前往「R2」→「管理 R2 API」
   - 找到您的 bucket
   - 點擊「設置」→「公共訪問」
   - 添加自定義域名（例如：`cdn.yourdomain.com`）

2. **配置環境變數**
   - 在 Railway 中添加環境變數：
     ```
     CLOUDFLARE_R2_PUBLIC_URL=https://cdn.yourdomain.com
     ```

### 方法 2：使用 R2.dev 公共域名

1. **啟用 R2.dev 公共訪問**
   - 前往 Cloudflare Dashboard
   - 選擇您的 bucket
   - 點擊「設置」→「公共訪問」
   - 啟用「R2.dev 子域名」
   - 複製生成的公共 URL（例如：`https://pub-xxxxx.r2.dev`）

2. **配置環境變數**
   - 在 Railway 中添加環境變數：
     ```
     CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
     ```

## 當前行為

如果沒有配置 `CLOUDFLARE_R2_PUBLIC_URL`：
- 系統會自動生成簽名 URL
- URL 有效期為 7 天
- 7 天後需要重新上傳或重新生成 URL

## 建議

**強烈建議配置 `CLOUDFLARE_R2_PUBLIC_URL`**，這樣：
- 圖片 URL 永久有效
- 不需要定期更新
- 更好的性能和可靠性

