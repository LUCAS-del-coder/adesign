import { describe, expect, it } from "vitest";
import axios from "axios";

describe("Gemini API Key Validation", () => {
  it("should validate the new API key with a simple text generation request", async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    // 使用最簡單的文字生成來驗證 API 金鑰
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [{
          parts: [{ text: "Say hello" }]
        }]
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    expect(response.status).toBe(200);
    expect(response.data.candidates).toBeDefined();
    expect(response.data.candidates.length).toBeGreaterThan(0);
    
    console.log("[Test] API 金鑰驗證成功！");
    console.log("[Test] 回應:", response.data.candidates[0]?.content?.parts[0]?.text);
  }, 15000); // 15 秒超時
});
