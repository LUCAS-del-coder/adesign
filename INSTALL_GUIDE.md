# 本地安裝指南

## 1. 安裝依賴

項目使用 pnpm 作為包管理器。如果還沒有安裝 pnpm，請先安裝：

```bash
# 使用 npm 安裝 pnpm
npm install -g pnpm

# 或使用 Homebrew (macOS)
brew install pnpm
```

然後安裝項目依賴：

```bash
pnpm install
```

## 2. 配置環境變數

複製 `.env.example` 文件為 `.env`：

```bash
cp .env.example .env
```

編輯 `.env` 文件，填入以下必要的配置：

### 必須配置的項目：

1. **數據庫連接**
   - `DATABASE_URL` 或 `MYSQL_URL`：MySQL 數據庫連接字符串
   - 格式：`mysql://用戶名:密碼@主機:端口/數據庫名`

2. **JWT 密鑰**
   - `JWT_SECRET`：用於會話管理的密鑰，可以是任意隨機字符串

3. **Google OAuth**
   - `GOOGLE_CLIENT_ID`：Google OAuth 客戶端 ID
   - `GOOGLE_CLIENT_SECRET`：Google OAuth 客戶端密鑰
   - `GOOGLE_REDIRECT_URI`：回調 URL（本地開發使用 `http://localhost:5173/api/oauth/callback`）

4. **Cloudflare R2**
   - `CLOUDFLARE_ACCOUNT_ID`：Cloudflare 帳號 ID
   - `CLOUDFLARE_R2_BUCKET`：R2 存儲桶名稱
   - `CLOUDFLARE_R2_ACCESS_KEY_ID`：R2 訪問密鑰 ID
   - `CLOUDFLARE_R2_SECRET_ACCESS_KEY`：R2 訪問密鑰

5. **Gemini API**
   - `GEMINI_API_KEY`：Google Gemini API 密鑰

## 3. 初始化數據庫

運行數據庫遷移：

```bash
pnpm db:migrate
```

## 4. 啟動開發服務器

```bash
pnpm dev
```

服務器將在 `http://localhost:5173` 啟動。

## 5. 構建生產版本（可選）

```bash
pnpm build
pnpm start
```

## 注意事項

- 確保 MySQL 數據庫已安裝並運行
- 確保所有環境變數都已正確配置
- 本地開發時，Google OAuth 回調 URL 必須是 `http://localhost:5173/api/oauth/callback`
- 如果遇到依賴問題，可以嘗試刪除 `node_modules` 和 `pnpm-lock.yaml`，然後重新運行 `pnpm install`
