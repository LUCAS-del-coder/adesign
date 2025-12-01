import axios from "axios";

/**
 * 從錯誤回應中提取重試延遲時間（秒）
 */
function extractRetryDelay(error: any): number {
  try {
    // 檢查 RetryInfo
    const retryInfo = error.response?.data?.error?.details?.find(
      (detail: any) => detail["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
    );
    if (retryInfo?.retryDelay) {
      // retryDelay 可能是字符串格式 "40s"、"0s" 或對象
      const delay = retryInfo.retryDelay;
      if (typeof delay === "string") {
        const seconds = parseFloat(delay.replace("s", ""));
        // 如果延遲為 0 或非常小（< 1 秒），使用最小延遲
        if (isNaN(seconds) || seconds < 1) {
          return 60; // 最小 60 秒
        }
        return Math.ceil(seconds) + 5; // 加 5 秒緩衝
      } else if (typeof delay === "number") {
        return delay < 1 ? 60 : Math.ceil(delay) + 5;
      } else if (delay.seconds) {
        const seconds = parseFloat(delay.seconds);
        return seconds < 1 ? 60 : Math.ceil(seconds) + 5;
      }
    }
    
    // 檢查錯誤訊息中的重試時間
    const message = error.response?.data?.error?.message || error.message || "";
    const match = message.match(/retry in ([\d.]+)s/i);
    if (match) {
      const seconds = parseFloat(match[1]);
      // 如果延遲為 0 或非常小，使用最小延遲
      if (seconds < 1) {
        return 60;
      }
      return Math.ceil(seconds) + 5; // 加 5 秒緩衝
    }
  } catch (e) {
    // 忽略解析錯誤
  }
  
  // 默認重試延遲：60 秒（確保有足夠時間讓配額重置）
  return 60;
}

/**
 * 延遲函數
 */
function sleep(seconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

/**
 * 分析圖片並生成描述提示詞（帶重試邏輯）
 */
export async function analyzeImageWithGemini(
  imageUrl: string,
  apiKey: string,
  maxRetries: number = 3
): Promise<string> {
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
    console.log("[Gemini] 開始分析圖片:", imageUrl);
    
    // 下載圖片並轉換為 base64
    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
    });
    const base64Image = Buffer.from(imageResponse.data).toString("base64");
    const mimeType = imageResponse.headers["content-type"] || "image/png";
    
    console.log("[Gemini] 圖片下載成功, MIME 類型:", mimeType, "大小:", Math.round(base64Image.length / 1024), "KB");

    // 使用 Gemini Vision API 分析圖片
    console.log("[Gemini] 調用 Gemini API 進行圖片分析...");
    
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: `Analyze this advertisement image in detail and provide a comprehensive description in ENGLISH, including:
1. Overall visual style (color scheme, layout, design style)
2. Main elements and objects
3. Text content and placement - CRITICAL: For text translation, follow these STRICT guidelines:
   - MANDATORY: ALL text in the image MUST be identified and translated to English
   - If text is already in English: Preserve it EXACTLY as written, or suggest minor improvements if needed
   - If text is in another language (Chinese, Japanese, Korean, etc.): 
     * Translate EVERY SINGLE CHARACTER to professional, native English
     * Maintain the exact meaning and intent
     * Preserve the persuasive tone and emotional impact
     * Keep the marketing message and call-to-action strength
     * Use natural, fluent English that sounds like professional copywriting
     * NO non-English characters should remain in the translation
   - For each text element, provide:
     * Original text (if not English) in quotes
     * Professional English translation in quotes
     * Note the original language
   - Ensure ALL translations are high-quality, natural, and compelling
   - If you see ANY non-English text, you MUST translate it - do not skip any text elements
4. Composition and layout structure
5. Color palette and combinations
6. Atmosphere and emotional tone
7. Target audience and marketing message

CRITICAL REQUIREMENTS FOR TEXT TRANSLATION:
- MANDATORY: Identify and translate EVERY text element in the image
- If the image contains Chinese, Japanese, Korean, or any other non-English text, you MUST translate ALL of it
- Use professional translation services quality - natural, fluent, and compelling
- Preserve the original's impact and quality
- Write the ENTIRE description in English
- In your description, explicitly list all text elements with their English translations
- Do NOT leave any non-English text untranslated

Provide a detailed but concise description suitable for generating similar advertisement images with professional English text that maintains or improves upon the original text quality.`,
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 2048,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    console.log("[Gemini] API 回應狀態:", response.status);
    
    const analysisText =
      response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    if (!analysisText) {
      console.error("[Gemini] API 回應中沒有分析文字", JSON.stringify(response.data, null, 2));
      throw new Error("無法從 Gemini 回應中提取分析結果");
    }
    
      console.log("[Gemini] 分析成功, 提示詞長度:", analysisText.length);
      return analysisText;
    } catch (error: any) {
      lastError = error;
      console.error(`[Gemini] 圖片分析錯誤 (嘗試 ${attempt}/${maxRetries}):`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
      
      if (error.response?.data) {
        console.error("[Gemini] API 錯誤回應:", JSON.stringify(error.response.data, null, 2));
      }
      
      // 如果是配額超限錯誤 (429)，嘗試重試
      if (error.response?.status === 429 && attempt < maxRetries) {
        const retryDelay = extractRetryDelay(error);
        // 檢查是否為免費層配額已用盡（limit: 0）
        const errorData = error.response?.data?.error;
        const errorMsg = errorData?.message || "";
        const isFreeTierExhausted = errorMsg.includes("limit: 0");
        
        if (isFreeTierExhausted) {
          console.warn(`[Gemini] 免費層配額已用盡（limit: 0）。建議升級到付費計劃或等待配額重置。`);
          console.log(`[Gemini] 等待 ${retryDelay} 秒後重試 (${attempt}/${maxRetries})...`);
        } else {
          console.log(`[Gemini] 配額超限，等待 ${retryDelay} 秒後重試 (${attempt}/${maxRetries})...`);
        }
        
        await sleep(retryDelay);
        continue; // 重試
      }
      
      // 如果是其他可重試的錯誤（網絡錯誤、超時等），且還有重試次數
      if (
        (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') &&
        attempt < maxRetries
      ) {
        const retryDelay = 5 * attempt; // 指數退避：5秒、10秒、15秒
        console.log(`[Gemini] 網絡錯誤，等待 ${retryDelay} 秒後重試 (${attempt}/${maxRetries})...`);
        await sleep(retryDelay);
        continue; // 重試
      }
      
      // 如果是最後一次嘗試或不可重試的錯誤，拋出錯誤
      let errorMessage = "圖片分析失敗";
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        errorMessage += ": 請求超時，請稍後再試";
      } else if (error.response?.status === 429) {
        const errorData = error.response?.data?.error;
        const errorMsg = errorData?.message || "";
        const isFreeTierExhausted = errorMsg.includes("limit: 0");
        
        if (isFreeTierExhausted) {
          errorMessage += ": 免費層配額已用盡（limit: 0）。請升級到付費計劃以繼續使用，或等待配額重置。查看配額：https://ai.dev/usage?tab=rate-limit";
        } else {
          const retryDelay = extractRetryDelay(error);
          errorMessage += `: API 請求配額已用盡。請等待 ${retryDelay} 秒後再試，或升級您的 Gemini API 計劃`;
        }
      } else if (error.response?.data?.error?.message) {
        errorMessage += ": " + error.response.data.error.message;
      } else {
        errorMessage += ": " + error.message;
      }
      
      throw new Error(errorMessage);
    }
  }
  
  // 如果所有重試都失敗了
  throw lastError || new Error("圖片分析失敗：所有重試都失敗了");
}

