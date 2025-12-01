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
                text: `Analyze this advertisement image in detail and provide a comprehensive description in ENGLISH. This description will be used to generate new advertisement images, so it must be COMPLETE and ACCURATE.

=== ANALYSIS REQUIREMENTS ===

1. Overall visual style (color scheme, layout, design style)
2. Main elements and objects (products, people, graphics, etc.)
3. Composition and layout structure
4. Color palette and combinations
5. Atmosphere and emotional tone
6. Target audience and marketing message

=== CRITICAL TEXT ANALYSIS SECTION (MOST IMPORTANT - DO NOT SKIP) ===

⚠️ WARNING: If you miss ANY text or leave ANY non-English text untranslated, the generated images will be UNUSABLE.

For ALL text in the image, you MUST follow these STRICT steps:

STEP 1: IDENTIFY ALL TEXT ELEMENTS (MANDATORY)
- Scan the ENTIRE image pixel by pixel for ANY text
- Look for: headlines, subheadings, body text, captions, labels, buttons, tags, watermarks, logos with text, etc.
- List EVERY text element you find, no matter how small or in what language
- Count the total number of text elements
- Do NOT skip any text - missing even one character is UNACCEPTABLE

STEP 2: TRANSLATE ALL NON-ENGLISH TEXT (MANDATORY)
- For each text element that is NOT in English:
  * Write: "ORIGINAL TEXT: [exact text in original language - copy it character by character]"
  * Write: "ENGLISH TRANSLATION: [professional English translation - this is what MUST appear in generated images]"
  * Write: "ORIGINAL LANGUAGE: [language name]"
  * Write: "POSITION: [where in the image - top, bottom, left, right, center, etc.]"
- For text that IS already in English:
  * Write: "TEXT: [exact English text]"
  * Write: "POSITION: [where in the image]"
  * Note: "Already in English, use this exact text in generated images"

STEP 3: PROVIDE COMPLETE TEXT LIST (MANDATORY FORMAT)
You MUST format your text analysis EXACTLY like this:
---
COMPLETE TEXT ELEMENTS LIST (ALL TEXT IN IMAGE):
1. POSITION: [location] | ORIGINAL: "[original text]" | ENGLISH: "[translation]" | LANGUAGE: [language]
2. POSITION: [location] | TEXT: "[English text]" | NOTE: Already in English
3. POSITION: [location] | ORIGINAL: "[original text]" | ENGLISH: "[translation]" | LANGUAGE: [language]
[Continue for ALL text elements - do not stop until you have listed EVERY text element]
TOTAL TEXT ELEMENTS FOUND: [number]
---

STEP 4: CREATE ENGLISH-ONLY TEXT LIST FOR GENERATION
After listing all text, create a separate section with ONLY the English text that must appear:
---
MANDATORY ENGLISH TEXT FOR GENERATED IMAGES (USE THESE EXACT TEXTS):
1. "[English text 1]" - Position: [location]
2. "[English text 2]" - Position: [location]
3. "[English text 3]" - Position: [location]
[Continue for all text elements]
---

STEP 5: QUALITY REQUIREMENTS FOR TRANSLATIONS
- Use professional, native English marketing copy
- Maintain exact meaning and intent
- Preserve persuasive tone and emotional impact
- Keep marketing message and call-to-action strength
- Natural, fluent English that sounds like professional copywriting
- High-quality, compelling, and professionally written
- If original is already English, preserve it exactly

=== ABSOLUTE CRITICAL RULES ===
- MANDATORY: Identify and translate EVERY text element - missing even one is a CRITICAL FAILURE
- MANDATORY: If you see Chinese, Japanese, Korean, Arabic, or ANY non-English text, translate ALL of it
- MANDATORY: List ALL text elements explicitly with their English translations
- MANDATORY: Do NOT leave any non-English text untranslated - ZERO tolerance
- MANDATORY: Write the ENTIRE description in English
- MANDATORY: Create the "MANDATORY ENGLISH TEXT FOR GENERATED IMAGES" section with exact English texts

=== OUTPUT FORMAT ===

Provide your analysis in this EXACT structure:

VISUAL ANALYSIS:
[Describe visual elements, colors, composition, etc. - in English only]

COMPLETE TEXT ELEMENTS LIST (ALL TEXT IN IMAGE):
[Format as specified in STEP 3 - list EVERY text element]

MANDATORY ENGLISH TEXT FOR GENERATED IMAGES (USE THESE EXACT TEXTS):
[Format as specified in STEP 4 - list ONLY English texts that must appear]

MARKETING MESSAGE:
[Describe the marketing message and target audience - in English only]

GENERATION INSTRUCTIONS:
[Provide clear instructions for generating similar images - emphasize that ONLY the English texts from the "MANDATORY ENGLISH TEXT" section should appear]

Remember: The text analysis section is CRITICAL. If you miss ANY text or leave ANY non-English text, the generated images will be UNUSABLE. Be thorough and complete.`,
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
    // 使用傳入的模型列表，選擇第一個可用的模型
    const modelName = modelList[0] || "gemini-2.5-flash-image";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
    console.log(`[Gemini] 嘗試使用模型: ${modelName} (${modelList.length} 個候選模型)`);
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
      
      // 如果是 404 錯誤（模型不存在），嘗試降級到更穩定的模型
      if (response.status === 404 && attempt === 1 && modelList.length > 1) {
        const currentModelIndex = modelList.indexOf(modelName);
        if (currentModelIndex < modelList.length - 1) {
          const fallbackModels = modelList.slice(currentModelIndex + 1);
          console.warn(`[Gemini] 模型 ${modelName} 不可用，嘗試降級到: ${fallbackModels.join(", ")}`);
          // 遞歸調用，使用降級模型列表
          return generateImageWithGemini(
            { ...options },
            apiKey,
            maxRetries,
            fallbackModels
          );
        }
      }
      
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
      // 使用更強制性和對比性的語言來確保明顯差異
      const similarityLevels = [
        {
          similarity: 80,
          instruction: `=== VARIATION 1: 80% SIMILARITY (MINIMAL CHANGES) ===
CRITICAL: This variation must be VERY SIMILAR to the original (80% identical). Make ONLY MINIMAL, SUBTLE changes.

STRICT REQUIREMENTS:
- COMPOSITION: Keep 80% identical - same layout structure, same element positions, same arrangement
- COLORS: Keep 80% same colors - only make tiny adjustments (slightly brighter/darker, minor saturation tweaks)
- PERSPECTIVE: Keep 80% same camera angle - same viewpoint, same angle, same distance
- BACKGROUND: Keep 80% same background - same style, same atmosphere, same feel
- TEXT POSITION: Keep 80% same text placement - text in similar positions, similar sizes
- CHANGES ALLOWED: Only VERY subtle changes - tiny color tweaks, minor text size adjustments, slight element repositioning (less than 10% movement)
- RESULT: Should look almost identical to original, like a refined/optimized version

DO NOT make significant changes. This should be the MOST SIMILAR variation.`,
        },
        {
          similarity: 60,
          instruction: `=== VARIATION 2: 60% SIMILARITY (MODERATE CHANGES) ===
CRITICAL: This variation must be MODERATELY DIFFERENT from the original (60% similar, 40% different). Make NOTICEABLE but not drastic changes.

STRICT REQUIREMENTS:
- COMPOSITION: Modify 40% - change layout structure moderately, rearrange some elements to different positions (30-50% movement)
- COLORS: Change 40% - adjust color palette noticeably (different saturation, different brightness, some color shifts)
- PERSPECTIVE: Change 40% - use a different but related camera angle (side view instead of front, slightly different angle)
- BACKGROUND: Change 40% - alter background style more significantly (different texture, different gradient, different pattern)
- TEXT POSITION: Change 40% - move text to different but logical areas (top to bottom, left to right, different sizes)
- CHANGES REQUIRED: Make MODERATE changes - different color treatment, varied element sizes, adjusted spacing, different text positioning
- RESULT: Should be recognizably related but with CLEAR visual differences

This should be VISIBLY DIFFERENT from Variation 1. Make sure the changes are noticeable.`,
        },
        {
          similarity: 40,
          instruction: `=== VARIATION 3: 40% SIMILARITY (MAJOR CHANGES) ===
CRITICAL: This variation must be SIGNIFICANTLY DIFFERENT from the original (40% similar, 60% different). Make MAJOR creative changes.

STRICT REQUIREMENTS:
- COMPOSITION: Change 60% - significantly modify layout structure, completely rearrange elements (50-70% movement, new arrangement)
- COLORS: Change 60% - transform color palette dramatically (different color scheme, different temperature, major color shifts)
- PERSPECTIVE: Change 60% - use a dramatically different camera angle (top-down instead of front, close-up instead of wide, completely different viewpoint)
- BACKGROUND: Change 60% - completely alter background style and atmosphere (solid to gradient, pattern to texture, different mood)
- TEXT POSITION: Change 60% - reposition text to entirely different areas (opposite sides, different layout, different sizes, different arrangement)
- CHANGES REQUIRED: Make SUBSTANTIAL changes - different visual style, dramatic color shifts, major element repositioning, completely different text layout, new composition focus
- RESULT: Should maintain core marketing message but look DISTINCTLY DIFFERENT from original

This should be the MOST DIFFERENT variation. Make sure it looks significantly different from both the original and Variations 1 & 2.`,
        },
      ];
      
      const similarityConfig = similarityLevels[i] || similarityLevels[2];
      const variationPrompt = similarityConfig.instruction;

      // 從分析結果中提取所有必須使用的英文文字
      // 嘗試從分析結果中提取 "MANDATORY ENGLISH TEXT FOR GENERATED IMAGES" 部分
      let mandatoryEnglishTexts = "";
      const mandatoryTextMatch = analysisPrompt.match(/MANDATORY ENGLISH TEXT FOR GENERATED IMAGES[^\n]*:([\s\S]*?)(?=MARKETING MESSAGE|GENERATION INSTRUCTIONS|$)/i);
      if (mandatoryTextMatch) {
        mandatoryEnglishTexts = mandatoryTextMatch[1].trim();
        console.log(`[Gemini] 從分析結果中提取到必須使用的英文文字:`, mandatoryEnglishTexts.substring(0, 200));
      } else {
        // 如果沒有找到，嘗試從 "COMPLETE TEXT ELEMENTS LIST" 中提取英文翻譯
        const textListMatch = analysisPrompt.match(/COMPLETE TEXT ELEMENTS LIST[^\n]*:([\s\S]*?)(?=MANDATORY ENGLISH TEXT|MARKETING MESSAGE|GENERATION INSTRUCTIONS|$)/i);
        if (textListMatch) {
          const textList = textListMatch[1];
          // 提取所有 "ENGLISH: [text]" 或 "TEXT: [text]" 的部分
          const englishTexts = textList.match(/(?:ENGLISH|TEXT):\s*"([^"]+)"/gi) || [];
          if (englishTexts.length > 0) {
            mandatoryEnglishTexts = englishTexts.map((t, i) => `${i + 1}. ${t.replace(/^(?:ENGLISH|TEXT):\s*"/i, '').replace(/"$/, '')}`).join('\n');
            console.log(`[Gemini] 從文字列表中提取到 ${englishTexts.length} 個英文文字`);
          }
        }
      }

      // 構建生成提示詞（使用英文，不包含 Logo，Logo 將在後期疊加）
      // 極度強化文字轉換要求，並明確列出必須使用的英文文字
      const textRequirementsSection = mandatoryEnglishTexts 
        ? `\n\n=== MANDATORY ENGLISH TEXTS TO USE (COPY THESE EXACTLY) ===\n\nThe following English texts MUST appear in the generated image. Use these EXACT texts - do not modify, do not translate, do not change:\n\n${mandatoryEnglishTexts}\n\nCRITICAL: These are the ONLY texts that should appear in the image. Do NOT add any other text. Do NOT use any non-English characters.`
        : `\n\n=== MANDATORY TEXT REQUIREMENTS ===\n\n⚠️ CRITICAL: The analysis above contains text elements. You MUST:\n1. Find ALL text elements mentioned in the description\n2. Use ONLY their English translations\n3. Do NOT use any original non-English text\n4. Every single character in the image must be English`;

      const prompt = `Create a high-quality advertisement image based on the following description:\n\n${analysisPrompt}\n\n${variationPrompt}${textRequirementsSection}\n\n=== ABSOLUTE MANDATORY TEXT REQUIREMENTS (ZERO TOLERANCE) ===\n\n🚫 CRITICAL RULES - NO EXCEPTIONS:\n1. ALL text in the generated image MUST be in ENGLISH ONLY\n2. ZERO tolerance for ANY non-English characters (Chinese, Japanese, Korean, Arabic, etc.)\n3. If the description mentions any non-English text, you MUST use its English translation\n4. Every single character, word, and sentence must be English\n5. Do NOT mix languages - it's either ALL English or the image is UNUSABLE\n\n📋 TEXT USAGE PROCESS:\n1. Review the "MANDATORY ENGLISH TEXTS TO USE" section above (if provided)\n2. Use ONLY those exact English texts in the generated image\n3. If no mandatory texts are listed, extract ALL English translations from the description\n4. Place texts in appropriate positions matching the original layout\n5. Before generating, verify: "Will ALL text in this image be English?"\n6. If ANY text might not be English, DO NOT generate - fix it first\n\n✅ TEXT QUALITY REQUIREMENTS:\n- Professional, native English marketing copy\n- Clear, compelling, and professionally written\n- Proper English grammar, spelling, and punctuation\n- High-quality, legible, and properly formatted\n- Maintains advertising impact and persuasive tone\n\n🔍 FINAL VERIFICATION:\nBefore finalizing the image, ask yourself:\n- "Are ALL text elements in English?" → Must be YES\n- "Are there ANY non-English characters?" → Must be NO\n- "Did I use the exact English texts from the mandatory list?" → Must be YES\n\nIf ANY answer is wrong, DO NOT generate the image. Fix it first.\n\n=== END OF TEXT REQUIREMENTS ===\n\nFocus on creating a professional, polished advertisement with EXCEPTIONAL English text quality. The similarity level must be approximately ${similarityConfig.similarity}% as strictly specified above. Remember: The image is UNUSABLE if it contains ANY non-English text.`;

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
