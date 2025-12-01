import axios from 'axios';

const testGenerate = async () => {
  try {
    console.log('[Test] 開始測試圖片生成...');
    
    const response = await axios.post(
      'http://localhost:3000/api/trpc/generatedAds.generate',
      {
        originalAdId: 1,
        variantCount: 1
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTczMjY5OTU3OCwiZXhwIjoxNzMzMzA0Mzc4fQ.8RYqYxYGxQqYxYGxQqYxYGxQqYxYGxQqYxYGxQqYxY'
        },
        timeout: 180000
      }
    );
    
    console.log('[Test] 生成成功:', response.data);
  } catch (error) {
    console.error('[Test] 生成失敗:', error.message);
    if (error.response) {
      console.error('[Test] 錯誤回應:', error.response.data);
    }
  }
};

testGenerate();
