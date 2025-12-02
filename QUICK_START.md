# 快速開始指南

## 當前狀態

✅ 項目代碼已準備就緒
✅ 依賴已安裝（node_modules 存在）
✅ 配置文件已創建

## 立即開始

### 1. 配置環境變數

```bash
# 複製環境變數模板
cp .env.example .env

# 編輯 .env 文件，填入您的配置
# 可以使用任何文本編輯器打開 .env 文件
```

**必須配置的項目：**
- `DATABASE_URL` 或 `MYSQL_URL` - MySQL 數據庫連接
- `JWT_SECRET` - 任意隨機字符串
- `GOOGLE_CLIENT_ID` - Google OAuth 客戶端 ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth 客戶端密鑰
- `GOOGLE_REDIRECT_URI` - 本地使用 `http://localhost:5173/api/oauth/callback`
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare 帳號 ID
- `CLOUDFLARE_R2_BUCKET` - R2 存儲桶名稱
- `CLOUDFLARE_R2_ACCESS_KEY_ID` - R2 訪問密鑰 ID
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY` - R2 訪問密鑰
- `GEMINI_API_KEY` - Gemini API 密鑰

### 2. 初始化數據庫

```bash
# 確保 MySQL 數據庫已運行
pnpm db:migrate
```

### 3. 啟動開發服務器

```bash
pnpm dev
```

服務器將在 `http://localhost:5173` 啟動。

## 如果遇到問題

### 依賴問題
```bash
# 重新安裝依賴
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 數據庫連接問題
- 確保 MySQL 服務正在運行
- 檢查 `.env` 中的數據庫連接字符串是否正確
- 確保數據庫已創建

### 端口被占用
- 默認端口是 5173
- 可以在 `.env` 中設置 `PORT=其他端口號`

## 詳細文檔

查看 `INSTALL_GUIDE.md` 獲取更詳細的安裝說明。
