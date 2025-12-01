import { describe, expect, it } from "vitest";
import axios from "axios";

describe("Gemini API Key Validation", () => {
  it("should validate GEMINI_API_KEY is set and has correct format", async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    
    // 檢查 API 金鑰是否存在
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");
    
    // 檢查 API 金鑰格式（Google API 金鑰通常以 AIza 開頭）
    expect(apiKey).toMatch(/^AIza[A-Za-z0-9_-]+$/);

    // 使用 models.list API 來驗證金鑰（這個 API 消耗較少配額）
    try {
      const response = await axios.get(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      // 檢查回應是否有效
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.models).toBeDefined();
      expect(Array.isArray(response.data.models)).toBe(true);
      
      // 確認有 Gemini 模型可用
      const hasGeminiModel = response.data.models.some((model: any) => 
        model.name && model.name.includes('gemini')
      );
      expect(hasGeminiModel).toBe(true);
      
      console.log("✓ Gemini API 金鑰驗證成功");
    } catch (error: any) {
      if (error.response?.status === 400 || error.response?.status === 403) {
        throw new Error("Invalid GEMINI_API_KEY: " + (error.response.data.error?.message || "API key is invalid"));
      }
      if (error.response?.status === 429) {
        // 速率限制錯誤表示金鑰有效，只是請求太頻繁
        console.log("✓ Gemini API 金鑰驗證成功（遇到速率限制，但金鑰有效）");
        return;
      }
      throw error;
    }
  }, 15000); // 15秒超時
});
