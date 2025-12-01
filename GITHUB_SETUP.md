# 將代碼推送到 GitHub 的步驟

## 方法一：使用命令行（推薦）

### 步驟 1：在 GitHub 創建新倉庫

1. 前往 https://github.com
2. 登入您的帳號
3. 點擊右上角的「+」→「New repository」
4. 填寫倉庫信息：
   - **Repository name**: `ad-image-generator`（或您喜歡的名稱）
   - **Description**: 廣告圖生成工具（可選）
   - **Visibility**: 選擇 Public 或 Private
   - **不要**勾選「Initialize this repository with a README」（因為我們已有代碼）
5. 點擊「Create repository」

### 步驟 2：在本地初始化 Git 並推送

在專案目錄下執行以下命令：

```bash
# 1. 初始化 Git 倉庫
git init

# 2. 添加所有文件到暫存區
git add .

# 3. 提交代碼
git commit -m "Initial commit: 廣告圖生成工具"

# 4. 添加遠程倉庫（將 YOUR_USERNAME 和 REPO_NAME 替換為您的實際值）
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# 5. 設置主分支名稱（如果還沒有）
git branch -M main

# 6. 推送到 GitHub
git push -u origin main
```

**注意**：如果這是第一次使用 Git，可能需要先配置：

```bash
# 設置用戶名和郵箱（只需要設置一次）
git config --global user.name "您的名字"
git config --global user.email "您的郵箱"
```

### 步驟 3：如果遇到認證問題

GitHub 現在要求使用 Personal Access Token 而不是密碼：

1. 前往 GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. 點擊「Generate new token (classic)」
3. 設置權限：勾選 `repo`（完整倉庫權限）
4. 生成並複製 token
5. 推送時使用 token 作為密碼

或者使用 SSH（推薦）：

```bash
# 1. 生成 SSH 密鑰（如果還沒有）
ssh-keygen -t ed25519 -C "your_email@example.com"

# 2. 複製公鑰
cat ~/.ssh/id_ed25519.pub

# 3. 在 GitHub → Settings → SSH and GPG keys 中添加公鑰

# 4. 使用 SSH URL 添加遠程倉庫
git remote set-url origin git@github.com:YOUR_USERNAME/REPO_NAME.git
```

## 方法二：使用 GitHub Desktop（圖形界面）

1. 下載並安裝 [GitHub Desktop](https://desktop.github.com/)
2. 登入您的 GitHub 帳號
3. 點擊「File」→「Add Local Repository」
4. 選擇您的專案目錄
5. 點擊「Publish repository」
6. 填寫倉庫信息並發布

## 方法三：使用 VS Code（如果您使用 VS Code）

1. 在 VS Code 中打開專案
2. 點擊左側的「Source Control」圖標
3. 點擊「Initialize Repository」
4. 點擊「+」添加所有文件
5. 輸入提交信息並提交
6. 點擊「...」→「Publish Branch」
7. 選擇 GitHub 並創建倉庫

## 驗證推送成功

推送完成後：

1. 前往您的 GitHub 倉庫頁面
2. 確認所有文件都已上傳
3. 確認 `.gitignore` 文件正確排除了不需要的文件（如 `node_modules/`、`.env` 等）

## 後續更新代碼

當您修改代碼後，使用以下命令推送更新：

```bash
# 1. 查看變更
git status

# 2. 添加變更的文件
git add .

# 3. 提交變更
git commit -m "描述您的變更"

# 4. 推送到 GitHub
git push
```

## 重要提醒

⚠️ **不要提交敏感信息**：
- `.env` 文件（包含 API 金鑰）
- `node_modules/` 目錄
- 個人配置檔案

確認 `.gitignore` 文件已正確配置，排除這些文件。

## 常見問題

### 問題：推送時要求輸入用戶名和密碼

**解決方案**：使用 Personal Access Token 或 SSH 密鑰

### 問題：文件太大無法推送

**解決方案**：確認 `.gitignore` 已排除大文件（如 `node_modules/`、`dist/`）

### 問題：衝突錯誤

**解決方案**：
```bash
git pull origin main
# 解決衝突後
git push
```

---

**提示**：推送完成後，您就可以在 Railway 中連接這個 GitHub 倉庫進行自動部署了！

