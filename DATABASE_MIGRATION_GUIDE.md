# 數據庫遷移指南

## 問題

應用已成功啟動，但數據庫表還沒有創建。錯誤信息：
```
Table 'railway.users' doesn't exist
```

## 解決方案

需要在 Railway 上運行數據庫遷移來創建表。

## 方法一：在 Railway 中運行遷移（推薦）

### 步驟 1：在 Railway 中打開終端

1. 前往 Railway 專案
2. 點擊您的應用服務
3. 點擊「**Deployments**」標籤頁
4. 找到最新的部署
5. 點擊部署右側的「**...**」按鈕
6. 選擇「**Open Shell**」或「**View Logs**」
7. 或者點擊「**Settings**」→「**Shell**」

### 步驟 2：運行遷移命令

在終端中執行：

```bash
pnpm db:migrate
```

或者：

```bash
drizzle-kit migrate
```

### 步驟 3：驗證

遷移完成後，檢查是否成功：
- 查看終端輸出，應該會看到遷移成功的訊息
- 或者再次嘗試登入，應該不會再看到表不存在的錯誤

## 方法二：在構建時自動運行遷移

### 選項 A：修改 railway.json

在 `railway.json` 中添加遷移步驟：

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install --no-frozen-lockfile && pnpm build && pnpm db:migrate"
  },
  "deploy": {
    "startCommand": "pnpm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 選項 B：修改 nixpacks.toml

在 `nixpacks.toml` 的 build 階段添加遷移：

```toml
[phases.build]
cmds = ["pnpm build", "pnpm db:migrate"]
```

## 方法三：使用 Railway 的 Post-Deploy Hook

1. 前往 Railway 專案設置
2. 查找「**Post-Deploy**」或「**Deploy Hooks**」
3. 添加命令：`pnpm db:migrate`

## 推薦做法

**建議使用方法一**（手動運行一次），因為：
- 遷移只需要運行一次
- 不需要每次部署都運行遷移
- 可以更好地控制遷移時機

## 遷移完成後

遷移成功後，您應該能夠：
- ✅ 成功登入
- ✅ 創建用戶記錄
- ✅ 使用所有數據庫功能

## 如果遷移失敗

如果遷移失敗，請檢查：
1. **數據庫連接**：確認 `MYSQL_URL` 環境變數正確
2. **數據庫權限**：確認數據庫用戶有創建表的權限
3. **遷移文件**：確認 `drizzle/` 目錄中有遷移文件

## 檢查遷移文件

遷移文件應該在 `drizzle/` 目錄中，例如：
- `drizzle/0000_*.sql`
- `drizzle/meta/`

如果沒有遷移文件，需要先生成：

```bash
drizzle-kit generate
```

然後再運行遷移。

