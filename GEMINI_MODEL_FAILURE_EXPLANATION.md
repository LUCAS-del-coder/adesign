# Gemini 模型失敗原因說明

## 問題分析

根據您的日誌，前兩個模型失敗的原因如下：

### 1. `gemini-3-pro-image` - 404 錯誤

**錯誤訊息：**
```
models/gemini-3-pro-image is not found for API version v1beta, or is not supported for generateContent
```

**失敗原因：**
- 該模型名稱在 Google Gemini API v1beta 版本中不存在
- 或者該模型不支持 `generateContent` 方法（圖片生成）
- 可能是模型名稱錯誤，或該模型尚未發布到 v1beta API

### 2. `gemini-3.0-pro-image` - 404 錯誤

**錯誤訊息：**
```
models/gemini-3.0-pro-image is not found for API version v1beta, or is not supported for generateContent
```

**失敗原因：**
- 與第一個模型相同，該模型名稱在 v1beta API 中不存在
- 可能是命名錯誤（應該是 `gemini-3-pro-image` 而不是 `gemini-3.0-pro-image`）
- 或者該模型尚未在 v1beta API 中可用

### 3. `gemini-3-pro-image-preview` - ✅ 成功

**成功原因：**
- 這是目前 v1beta API 中可用的 Gemini 3 Pro Image 預覽版本
- 支持 `generateContent` 方法進行圖片生成
- 這是目前可用的最強圖片生成模型

## 為什麼會這樣？

### 可能的原因：

1. **模型命名不一致**
   - Google 可能使用不同的命名規則
   - `gemini-3-pro-image` 可能是內部名稱，公開 API 使用 `gemini-3-pro-image-preview`

2. **API 版本差異**
   - v1beta API 可能只提供預覽版本的模型
   - 正式版本可能使用不同的 API 端點或版本

3. **模型發布狀態**
   - `gemini-3-pro-image` 可能還在測試階段
   - 只有 `-preview` 版本在 v1beta 中可用

4. **功能支持差異**
   - 某些模型可能不支持圖片生成功能
   - 只支持文字生成或其他功能

## 當前解決方案

系統已經實現了自動降級機制：
1. 首先嘗試 `gemini-3-pro-image`（如果設置了環境變量）
2. 如果失敗，自動降級到 `gemini-3-pro-image-preview`（可用）
3. 如果還是失敗，降級到 `gemini-2.5-flash-image`（穩定版本）

## 如何查看可用的模型？

### 方法 1：使用 Google AI Studio
訪問：https://aistudio.google.com/
- 查看模型列表
- 確認哪些模型支持圖片生成

### 方法 2：使用 ListModels API
可以調用 Google Gemini API 的 `listModels` 端點來查看所有可用模型：

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY"
```

### 方法 3：查看官方文檔
- Google AI Studio 文檔
- Gemini API 參考文檔

## 建議

1. **繼續使用 `gemini-3-pro-image-preview`**
   - 這是目前可用的最強模型
   - 已經成功生成圖片

2. **監控 Google 的更新**
   - 當正式版本發布時，模型名稱可能會改變
   - 可以通過環境變量 `GEMINI_IMAGE_MODEL` 快速切換

3. **如果發現新的可用模型**
   - 在 Railway 設置環境變量 `GEMINI_IMAGE_MODEL=新模型名稱`
   - 系統會優先使用該模型

## 總結

- `gemini-3-pro-image` 和 `gemini-3.0-pro-image` 在 v1beta API 中不存在
- `gemini-3-pro-image-preview` 是目前可用的最強模型
- 系統已實現自動降級，確保始終使用可用的模型

