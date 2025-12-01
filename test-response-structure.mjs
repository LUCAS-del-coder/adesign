import axios from 'axios';
import { config } from 'dotenv';
import { writeFileSync } from 'fs';

config();

const apiKey = process.env.GEMINI_API_KEY;
const testPrompt = "A golden slot machine";

const requestBody = {
  contents: [{
    parts: [{ text: testPrompt }]
  }]
};

console.log('發送請求...\n');

try {
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    requestBody,
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 120000,
    }
  );

  console.log('✅ 成功！\n');
  
  // 保存完整回應到文件
  writeFileSync('/home/ubuntu/gemini-response.json', JSON.stringify(response.data, null, 2));
  console.log('完整回應已保存到 /home/ubuntu/gemini-response.json\n');
  
  // 分析結構
  const candidates = response.data.candidates;
  console.log('candidates 數量:', candidates?.length);
  
  if (candidates && candidates.length > 0) {
    const parts = candidates[0].content?.parts;
    console.log('parts 數量:', parts?.length);
    
    parts?.forEach((part, i) => {
      console.log(`\nPart ${i}:`);
      console.log('  Keys:', Object.keys(part));
      if (part.text) console.log('  有文字');
      if (part.inline_data) {
        console.log('  有圖片數據');
        console.log('  MIME:', part.inline_data.mime_type);
        console.log('  大小:', part.inline_data.data?.length, 'bytes');
        
        // 保存圖片
        const buffer = Buffer.from(part.inline_data.data, 'base64');
        writeFileSync('/home/ubuntu/generated-image.png', buffer);
        console.log('  ✅ 圖片已保存到 /home/ubuntu/generated-image.png');
      }
    });
  }
} catch (error) {
  console.error('❌ 錯誤:', error.message);
  if (error.response) {
    console.error('狀態:', error.response.status);
    console.error('數據:', error.response.data);
  }
}
