import axios from 'axios';
import 'dotenv/config';
import fs from 'fs';

const apiKey = process.env.GEMINI_API_KEY;

console.log('[Test] 開始測試圖片生成 JSON 結構...');

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
  
  // 將完整回應保存到文件
  const jsonStr = JSON.stringify(response.data, null, 2);
  
  // 只顯示前 2000 字符的結構
  console.log('[Test] 回應結構（前2000字符）:');
  console.log(jsonStr.substring(0, 2000));
  
  // 保存完整 JSON 到文件
  fs.writeFileSync('/home/ubuntu/gemini-response.json', jsonStr);
  console.log('[Test] 完整回應已保存到 /home/ubuntu/gemini-response.json');
  
  // 檢查 candidates 結構
  if (response.data.candidates && response.data.candidates.length > 0) {
    const candidate = response.data.candidates[0];
    console.log('\n[Test] Candidate keys:', Object.keys(candidate));
    
    if (candidate.content) {
      console.log('[Test] Content keys:', Object.keys(candidate.content));
      
      if (candidate.content.parts && candidate.content.parts.length > 0) {
        const part = candidate.content.parts[0];
        console.log('[Test] Part keys:', Object.keys(part));
        
        if (part.inlineData) {
          console.log('[Test] InlineData keys:', Object.keys(part.inlineData));
          console.log('[Test] MIME type:', part.inlineData.mimeType);
          console.log('[Test] Data length:', part.inlineData.data?.length || 0);
        }
      }
    }
  }
} catch (error) {
  console.error('[Test] 錯誤:', error.response?.data || error.message);
}
