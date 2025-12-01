import axios from 'axios';
import 'dotenv/config';

const apiKey = process.env.GEMINI_API_KEY;

console.log('[Test] 開始測試圖片生成...');
console.log('[Test] API Key:', apiKey?.substring(0, 10) + '...');

try {
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      contents: [{
        parts: [{
          text: "Generate a simple red circle"
        }]
      }]
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 60000,
    }
  );

  console.log('[Test] 回應狀態:', response.status);
  console.log('[Test] 完整回應:', JSON.stringify(response.data, null, 2));
  
  if (response.data.candidates) {
    console.log('[Test] Candidates 數量:', response.data.candidates.length);
    response.data.candidates.forEach((candidate, idx) => {
      console.log(`[Test] Candidate ${idx}:`, JSON.stringify(candidate, null, 2));
    });
  }
} catch (error) {
  console.error('[Test] 錯誤:', error.response?.data || error.message);
}
