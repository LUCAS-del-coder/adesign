import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { nanoid } from "nanoid";

// 模擬用戶上下文
const mockUser = {
  id: 1,
  openId: "test-open-id",
  name: "Test User",
  avatar: "https://example.com/avatar.png",
  role: "user" as const,
  createdAt: new Date(),
};

const mockContext: TrpcContext = {
  user: mockUser,
};

describe("Logo 功能測試", () => {
  let uploadedLogoId: number;

  it("應該能夠上傳 Logo", async () => {
    const caller = appRouter.createCaller(mockContext);
    
    // 創建一個簡單的測試圖片（1x1 像素的透明 PNG）
    const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    
    const result = await caller.logos.upload({
      name: "測試 Logo",
      description: "這是一個測試用的 Logo",
      filename: "test-logo.png",
      mimeType: "image/png",
      base64Data: testImageBase64,
    });

    expect(result.success).toBe(true);
    expect(result.url).toBeDefined();
    expect(typeof result.url).toBe("string");
  });

  it("應該能夠獲取用戶的所有 Logo", async () => {
    const caller = appRouter.createCaller(mockContext);
    
    const logos = await caller.logos.list();
    
    expect(Array.isArray(logos)).toBe(true);
    expect(logos.length).toBeGreaterThan(0);
    
    // 保存第一個 Logo 的 ID 用於後續測試
    uploadedLogoId = logos[0].id;
    
    // 驗證 Logo 結構
    const logo = logos[0];
    expect(logo).toHaveProperty("id");
    expect(logo).toHaveProperty("name");
    expect(logo).toHaveProperty("fileUrl");
    expect(logo).toHaveProperty("enabled");
    expect(typeof logo.enabled).toBe("number");
  });

  it("應該能夠切換 Logo 的啟用狀態", async () => {
    const caller = appRouter.createCaller(mockContext);
    
    // 先獲取當前狀態
    const logosBefore = await caller.logos.list();
    const logoBefore = logosBefore.find(l => l.id === uploadedLogoId);
    expect(logoBefore).toBeDefined();
    
    const currentEnabled = logoBefore!.enabled === 1;
    
    // 切換狀態
    const result = await caller.logos.toggleEnabled({
      id: uploadedLogoId,
      enabled: !currentEnabled,
    });
    
    expect(result.success).toBe(true);
    expect(result.enabled).toBe(!currentEnabled);
    
    // 驗證狀態已更新
    const logosAfter = await caller.logos.list();
    const logoAfter = logosAfter.find(l => l.id === uploadedLogoId);
    expect(logoAfter).toBeDefined();
    expect(logoAfter!.enabled).toBe(!currentEnabled ? 1 : 0);
  });

  it("應該能夠刪除 Logo", async () => {
    const caller = appRouter.createCaller(mockContext);
    
    // 刪除 Logo
    const result = await caller.logos.delete({
      id: uploadedLogoId,
    });
    
    expect(result.success).toBe(true);
    
    // 驗證 Logo 已被刪除
    const logos = await caller.logos.list();
    const deletedLogo = logos.find(l => l.id === uploadedLogoId);
    expect(deletedLogo).toBeUndefined();
  });
});

describe("國家分類功能測試", () => {
  it("應該能夠上傳帶有國家分類的廣告圖", async () => {
    const caller = appRouter.createCaller(mockContext);
    
    // 創建一個簡單的測試圖片
    const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    
    const result = await caller.originalAds.upload({
      filename: "test-ad.png",
      mimeType: "image/png",
      base64Data: testImageBase64,
      country: "TW",
    });

    expect(result.success).toBe(true);
    expect(result.url).toBeDefined();
  });

  it("應該能夠獲取帶有國家信息的廣告圖列表", async () => {
    const caller = appRouter.createCaller(mockContext);
    
    const ads = await caller.originalAds.list();
    
    expect(Array.isArray(ads)).toBe(true);
    
    // 驗證廣告圖結構包含 country 欄位
    if (ads.length > 0) {
      const ad = ads[0];
      expect(ad).toHaveProperty("country");
    }
  });
});
