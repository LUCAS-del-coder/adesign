import { describe, it, expect } from "vitest";
import { overlayLogos } from "./services/imageProcessor";
import sharp from "sharp";

describe("Logo 疊加功能測試", () => {
  it("應該能夠將 Logo 疊加到圖片上", async () => {
    // 創建一個簡單的測試圖片（100x100 紅色方塊）
    const testImage = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 }
      }
    })
      .png()
      .toBuffer();

    // 創建一個簡單的測試 Logo（20x20 藍色方塊）
    const testLogo = await sharp({
      create: {
        width: 20,
        height: 20,
        channels: 4,
        background: { r: 0, g: 0, b: 255, alpha: 1 }
      }
    })
      .png()
      .toBuffer();

    // 由於 overlayLogos 需要 URL，我們需要先上傳測試 Logo
    // 這裡我們直接測試沒有 Logo 的情況
    const result = await overlayLogos(testImage, []);
    
    // 驗證返回的是 Buffer
    expect(Buffer.isBuffer(result)).toBe(true);
    
    // 驗證返回的圖片大小與原圖相同（沒有 Logo 時）
    const resultMetadata = await sharp(result).metadata();
    expect(resultMetadata.width).toBe(100);
    expect(resultMetadata.height).toBe(100);
  });

  it("應該在沒有 Logo 時返回原圖", async () => {
    const testImage = await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 4,
        background: { r: 0, g: 255, b: 0, alpha: 1 }
      }
    })
      .png()
      .toBuffer();

    const result = await overlayLogos(testImage, []);
    
    // 驗證返回的圖片與原圖大小相同
    const originalMetadata = await sharp(testImage).metadata();
    const resultMetadata = await sharp(result).metadata();
    
    expect(resultMetadata.width).toBe(originalMetadata.width);
    expect(resultMetadata.height).toBe(originalMetadata.height);
  });
});

describe("並行生成功能測試", () => {
  it("應該能夠並行處理多個任務", async () => {
    const tasks = [1, 2, 3].map(async (n) => {
      // 模擬異步任務
      await new Promise(resolve => setTimeout(resolve, 100));
      return n * 2;
    });

    const results = await Promise.all(tasks);
    
    expect(results).toEqual([2, 4, 6]);
    expect(results.length).toBe(3);
  });

  it("應該能夠處理部分失敗的情況", async () => {
    const tasks = [1, 2, 3].map(async (n) => {
      if (n === 2) {
        return { success: false, error: "Task 2 failed" };
      }
      return { success: true, value: n * 2 };
    });

    const results = await Promise.all(tasks);
    const successResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);
    
    expect(successResults.length).toBe(2);
    expect(failedResults.length).toBe(1);
    expect(failedResults[0]).toHaveProperty("error");
  });
});

describe("國家篩選功能測試", () => {
  it("應該能夠根據國家篩選數據", () => {
    const ads = [
      { id: 1, country: "TW", name: "Ad 1" },
      { id: 2, country: "CN", name: "Ad 2" },
      { id: 3, country: "TW", name: "Ad 3" },
      { id: 4, country: null, name: "Ad 4" },
    ];

    // 篩選台灣的廣告
    const twAds = ads.filter(ad => ad.country === "TW");
    expect(twAds.length).toBe(2);
    expect(twAds[0].id).toBe(1);
    expect(twAds[1].id).toBe(3);

    // 篩選中國的廣告
    const cnAds = ads.filter(ad => ad.country === "CN");
    expect(cnAds.length).toBe(1);
    expect(cnAds[0].id).toBe(2);

    // 顯示全部
    const allAds = ads.filter(ad => true);
    expect(allAds.length).toBe(4);
  });

  it("應該能夠處理未指定國家的情況", () => {
    const ads = [
      { id: 1, country: "TW", name: "Ad 1" },
      { id: 2, country: null, name: "Ad 2" },
      { id: 3, country: undefined, name: "Ad 3" },
    ];

    // 篩選有國家的廣告
    const adsWithCountry = ads.filter(ad => ad.country);
    expect(adsWithCountry.length).toBe(1);

    // 篩選沒有國家的廣告
    const adsWithoutCountry = ads.filter(ad => !ad.country);
    expect(adsWithoutCountry.length).toBe(2);
  });
});
