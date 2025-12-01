# Cloudflare R2 API Token 使用最佳實踐

## 問題：已有 API Token，新專案應該如何處理？

### 選項一：沿用現有 API Token（簡單但不推薦）

**優點**：
- ✅ 不需要創建新的 Token
- ✅ 設置更快
- ✅ 管理更簡單

**缺點**：
- ❌ 如果 Token 洩露，所有使用該 Token 的專案都會受影響
- ❌ 無法針對不同專案設置不同的權限
- ❌ 如果某個專案不再需要，無法單獨撤銷該專案的訪問權限
- ❌ 不符合安全最佳實踐

### 選項二：為新專案創建新的 API Token（推薦）

**優點**：
- ✅ **安全性更高**：每個專案有獨立的 Token
- ✅ **權限隔離**：可以為不同專案設置不同的權限
- ✅ **易於管理**：可以單獨撤銷某個專案的 Token，不影響其他專案
- ✅ **符合安全最佳實踐**：最小權限原則
- ✅ **易於追蹤**：可以通過 Token 名稱識別是哪個專案在使用

**缺點**：
- ⚠️ 需要多管理一個 Token（但這其實是優點）

## 推薦做法：為新專案創建新的 API Token

### 為什麼推薦？

1. **安全隔離**：如果某個專案的 Token 洩露，不會影響其他專案
2. **權限控制**：可以為不同專案設置不同的權限範圍
3. **易於管理**：當專案不再使用時，可以單獨刪除 Token
4. **符合最佳實踐**：遵循「最小權限原則」和「職責分離」原則

### 如何創建新的 API Token？

1. 前往 Cloudflare Dashboard → R2 → Manage R2 API Tokens
2. 點擊「Create API Token」
3. 填寫信息：
   - **Token name**：使用描述性名稱，例如：`ad-image-generator-production`
   - **Permissions**：Object Read & Write
   - **Buckets**：選擇「Specific bucket」→ 選擇您為這個專案創建的新 bucket
4. 點擊「Create API Token」
5. **立即保存** Access Key ID 和 Secret Access Key

### 命名建議

為了更好地管理多個 Token，建議使用清晰的命名：

- `ad-image-generator-production` - 生產環境
- `ad-image-generator-staging` - 測試環境
- `my-other-project-production` - 其他專案

## 實際操作步驟

### 步驟 1：創建新的 Bucket

1. 前往 R2 → Create bucket
2. 輸入名稱（例如：`ad-image-generator`）
3. 創建完成

### 步驟 2：創建新的 API Token

1. 前往「Manage R2 API Tokens」
2. 點擊「Create API Token」
3. 設置：
   - **Token name**: `ad-image-generator-token`
   - **Permissions**: Object Read & Write
   - **Buckets**: 選擇您剛創建的新 bucket（**只綁定到這個 bucket**）
4. 創建並保存 Token 信息

### 步驟 3：在 Railway 中使用新 Token

使用新創建的 Token 的 Access Key ID 和 Secret Access Key 設置環境變數。

## 如果選擇沿用現有 Token

如果您決定沿用現有 Token（不推薦，但可以），請確保：

1. **檢查 Token 權限**：
   - 確認 Token 有權限訪問新創建的 bucket
   - 如果 Token 只綁定到特定 bucket，需要更新綁定

2. **更新 Token 綁定**：
   - 前往「Manage R2 API Tokens」
   - 找到您的現有 Token
   - 點擊「Edit」或「⋯」→「Edit」
   - 在「Buckets」中添加新創建的 bucket
   - 保存更改

3. **安全考慮**：
   - 確保 Token 沒有過多權限
   - 定期檢查 Token 的使用情況
   - 考慮設置 Token 過期時間

## 比較表格

| 特性 | 沿用現有 Token | 創建新 Token |
|------|---------------|------------|
| 設置速度 | ⚡ 快 | 🐢 稍慢 |
| 安全性 | ⚠️ 較低 | ✅ 較高 |
| 權限隔離 | ❌ 無 | ✅ 有 |
| 易於管理 | ⚠️ 一般 | ✅ 更好 |
| 符合最佳實踐 | ❌ 否 | ✅ 是 |
| 推薦度 | ⭐⭐ | ⭐⭐⭐⭐⭐ |

## 最終建議

**強烈建議為新專案創建新的 API Token**，原因：

1. 只需要幾分鐘時間
2. 大幅提升安全性
3. 更符合安全最佳實踐
4. 未來更容易管理

除非：
- 這是一個臨時測試專案
- 您確定不會長期使用
- 您願意承擔安全風險

## 總結

**推薦做法**：
1. ✅ 創建新的 bucket（為新專案）
2. ✅ 創建新的 API Token（只綁定到新 bucket）
3. ✅ 在 Railway 中使用新 Token 的憑證

這樣可以確保：
- 每個專案有獨立的存儲空間
- 每個專案有獨立的訪問權限
- 更好的安全性和可管理性

