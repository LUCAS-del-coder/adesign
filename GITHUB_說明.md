# GitHub 用戶名和倉庫名稱說明

## 什麼是 GitHub Username（用戶名）？

**GitHub Username** 是您在 GitHub 上的帳號名稱。

### 如何查看您的 GitHub Username？

1. 登入 GitHub (https://github.com)
2. 點擊右上角的頭像
3. 您的用戶名會顯示在個人資料中
4. 或者查看網址：`https://github.com/YOUR_USERNAME` ← 這裡的 `YOUR_USERNAME` 就是您的用戶名

### 範例：
- 如果您的 GitHub 網址是 `https://github.com/john-doe`，那麼用戶名就是 `john-doe`
- 如果您的 GitHub 網址是 `https://github.com/idea3c`，那麼用戶名就是 `idea3c`

---

## 什麼是 Repository Name（倉庫名稱）？

**Repository Name** 是您要在 GitHub 上創建的專案倉庫的名稱。

### 如何選擇倉庫名稱？

您可以自由選擇任何名稱，建議：
- 使用英文和連字號（hyphen）
- 簡潔且描述性
- 例如：`ad-image-generator`、`my-ad-tool`、`ad-generator`

### 範例：
- `ad-image-generator` ← 這是一個倉庫名稱
- `my-project` ← 這也是一個倉庫名稱
- `ad-tool-2024` ← 這也是一個倉庫名稱

---

## 完整範例

假設：
- **Username（用戶名）**: `idea3c`
- **Repository Name（倉庫名）**: `ad-image-generator`

那麼完整的 GitHub 倉庫網址會是：
```
https://github.com/idea3c/ad-image-generator
```

對應的命令會是：
```bash
git remote add origin https://github.com/idea3c/ad-image-generator.git
```

---

## 如何創建新倉庫？

1. 前往 https://github.com 並登入
2. 點擊右上角的「+」按鈕
3. 選擇「New repository」
4. 在「Repository name」欄位輸入您想要的倉庫名稱（例如：`ad-image-generator`）
5. 選擇 Public 或 Private
6. **不要**勾選「Initialize this repository with a README」
7. 點擊「Create repository」

創建完成後，GitHub 會顯示倉庫的網址，您就可以看到完整的 URL 了！

---

## 快速檢查清單

在執行 `git push` 之前，請確認：

- [ ] 您知道您的 GitHub 用戶名
- [ ] 您已經在 GitHub 上創建了新倉庫
- [ ] 您知道倉庫的名稱
- [ ] 您有倉庫的完整 URL（例如：`https://github.com/username/repo-name`）

