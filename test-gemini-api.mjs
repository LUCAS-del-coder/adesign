import axios from 'axios';
import { config } from 'dotenv';

config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('錯誤：未找到 GEMINI_API_KEY');
  process.exit(1);
}

console.log('測試 Gemini API 圖片生成...\n');

const testPrompt = "Create a vibrant slot machine game advertisement with golden coins and bright lights";

const requestBody = {
  contents: [{
    parts: [{ text: testPrompt }]
  }]
};

console.log('請求體:', JSON.stringify(requestBody, null, 2));
console.log('\n發送請求到 Gemini API...\n');

try {
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    requestBody,
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 120000,
    }
  );

  console.log('✅ API 調用成功！');
  console.log('狀態碼:', response.status);
  console.log('\n完整回應數據:');
  console.log(JSON.stringify(response.data, null, 2));
  
  // 檢查回應結構
  console.log('\n分析回應結構:');
  console.log('candidates 存在:', !!response.data.candidates);
  console.log('candidates 數量:', response.data.candidates?.length);
  
  if (response.data.candidates && response.data.candidates.length > 0) {
    const candidate = response.data.candidates[0];
    console.log('第一個 candidate:', JSON.stringify(candidate, null, 2));
    
    if (candidate.content) {
      console.log('\ncontent.parts 數量:', candidate.content.parts?.length);
      candidate.content.parts?.forEach((part, index) => {
        console.log(`\nPart ${index}:`, Object.keys(part));
        if (part.text) {
          console.log(`  - 文字內容: ${part.text.substring(0, 100)}...`);
        }
        if (part.inline_data) {
          console.log(`  - 圖片數據大小: ${part.inline_data.data?.length || 0} bytes`);
          console.log(`  - MIME 類型: ${part.inline_data.mime_type}`);
        }
      });
    }
  }
} catch (error) {
  console.error('❌ API 調用失敗:');
  console.error('錯誤訊息:', error.message);
  if (error.response) {
    console.error('狀態碼:', error.response.status);
    console.error('回應數據:', JSON.stringify(error.response.data, null, 2));
  }
  process.exit(1);
}
