import sharp from 'sharp';
import axios from 'axios';

/**
 * 下載圖片並返回 Buffer
 */
async function downloadImage(url: string): Promise<Buffer> {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}

/**
 * 將 Logo 疊加到圖片的右下角
 * @param imageBuffer 原始圖片的 Buffer
 * @param logoUrls Logo 圖片的 URL 陣列
 * @param logoSize Logo 的大小（像素），默認為原圖寬度的 15%
 * @param margin 距離邊緣的邊距（像素），默認為 20
 * @returns 處理後的圖片 Buffer
 */
export async function overlayLogos(
  imageBuffer: Buffer,
  logoUrls: string[],
  logoSize?: number,
  margin: number = 20
): Promise<Buffer> {
  if (logoUrls.length === 0) {
    return imageBuffer;
  }

  // 獲取原圖的元數據
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const imageWidth = metadata.width || 1024;
  const imageHeight = metadata.height || 1024;

  // 計算 Logo 大小（默認為圖片寬度的 15%）
  const calculatedLogoSize = logoSize || Math.floor(imageWidth * 0.15);

  // 下載並處理所有 Logo
  const logoBuffers: Buffer[] = [];
  for (const logoUrl of logoUrls) {
    try {
      const logoBuffer = await downloadImage(logoUrl);
      
      // 調整 Logo 大小並確保有透明背景
      const resizedLogo = await sharp(logoBuffer)
        .resize(calculatedLogoSize, calculatedLogoSize, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer();
      
      logoBuffers.push(resizedLogo);
    } catch (error) {
      console.error(`[Logo Overlay] Failed to download/process logo: ${logoUrl}`, error);
      // 跳過失敗的 Logo，繼續處理其他的
    }
  }

  if (logoBuffers.length === 0) {
    console.warn('[Logo Overlay] No logos could be processed, returning original image');
    return imageBuffer;
  }

  // 計算 Logo 的位置（右下角）
  // 如果有多個 Logo，水平排列
  const totalLogoWidth = calculatedLogoSize * logoBuffers.length + margin * (logoBuffers.length - 1);
  const startX = imageWidth - totalLogoWidth - margin;
  const startY = imageHeight - calculatedLogoSize - margin;

  // 創建合成配置
  const compositeConfig = logoBuffers.map((logoBuffer, index) => ({
    input: logoBuffer,
    left: startX + (calculatedLogoSize + margin) * index,
    top: startY,
  }));

  // 合成圖片
  const result = await image
    .composite(compositeConfig)
    .png()
    .toBuffer();

  console.log(`[Logo Overlay] Successfully overlaid ${logoBuffers.length} logo(s) on image`);
  return result;
}

/**
 * 批量處理圖片，為每張圖片添加 Logo
 */
export async function batchOverlayLogos(
  imageBuffers: Buffer[],
  logoUrls: string[]
): Promise<Buffer[]> {
  const results: Buffer[] = [];
  
  for (const imageBuffer of imageBuffers) {
    const processed = await overlayLogos(imageBuffer, logoUrls);
    results.push(processed);
  }
  
  return results;
}