/**
 * 使用 Gemini API 生成圖片（根據 Cursor 建議改進版本，帶重試邏輯）
 */
export async function generateImageWithGemini(
  options: {
    prompt: string;
    aspectRatio?: string;
    imageSize?: string;
    referenceImages?: string[];
  },
  apiKey: string,
  maxRetries: number = 3
): Promise<Buffer> {
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const {
        prompt,
        aspectRatio = "1:1",
        imageSize = "2K",
        referenceImages = [],
      } = options;

    // 準備請求內容
    const parts: any[] = [{ text: prompt }];

    // ✅ 修復 1: 參考圖片下載降級處理
    let successfulReferenceCount = 0;
    for (let idx = 0; idx < referenceImages.length; idx++) {
      const imageUrl = referenceImages[idx];
      console.log(`[Gemini] 下載參考圖片 ${idx + 1}/${referenceImages.length}:`, imageUrl);
      
      try {
        const imageResponse = await axios.get(imageUrl, {
          responseType: "arraybuffer",
          timeout: 30000, // 30秒超時
        });
        const base64Image = Buffer.from(imageResponse.data).toString("base64");
        const mimeType = imageResponse.headers["content-type"] || "image/png";
        
        // ✅ 檢查圖片大小，避免過大
        if (base64Image.length > 20 * 1024 * 1024) { // 20MB base64 約等於 15MB 原始圖片
          console.warn(`[Gemini] 參考圖片 ${idx + 1} 過大 (${Math.round(base64Image.length / 1024 / 1024)}MB)，跳過以避免 API 限制`);
          continue;
        }
        
        console.log(`[Gemini] 參考圖片 ${idx + 1} 下載成功，大小: ${Math.round(base64Image.length / 1024)}KB, mimeType: ${mimeType}`);

        parts.push({
          inline_data: {
            mime_type: mimeType,
            data: base64Image,
          },
        });
        successfulReferenceCount++;
      } catch (error: any) {
        console.warn(`[Gemini] 參考圖片 ${idx + 1} 下載失敗，將跳過此圖片繼續生成:`, {
          url: imageUrl,
          error: error.message,
          status: error.response?.status,
          code: error.code,
        });
        // ✅ 不再 throw error，而是繼續處理其他圖片
      }
    }

    // ✅ 警告信息和錯誤檢查
    if (referenceImages.length > 0 && successfulReferenceCount === 0) {
      console.error(`[Gemini] 錯誤：所有參考圖片都無法下載`);
      throw new Error("無法生成圖片：所有參考圖片都無法訪問。請重新上傳廣告圖，或確認圖片 URL 是否有效。");
    } else if (successfulReferenceCount < referenceImages.length) {
      console.warn(`[Gemini] 警告：${referenceImages.length - successfulReferenceCount} 張參考圖片無法下載，將使用 ${successfulReferenceCount} 張參考圖片生成`);
    }

    // ✅ 修復 3: 改進日誌記錄
    console.log("[Gemini] 開始生成圖片，提示詞長度:", prompt.length);
    console.log("[Gemini] 參考圖片數量:", referenceImages.length, "成功下載:", successfulReferenceCount);
    console.log("[Gemini] 請求 parts 數量:", parts.length);

    // 構建請求體
    const requestBody: any = {
      contents: [{ parts }],
    };

    // ✅ 只記錄請求體結構，不記錄完整的 base64 數據（避免日誌過大）
    const requestBodyForLog = {
      contents: [{
        parts: parts.map((part, idx) => {
          if (part.text) {
            return { text: part.text.substring(0, 100) + "..." };
          } else if (part.inline_data) {
            return { 
              inline_data: { 
                mime_type: part.inline_data.mime_type,
                data_length: part.inline_data.data?.length || 0
              } 
            };
          }
          return { type: "unknown" };
        })
      }]
    };
    console.log("[Gemini] 請求體結構:", JSON.stringify(requestBodyForLog, null, 2));

    // ✅ 修復 4: API 錯誤處理完善
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`;
    console.log("[Gemini] 調用 API:", apiUrl);

    const response = await axios.post(
      `${apiUrl}?key=${apiKey}`,
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 120000, // 120 秒超時，圖片生成需要較長時間
        validateStatus: (status) => status < 500, // ✅ 不要自動拋出 4xx 錯誤，讓我們手動處理
      }
    );

    // ✅ 手動檢查狀態碼
    if (response.status >= 400) {
      const errorData = response.data;
      console.error(`[Gemini] API 返回錯誤狀態 (嘗試 ${attempt}/${maxRetries}):`, response.status);
      console.error("[Gemini] 錯誤數據:", JSON.stringify(errorData, null, 2));
      
      // 創建錯誤對象以便重試邏輯處理
      const error: any = new Error(`API 錯誤 (${response.status})`);
      error.response = { status: response.status, data: errorData };
      
      // 如果是配額超限錯誤 (429)，讓外層重試邏輯處理
      if (response.status === 429) {
        throw error;
      }
      
      // 其他錯誤直接拋出（不重試）
      if (response.status === 400) {
        throw new Error(`API 請求錯誤 (400): ${errorData?.error?.message || "請求參數錯誤"}`);
      } else if (response.status === 403) {
        throw new Error(`API 權限錯誤 (403): ${errorData?.error?.message || "API 金鑰無權限或模型不可用"}`);
      } else if (response.status === 404) {
        throw new Error(`API 端點錯誤 (404): ${errorData?.error?.message || "模型不存在"}`);
      } else {
        throw new Error(`API 錯誤 (${response.status}): ${errorData?.error?.message || "未知錯誤"}`);
      }
    }

    console.log("[Gemini] API 回應狀態:", response.status);
    console.log("[Gemini] candidates 數量:", response.data.candidates?.length || 0);

    // ✅ 檢查是否有 candidates
    if (!response.data.candidates || response.data.candidates.length === 0) {
      console.error("[Gemini] API 回應中沒有 candidates");
      console.error("[Gemini] 完整回應:", JSON.stringify(response.data, null, 2));
      
      // ✅ 檢查是否有安全過濾器阻止
      if (response.data.promptFeedback) {
        const feedback = response.data.promptFeedback;
        if (feedback.blockReason) {
          throw new Error(`內容被安全過濾器阻止: ${feedback.blockReason}`);
        }
      }
      
      throw new Error("API 回應中沒有生成候選結果，可能是內容被過濾或模型錯誤");
    }
    
    // 簡化日誌，只輸出 parts 的結構資訊
    const partsForLog = response.data.candidates?.[0]?.content?.parts;
    if (partsForLog) {
      console.log("[Gemini] parts 數量:", partsForLog.length);
      partsForLog.forEach((part: any, idx: number) => {
        const keys = Object.keys(part);
        console.log(`[Gemini] Part ${idx} keys:`, keys);
        if (part.inline_data || part.inlineData) {
          const imageData = part.inline_data || part.inlineData;
          console.log(`[Gemini] Part ${idx} 有圖片數據, mimeType:`, imageData.mime_type || imageData.mimeType);
          console.log(`[Gemini] Part ${idx} data 長度:`, imageData.data?.length || 0);
        } else if (part.text) {
          console.log(`[Gemini] Part ${idx} 是文字內容:`, part.text.substring(0, 100));
        }
      });
    }

    // 提取生成的圖片（base64）
    const responseParts = response.data.candidates?.[0]?.content?.parts;
    
    if (!responseParts || responseParts.length === 0) {
      console.error("[Gemini] 回應中沒有 parts");
      console.error("[Gemini] 完整 candidate:", JSON.stringify(response.data.candidates[0], null, 2));
      throw new Error("未能從 Gemini 回應中提取圖片數據：回應中沒有 parts");
    }
    
    // 尋找圖片數據（同時支持 inline_data 和 inlineData 格式）
    let generatedImageData = null;
    let foundTextParts: string[] = [];
    
    for (const part of responseParts) {
      // Gemini API 可能返回 inline_data 或 inlineData
      const imageData = part.inline_data || part.inlineData;
      if (imageData?.data) {
        generatedImageData = imageData.data;
        console.log("[Gemini] 找到圖片數據，大小:", Math.round(generatedImageData.length / 1024), "KB");
        break;
      } else if (part.text) {
        foundTextParts.push(part.text);
      }
    }

    // ✅ 檢查是否返回文字而非圖片
    if (!generatedImageData && foundTextParts.length > 0) {
      console.error("[Gemini] API 返回了文字內容而非圖片:");
      foundTextParts.forEach((text, idx) => {
        console.error(`[Gemini] 文字 ${idx + 1}:`, text.substring(0, 200));
      });
      throw new Error("未能生成圖片，API 返回了文字內容而非圖片。這可能是因為模型不支持圖片生成或提示詞不當。");
    }

    if (!generatedImageData) {
      console.error("[Gemini] 所有 parts:", JSON.stringify(responseParts, null, 2));
      throw new Error("未能從 Gemini 回應中提取圖片數據");
    }

      console.log("[Gemini] 圖片生成成功");
      return Buffer.from(generatedImageData, "base64");
    } catch (error: any) {
      lastError = error;
      console.error(`[Gemini] 圖片生成錯誤 (嘗試 ${attempt}/${maxRetries}):`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
      
      // 輸出完整的錯誤回應
      if (error.response?.data) {
        console.error("[Gemini] API 錯誤回應:", JSON.stringify(error.response.data, null, 2));
      } else {
        console.error("[Gemini] 無 API 回應數據");
      }
      
      // 如果是配額超限錯誤 (429)，嘗試重試
      if (error.response?.status === 429 && attempt < maxRetries) {
        const retryDelay = extractRetryDelay(error);
        // 檢查是否為免費層配額已用盡（limit: 0）
        const errorData = error.response?.data?.error;
        const errorMsg = errorData?.message || "";
        const isFreeTierExhausted = errorMsg.includes("limit: 0");
        
        if (isFreeTierExhausted) {
          console.warn(`[Gemini] 免費層配額已用盡（limit: 0）。建議升級到付費計劃或等待配額重置。`);
          console.log(`[Gemini] 等待 ${retryDelay} 秒後重試 (${attempt}/${maxRetries})...`);
        } else {
          console.log(`[Gemini] 配額超限，等待 ${retryDelay} 秒後重試 (${attempt}/${maxRetries})...`);
        }
        
        await sleep(retryDelay);
        continue; // 重試
      }
      
      // 如果是其他可重試的錯誤（網絡錯誤、超時等），且還有重試次數
      if (
        (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') &&
        attempt < maxRetries
      ) {
        const retryDelay = 5 * attempt; // 指數退避：5秒、10秒、15秒
        console.log(`[Gemini] 網絡錯誤，等待 ${retryDelay} 秒後重試 (${attempt}/${maxRetries})...`);
        await sleep(retryDelay);
        continue; // 重試
      }
      
      // 如果是最後一次嘗試或不可重試的錯誤，拋出錯誤
      let errorMessage = "圖片生成失敗";
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        errorMessage += ": 請求超時，請稍後再試";
      } else if (error.response?.status === 429) {
        const errorData = error.response?.data?.error;
        const errorMsg = errorData?.message || "";
        const isFreeTierExhausted = errorMsg.includes("limit: 0");
        
        if (isFreeTierExhausted) {
          errorMessage += ": 免費層配額已用盡（limit: 0）。請升級到付費計劃以繼續使用，或等待配額重置。查看配額：https://ai.dev/usage?tab=rate-limit";
        } else {
          const retryDelay = extractRetryDelay(error);
          errorMessage += `: API 請求配額已用盡。請等待 ${retryDelay} 秒後再試，或升級您的 Gemini API 計劃`;
        }
      } else if (error.response?.status === 400) {
        errorMessage += ": " + (error.response?.data?.error?.message || "請求參數錯誤");
      } else if (error.response?.data?.error?.message) {
        errorMessage += ": " + error.response.data.error.message;
      } else {
        errorMessage += ": " + error.message;
      }
      
      throw new Error(`圖片生成失敗: ${errorMessage}`);
    }
  }
  
  // 如果所有重試都失敗了
  throw lastError || new Error("圖片生成失敗：所有重試都失敗了");
}

/**
 * 生成廣告圖變體（基於原始圖片和必要元素）
 * ✅ 修復 2: 批量生成部分成功處理
 */
export async function generateAdVariants(
  originalImageUrl: string,
  analysisPrompt: string,
  requiredElementUrls: string[],
  apiKey: string,
  count: number = 3
): Promise<Buffer[]> {
  const errors: string[] = [];

  // 準備參考圖片（只使用原始圖，Logo 將在後期疊加）
  const referenceImages = [originalImageUrl];
  // 注意：不再將 Logo 添加到參考圖片中，避免 Gemini 生成時包含 Logo，導致重複

  // 並行生成所有變體
  console.log(`[Gemini] 開始並行生成 ${count} 張變體圖片`);
  
  const generatePromises = Array.from({ length: count }, async (_, i) => {
    try {
      // 為每個變體定義不同的相似度要求（80%, 60%, 40%）
      const similarityLevels = [
        {
          similarity: 80,
          instruction: `Variation 1 (80% Similarity): Maintain HIGH similarity to the original image. Keep approximately 80% of the visual elements, composition, colors, and layout structure identical or very similar to the original. Make MINIMAL changes:
- Keep the same overall composition and layout structure (80% identical)
- Maintain the same color palette with only minor adjustments (80% same colors)
- Keep the same camera angle and perspective (80% same viewpoint)
- Preserve the same background style and atmosphere (80% same feel)
- Keep text elements in similar positions (80% same placement)
- Make only subtle changes: slight color adjustments, minor element repositioning, small text size variations
- The result should look very similar to the original, like a refined version with minor improvements`,
        },
        {
          similarity: 60,
          instruction: `Variation 2 (60% Similarity): Create a MODERATE variation with balanced changes. Keep approximately 60% of the visual elements similar to the original, while making noticeable but not drastic changes:
- Modify the composition and layout structure moderately (60% similar layout)
- Adjust the color palette with more noticeable changes (60% same colors, 40% new/adjusted)
- Change the camera angle or perspective to a different but related view (60% same perspective)
- Alter the background style more significantly (60% same background feel)
- Reposition text elements to different but logical areas (60% same text placement concept)
- Make moderate changes: different color saturation, varied element sizes, adjusted spacing, different text positioning
- The result should be recognizably related to the original but with clear visual differences`,
        },
        {
          similarity: 40,
          instruction: `Variation 3 (40% Similarity): Create a SIGNIFICANT variation with substantial changes. Keep approximately 40% of the core visual elements, while making major creative changes:
- Significantly modify the composition and layout structure (40% similar layout, 60% new arrangement)
- Transform the color palette with major changes (40% same colors, 60% new/adjusted colors)
- Change the camera angle or perspective dramatically (40% same perspective, 60% new viewpoint)
- Completely alter the background style and atmosphere (40% same feel, 60% new atmosphere)
- Reposition text elements to entirely different areas (40% same text concept, 60% new placement)
- Make substantial changes: different visual style, dramatic color shifts, major element repositioning, completely different text layout, new composition focus
- The result should maintain the core marketing message and brand identity but look distinctly different from the original`,
        },
      ];
      
      const similarityConfig = similarityLevels[i] || similarityLevels[2];
      const variationPrompt = similarityConfig.instruction;

      // 構建生成提示詞（使用英文，不包含 Logo，Logo 將在後期疊加）
      const prompt = `Create a high-quality advertisement image based on the following description:\n\n${analysisPrompt}\n\n${variationPrompt}\n\nCRITICAL REQUIREMENTS FOR TEXT TRANSLATION (MANDATORY - NO EXCEPTIONS):\n- MANDATORY: ALL text in the generated image MUST be in ENGLISH ONLY - NO Chinese, Japanese, Korean, or any other non-English characters\n- MANDATORY: Translate EVERY text element from the original description to professional, native English\n- MANDATORY: If the original description mentions any non-English text, you MUST translate it to English in the generated image\n- Use professional, native English marketing copy with EXCEPTIONAL quality\n- Translate with precision, maintaining the original meaning, tone, and persuasive impact\n- Use natural, fluent English that sounds like it was written by a native English copywriter\n- Ensure all marketing messages are clear, compelling, and professionally written\n- Text should be clear, legible, high-quality, and properly formatted\n- Maintain the advertising impact and persuasive tone of the original\n- Use proper English grammar, spelling, and punctuation\n- If the original text is already in English, preserve it exactly or improve it slightly\n- DO NOT generate any non-English characters - if you see Chinese, Japanese, or any other non-English text in the description, translate ALL of it to English\n- Double-check: Before finalizing the image, ensure NO non-English characters exist in any text elements\n\nFocus on creating a professional, polished advertisement with EXCEPTIONAL English text quality that matches or exceeds the original's impact. The similarity level should be approximately ${similarityConfig.similarity}% as specified above.`;

      console.log(`[Gemini] 開始生成變體 ${i + 1}/${count}`);
      const imageBuffer = await generateImageWithGemini(
        {
          prompt,
          aspectRatio: "1:1",
          imageSize: "2K",
          referenceImages,
        },
        apiKey
      );

      console.log(`[Gemini] 變體 ${i + 1}/${count} 生成成功`);
      return { success: true, buffer: imageBuffer, index: i + 1 };
    } catch (error: any) {
      const errorMsg = `變體 ${i + 1} 生成失敗: ${error.message}`;
      console.error(`[Gemini] ${errorMsg}`);
      return { success: false, error: errorMsg, index: i + 1 };
    }
  });

  // 等待所有生成完成
  const results = await Promise.all(generatePromises);

  // 提取成功的變體
  const variants = results
    .filter(r => r.success)
    .map(r => (r as any).buffer as Buffer);

  // 提取失敗的錯誤
  const failedResults = results.filter(r => !r.success);
  failedResults.forEach(r => errors.push((r as any).error));

  // 如果所有變體都失敗，拋出錯誤
  if (variants.length === 0) {
    throw new Error(`所有變體生成都失敗了。錯誤：${errors.join("; ")}`);
  }

  // 如果有部分失敗，記錄警告但返回成功的結果
  if (errors.length > 0) {
    console.warn(`[Gemini] 警告：${errors.length} 個變體生成失敗，但成功生成了 ${variants.length} 個變體`);
    console.warn(`[Gemini] 失敗詳情：${errors.join("; ")}`);
  }

  console.log(`[Gemini] 並行生成完成，成功 ${variants.length}/${count} 張`);
  return variants;
}
