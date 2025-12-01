# Gemini 圖片生成模型配置指南

## 概述

根據 Grok 的說明，Gemini 3 Pro Image（Banana Pro）應該可以使用相同的 Gemini API key 訪問。系統現在支持通過環境變量配置不同的模型。

## 配置方法

在 Railway 的環境變量中添加：

```
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
```

## 可嘗試的模型名稱

根據 Grok 的說明和 Google Gemini API 的命名慣例，您可以嘗試以下模型名稱：

### 1. 穩定版本（目前使用）
```
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
```

### 2. Gemini 3 Pro Image（如果可用）
```
GEMINI_IMAGE_MODEL=gemini-3-pro-image
```

### 3. 其他可能的命名
```
GEMINI_IMAGE_MODEL=gemini-3.0-pro-image
GEMINI_IMAGE_MODEL=gemini-3-pro-image-preview
GEMINI_IMAGE_MODEL=gemini-3.0-pro-image-preview
```

## 如何測試

1. **在 Railway 添加環境變量**：
   - 進入 Railway 項目設置
   - 添加環境變量 `GEMINI_IMAGE_MODEL`
   - 設置值為您想嘗試的模型名稱（例如：`gemini-3-pro-image`）
   - 保存並重新部署

2. **查看日誌**：
   - 部署後，查看 Railway 日誌
   - 查找 `[Gemini] 使用模型: xxx` 的日誌
   - 如果模型不存在，會看到 404 錯誤

3. **如果模型可用**：
   - 系統會自動使用新模型生成圖片
   - 您應該會看到更好的生成效果

## 注意事項

- **API Key**：所有 Gemini 模型使用相同的 API key（`GEMINI_API_KEY`）
- **模型可用性**：不是所有模型名稱都可用，需要通過測試確認
- **錯誤處理**：如果模型不存在，系統會顯示 404 錯誤，您可以嘗試其他模型名稱

## 推薦測試順序

1. 首先嘗試：`gemini-3-pro-image`
2. 如果失敗，嘗試：`gemini-3.0-pro-image`
3. 如果還是失敗，嘗試：`gemini-3-pro-image-preview`
4. 如果都失敗，繼續使用：`gemini-2.5-flash-image`（穩定版本）

## 查看可用模型

如果您想查看所有可用的模型，可以訪問：
- Google AI Studio: https://aistudio.google.com/
- 查看模型列表和文檔

## 問題排查

如果遇到 404 錯誤：
- 檢查模型名稱是否正確
- 確認您的 API key 有權限訪問該模型
- 查看 Railway 日誌中的詳細錯誤信息

