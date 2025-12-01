# 快速數據庫遷移指南

## ✅ 好消息

應用已經成功啟動！現在只需要創建數據庫表。

## 🚀 快速解決方案

### 在 Railway 中運行遷移

1. **前往 Railway 專案**
   - 打開您的 Railway 專案
   - 點擊應用服務

2. **打開終端**
   - 點擊「**Deployments**」標籤頁
   - 找到最新的部署
   - 點擊部署右側的「**...**」按鈕
   - 選擇「**Open Shell**」
   
   或者：
   - 點擊「**Settings**」標籤頁
   - 找到「**Shell**」部分
   - 點擊「**Open Shell**」

3. **運行遷移命令**
   
   在終端中執行：
   ```bash
   pnpm db:migrate
   ```
   
   或者：
   ```bash
   drizzle-kit migrate
   ```

4. **等待完成**
   
   您應該會看到類似這樣的輸出：
   ```
   ✓ Migration applied successfully
   ```

5. **驗證**
   
   遷移完成後，再次嘗試登入，應該就能正常工作了！

## 📝 如果沒有終端選項

如果 Railway 沒有提供終端選項，可以：

### 方法 1：修改構建命令（臨時）

在 `railway.json` 中修改構建命令，添加遷移：

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install --no-frozen-lockfile && pnpm build && pnpm db:migrate"
  }
}
```

然後重新部署。

### 方法 2：使用 Railway CLI

如果您有 Railway CLI：

```bash
railway run pnpm db:migrate
```

## ✅ 完成後

遷移成功後，您應該能夠：
- ✅ 成功登入
- ✅ 創建用戶記錄
- ✅ 使用所有功能

## 🎉 恭喜！

一旦遷移完成，您的應用就完全可以使用了！

