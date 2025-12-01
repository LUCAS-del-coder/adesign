# 最終修復方案

## 問題根源

錯誤 `TypeError [ERR_INVALID_ARG_TYPE]: The "paths[0]" argument must be of type string. Received undefined` 發生在 `file:///app/dist/index.js:1328:17`。

這是因為 `vite.config.ts` 使用了 `import.meta.dirname`，而 esbuild 在打包時會嘗試解析這個文件，導致 `import.meta.dirname` 在打包後的代碼中變成 `undefined`。

## 解決方案

已經做了以下修復：

1. ✅ 修改 `getViteConfig()` 函數，在生產環境完全不導入 `vite.config.ts`
2. ✅ 在 `package.json` 中添加 `--external` 來排除 `vite.config.ts`
3. ✅ 使用 `/* @vite-ignore */` 註釋來防止 esbuild 分析動態導入
4. ✅ 移除所有對 `import.meta.dirname` 的運行時使用

## 如果錯誤仍然存在

如果錯誤仍然存在，可能是因為：

1. **構建緩存問題**：Railway 可能使用了舊的構建緩存
   - 解決方案：在 Railway 中清除構建緩存或重新部署

2. **esbuild 仍然在分析代碼**：即使使用了 `--external`，esbuild 可能仍然會分析
   - 解決方案：檢查 `dist/index.js` 中是否還包含 `vite.config` 的引用

3. **其他文件使用了 `import.meta.dirname`**：可能有其他文件也在使用
   - 解決方案：搜索所有使用 `import.meta.dirname` 的文件

## 建議的下一步

1. 提交並推送所有更改
2. 在 Railway 中清除構建緩存（如果可能）
3. 重新部署
4. 檢查新的錯誤日誌

如果問題仍然存在，可能需要：
- 完全重寫 `vite.ts`，在生產環境完全不使用 vite
- 或者使用不同的構建工具

