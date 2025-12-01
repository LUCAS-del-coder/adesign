# Railway 部署指南

本指南將幫助您將廣告圖生成工具部署到 Railway 平台。

## 前置需求

1. **Railway 帳號**：前往 [railway.app](https://railway.app) 註冊帳號
2. **GitHub/GitLab 倉庫**：將代碼推送到 Git 倉庫（Railway 支援 GitHub、GitLab、Bitbucket）
3. **環境變數配置**：準備好所有必要的環境變數

## 部署步驟

### 步驟 1：連接 Railway 到 Git 倉庫

1. 登入 Railway 控制台
2. 點擊「New Project」
3. 選擇「Deploy from GitHub repo」（或您的 Git 提供商）
4. 選擇您的倉庫並授權 Railway 訪問

### 步驟 2：配置環境變數

在 Railway 專案的「Variables」標籤頁中，添加以下環境變數：

#### 必需環境變數

```bash
# 數據庫連接（Railway 提供 MySQL 服務時會自動生成）
DATABASE_URL=mysql://user:password@host:port/database

# JWT 密鑰（用於 session 加密）
JWT_SECRET=your-secret-key-here

# Manus OAuth 配置
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://your-oauth-server.com

# Gemini API 配置
GEMINI_API_KEY=your-gemini-api-key

# 存儲服務配置（Manus Forge API）
BUILT_IN_FORGE_API_URL=https://your-forge-api-url.com
BUILT_IN_FORGE_API_KEY=your-forge-api-key

# 可選配置
OWNER_OPEN_ID=your-open-id  # 可選
```

#### 如何獲取各項配置

1. **DATABASE_URL**：
   - 在 Railway 中創建 MySQL 服務
   - Railway 會自動生成 `DATABASE_URL` 環境變數
   - 或使用外部 MySQL 服務（如 PlanetScale、AWS RDS）

2. **JWT_SECRET**：
   - 生成一個隨機字串：
     ```bash
     openssl rand -base64 32
     ```

3. **GEMINI_API_KEY**：
   - 前往 [Google AI Studio](https://aistudio.google.com/)
   - 登入並創建 API 金鑰

4. **Manus OAuth 配置**：
   - 聯繫 Manus 團隊獲取 `VITE_APP_ID` 和 `OAUTH_SERVER_URL`

5. **存儲服務配置**：
   - 聯繫 Manus 團隊獲取 Forge API 配置
   - 或使用 AWS S3（需要修改 `server/storage.ts`）

### 步驟 3：配置構建和部署

Railway 會自動檢測 `railway.json` 配置文件，但您也可以手動配置：

1. 在 Railway 專案設置中：
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`
   - **Root Directory**: `/`（根目錄）

2. 確保使用 **pnpm** 作為包管理器（Railway 會自動檢測 `packageManager` 欄位）

### 步驟 4：運行數據庫遷移

部署完成後，需要運行數據庫遷移：

#### 方法 1：使用 Railway CLI

```bash
# 安裝 Railway CLI
npm i -g @railway/cli

# 登入
railway login

# 連接到專案
railway link

# 運行遷移
railway run pnpm db:migrate
```

#### 方法 2：使用 Railway 的 Deploy Hook

1. 在 Railway 專案中添加一個「Deploy Hook」
2. 創建一個臨時腳本運行遷移
3. 或在部署後手動執行一次

#### 方法 3：在代碼中添加自動遷移（不推薦用於生產環境）

如果需要自動遷移，可以在 `server/_core/index.ts` 中添加：

```typescript
// 僅在首次啟動時運行（需要額外邏輯判斷）
if (process.env.RUN_MIGRATIONS === 'true') {
  await import('drizzle-kit').then(async ({ migrate }) => {
    // 運行遷移邏輯
  });
}
```

### 步驟 5：配置自定義域名（可選）

1. 在 Railway 專案設置中，點擊「Settings」→「Networking」
2. 添加自定義域名
3. Railway 會自動配置 SSL 證書

## 驗證部署

部署完成後，訪問您的 Railway 提供的 URL（格式：`https://your-app.up.railway.app`），確認：

1. ✅ 網站可以正常訪問
2. ✅ OAuth 登入功能正常
3. ✅ 可以上傳圖片
4. ✅ 可以生成廣告圖變體
5. ✅ 圖片庫功能正常

## 常見問題

### 問題 1：構建失敗

**可能原因**：
- 缺少必要的環境變數
- pnpm 版本不匹配
- 構建命令錯誤

**解決方案**：
- 檢查 Railway 構建日誌
- 確認所有環境變數已設置
- 確認 `package.json` 中的 `packageManager` 欄位正確

### 問題 2：數據庫連接失敗

**可能原因**：
- `DATABASE_URL` 格式錯誤
- 數據庫服務未啟動
- 網絡連接問題

**解決方案**：
- 檢查 `DATABASE_URL` 格式
- 確認 MySQL 服務在 Railway 中運行
- 檢查防火牆設置

### 問題 3：圖片上傳失敗

**可能原因**：
- `BUILT_IN_FORGE_API_URL` 或 `BUILT_IN_FORGE_API_KEY` 未設置
- 存儲服務配置錯誤

**解決方案**：
- 確認存儲服務環境變數已設置
- 檢查存儲服務 API 是否可訪問

### 問題 4：Gemini API 調用失敗

**可能原因**：
- `GEMINI_API_KEY` 未設置或無效
- API 配額用盡

**解決方案**：
- 檢查 `GEMINI_API_KEY` 是否正確
- 確認 Google Cloud 專案配額

## 監控和日誌

Railway 提供：

1. **實時日誌**：在 Railway 控制台查看應用日誌
2. **指標監控**：CPU、內存使用情況
3. **部署歷史**：查看每次部署的狀態

## 更新部署

當您推送代碼到 Git 倉庫時，Railway 會自動：

1. 檢測變更
2. 觸發新的構建
3. 部署新版本

您也可以在 Railway 控制台手動觸發部署。

## 備份建議

1. **數據庫備份**：定期備份 MySQL 數據庫
2. **環境變數備份**：將環境變數導出保存
3. **代碼備份**：確保 Git 倉庫是最新的

## 成本估算

Railway 的定價基於：
- 服務運行時間
- 資源使用量（CPU、內存）
- 數據傳輸量

建議：
- 使用 Railway 的免費額度進行測試
- 生產環境建議使用付費計劃以獲得更好的性能

## 支援

如遇到問題：
1. 查看 Railway 文檔：https://docs.railway.app
2. 檢查應用日誌
3. 聯繫 Manus 技術支援

---

**最後更新**：2025年1月

