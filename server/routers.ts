import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { 
  createOriginalAd, 
  getOriginalAdsByUserId, 
  getOriginalAdById,
  updateOriginalAdAnalysis,
  createGeneratedAd,
  getGeneratedAdsByUserId,
  getGeneratedAdsByOriginalId,
  deleteGeneratedAd,
  deleteGeneratedAdsBatch,
  createLogo,
  getLogosByUserId,
  deleteLogo,
  updateLogoEnabled,
  getEnabledLogosByUserId
} from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { analyzeImageWithGemini, generateAdVariants } from "./gemini";
import { overlayLogos } from "./services/imageProcessor";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // 原始廣告圖片管理
  originalAds: router({
    // 上傳原始廣告圖
    upload: protectedProcedure
      .input(z.object({
        filename: z.string(),
        mimeType: z.string(),
        base64Data: z.string(),
        country: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const buffer = Buffer.from(input.base64Data, 'base64');
          const fileKey = `${ctx.user.id}/original/${nanoid()}-${input.filename}`;
          console.log('[Upload] Uploading to R2, fileKey:', fileKey, 'size:', buffer.length, 'bytes');
          const { url } = await storagePut(fileKey, buffer, input.mimeType);
          console.log('[Upload] R2 returned URL:', url);
          
          await createOriginalAd({
            userId: ctx.user.id,
            fileKey,
            fileUrl: url,
            filename: input.filename,
            mimeType: input.mimeType,
            country: input.country,
          });
          
          console.log('[Upload] Successfully saved to database');
          return { success: true, url };
        } catch (error) {
          console.error('[Upload] Error:', error);
          throw new Error(`上傳失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
        }
      }),
    
    // 獲取用戶的所有原始廣告圖
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getOriginalAdsByUserId(ctx.user.id);
    }),
    
    // 獲取單個原始廣告圖
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getOriginalAdById(input.id);
      }),
    
    // 更新分析提示詞
    updateAnalysis: protectedProcedure
      .input(z.object({
        id: z.number(),
        analysisPrompt: z.string(),
      }))
      .mutation(async ({ input }) => {
        await updateOriginalAdAnalysis(input.id, input.analysisPrompt);
        return { success: true };
      }),
  }),

  // 生成廣告圖片管理
  generatedAds: router({
    // 創建生成的廣告圖（由 Gemini 生成後調用）
    create: protectedProcedure
      .input(z.object({
        originalAdId: z.number(),
        fileKey: z.string(),
        fileUrl: z.string(),
        prompt: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createGeneratedAd({
          userId: ctx.user.id,
          originalAdId: input.originalAdId,
          fileKey: input.fileKey,
          fileUrl: input.fileUrl,
          prompt: input.prompt,
        });
        return { success: true };
      }),
    
    // 獲取用戶的所有生成圖片
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getGeneratedAdsByUserId(ctx.user.id);
    }),
    
    // 獲取特定原始圖的所有生成變體
    listByOriginal: protectedProcedure
      .input(z.object({ originalAdId: z.number() }))
      .query(async ({ input }) => {
        return await getGeneratedAdsByOriginalId(input.originalAdId);
      }),
    
    // 刪除單個生成的廣告圖片
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteGeneratedAd(input.id, ctx.user.id);
        return { success: true };
      }),
    
    // 批量刪除生成的廣告圖片
    deleteBatch: protectedProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        if (input.ids.length === 0) {
          throw new Error("請至少選擇一張圖片");
        }
        await deleteGeneratedAdsBatch(input.ids, ctx.user.id);
        return { success: true, deletedCount: input.ids.length };
      }),
    
    // 下載圖片（代理端點，繞過 CORS）
    download: protectedProcedure
      .input(z.object({ 
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const axios = require('axios');
        const generatedAds = await getGeneratedAdsByUserId(ctx.user.id);
        const ad = generatedAds.find(a => a.id === input.id);
        
        if (!ad) {
          throw new Error("找不到圖片");
        }
        
        // 從 S3 獲取圖片二進制數據
        const response = await axios.get(ad.fileUrl, {
          responseType: 'arraybuffer',
        });
        
        const base64Image = Buffer.from(response.data).toString('base64');
        
        // 返回 base64 編碼的圖片數據
        return { 
          base64Data: base64Image,
          filename: `generated-${ad.id}.png`,
          mimeType: 'image/png',
        };
      }),
  }),

  // Logo 管理
  logos: router({
    // 上傳 Logo
    upload: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        filename: z.string(),
        mimeType: z.string(),
        base64Data: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.base64Data, 'base64');
        const fileKey = `${ctx.user.id}/elements/${nanoid()}-${input.filename}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        await createLogo({
          userId: ctx.user.id,
          name: input.name,
          fileKey,
          fileUrl: url,
        });
        
        return { success: true, url };
      }),
    
    // 獲取用戶的所有 Logo
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getLogosByUserId(ctx.user.id);
    }),
    
    // 切換 Logo 啟用狀態
    toggleEnabled: protectedProcedure
      .input(z.object({ id: z.number(), enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await updateLogoEnabled(input.id, input.enabled ? 1 : 0);
        return { success: true, enabled: input.enabled };
      }),
    
    // 刪除必要元素
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteLogo(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // Gemini 圖片生成
  gemini: router({
    // 分析圖片並生成提示詞
    analyzeImage: protectedProcedure
      .input(z.object({
        imageUrl: z.string(),
        originalAdId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error("GEMINI_API_KEY 未設定");
        }

        const analysisPrompt = await analyzeImageWithGemini(input.imageUrl, apiKey);
        await updateOriginalAdAnalysis(input.originalAdId, analysisPrompt);
        
        return { prompt: analysisPrompt };
      }),
    
    // 生成 3 張變體圖片
    generateVariants: protectedProcedure
      .input(z.object({
        originalAdId: z.number(),
        prompt: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) {
            throw new Error("GEMINI_API_KEY 未設定");
          }

          console.log('[Generate] Starting variant generation for originalAdId:', input.originalAdId);

          // 獲取原始廣告圖
          const originalAd = await getOriginalAdById(input.originalAdId);
          if (!originalAd) {
            throw new Error("找不到原始廣告圖");
          }

          console.log('[Generate] Original ad found, fileUrl:', originalAd.fileUrl);

          // 獲取用戶啟用的 Logo
          const enabledLogos = await getEnabledLogosByUserId(ctx.user.id);
          const logoUrls = enabledLogos.map((logo: { fileUrl: string }) => logo.fileUrl);
          console.log('[Generate] Enabled logos:', logoUrls.length);

          // 生成 3 張變體
          console.log('[Generate] Starting to generate variants...');
          const variantBuffers = await generateAdVariants(
            originalAd.fileUrl,
            input.prompt,
            logoUrls,
            apiKey,
            3
          );
          console.log('[Generate] Generated', variantBuffers.length, 'variants');

          // 為生成的圖片疊加 Logo（如果有啟用的 Logo）
          const processedBuffers: Buffer[] = [];
          for (let i = 0; i < variantBuffers.length; i++) {
            console.log(`[Generate] Processing variant ${i + 1}/${variantBuffers.length} with logos`);
            const processedBuffer = await overlayLogos(variantBuffers[i], logoUrls);
            processedBuffers.push(processedBuffer);
          }

          // 上傳處理後的圖片到 R2
          const generatedUrls: string[] = [];
          for (let i = 0; i < processedBuffers.length; i++) {
            const fileKey = `${ctx.user.id}/generated/${nanoid()}-variant-${i + 1}.png`;
            console.log(`[Generate] Uploading variant ${i + 1} to R2, fileKey:`, fileKey);
            const { url } = await storagePut(fileKey, processedBuffers[i], "image/png");
            console.log(`[Generate] Variant ${i + 1} uploaded, URL:`, url);
            
            // 保存到資料庫
            await createGeneratedAd({
              userId: ctx.user.id,
              originalAdId: input.originalAdId,
              fileKey,
              fileUrl: url,
              prompt: input.prompt,
            });
            console.log(`[Generate] Variant ${i + 1} saved to database`);

            generatedUrls.push(url);
          }

          console.log('[Generate] Successfully generated', generatedUrls.length, 'variants');
          return { success: true, generatedUrls };
        } catch (error) {
          console.error('[Generate] Error:', error);
          throw new Error(`生成失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
