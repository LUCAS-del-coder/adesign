import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Upload, Image as ImageIcon, Sparkles, Download, Trash2, Plus, ZoomIn, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";

function LogoutButton() {
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={() => logoutMutation.mutate()}
      disabled={logoutMutation.isPending}
    >
      {logoutMutation.isPending ? "登出中..." : "登出"}
    </Button>
  );
}

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [selectedOriginalId, setSelectedOriginalId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const elementFileInputRef = useRef<HTMLInputElement>(null);
  const [elementName, setElementName] = useState("");
  const [elementDescription, setElementDescription] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(-1);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [showAllAds, setShowAllAds] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<number>>(new Set());

  const utils = trpc.useUtils();
  
  // 查詢數據
  const { data: originalAds = [] } = trpc.originalAds.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  const { data: generatedAds = [] } = trpc.generatedAds.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  const { data: logos = [] } = trpc.logos.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const selectedAd = originalAds.find(ad => ad.id === selectedOriginalId);
  const selectedGeneratedAds = generatedAds.filter(ad => ad.originalAdId === selectedOriginalId);

  // Mutations
  const uploadOriginalMutation = trpc.originalAds.upload.useMutation({
    onSuccess: () => {
      toast.success("廣告圖上傳成功！");
      utils.originalAds.list.invalidate();
    },
    onError: (error) => {
      toast.error("上傳失敗：" + error.message);
    },
  });

  const uploadElementMutation = trpc.logos.upload.useMutation({
    onSuccess: async () => {
      toast.success("Logo 上傳成功！");
      await utils.logos.list.invalidate();
      setElementName("");
      setElementDescription("");
    },
    onError: (error) => {
      toast.error("上傳失敗：" + error.message);
    },
  });

  const deleteElementMutation = trpc.logos.delete.useMutation({
    onSuccess: () => {
      toast.success("元素已刪除");
      utils.logos.list.invalidate();
    },
  });

  const deleteImageMutation = trpc.generatedAds.delete.useMutation({
    onSuccess: () => {
      toast.success("圖片已刪除");
      utils.generatedAds.list.invalidate();
      setSelectedImageIds(new Set());
    },
    onError: (error) => {
      toast.error("刪除失敗：" + error.message);
    },
  });

  const deleteBatchMutation = trpc.generatedAds.deleteBatch.useMutation({
    onSuccess: (data) => {
      toast.success(`已刪除 ${data.deletedCount} 張圖片`);
      utils.generatedAds.list.invalidate();
      setSelectedImageIds(new Set());
    },
    onError: (error) => {
      toast.error("批量刪除失敗：" + error.message);
    },
  });

  const toggleLogoMutation = trpc.logos.toggleEnabled.useMutation({
    onSuccess: (data) => {
      toast.success(data.enabled ? "Logo 已啟用" : "Logo 已停用");
      utils.logos.list.invalidate();
    },
    onError: (error) => {
      toast.error("操作失敗：" + error.message);
    },
  });

  const analyzeImageMutation = trpc.gemini.analyzeImage.useMutation({
    onSuccess: (data) => {
      toast.success("圖片分析完成！");
    },
  });

  const generateVariantsMutation = trpc.gemini.generateVariants.useMutation({
    onSuccess: () => {
      toast.success("成功生成 3 張變體圖片！");
      utils.generatedAds.list.invalidate();
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // 批量上傳所有選中的文件
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      await new Promise<void>((resolve) => {
        reader.onload = async (e) => {
          const base64Data = e.target?.result?.toString().split(',')[1];
          if (!base64Data) {
            resolve();
            return;
          }

          try {
            await uploadOriginalMutation.mutateAsync({
              filename: file.name,
              mimeType: file.type,
              base64Data,
              country: selectedCountry || undefined,
            });
          } catch (error) {
            console.error('Upload failed:', error);
          }
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
    
    // 重置文件輸入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleElementUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!elementName.trim()) {
      toast.error("請輸入元素名稱");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target?.result?.toString().split(',')[1];
      if (!base64Data) return;

      await uploadElementMutation.mutateAsync({
        name: elementName,
        description: elementDescription,
        filename: file.name,
        mimeType: file.type,
        base64Data,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateVariants = async () => {
    if (!selectedOriginalId || !selectedAd) {
      toast.error("請先選擇一張廣告圖");
      return;
    }

    try {
      setGenerationProgress(0);

      if (!selectedAd.analysisPrompt) {
        setGenerationProgress(10);
        await analyzeImageMutation.mutateAsync({
          imageUrl: selectedAd.fileUrl,
          originalAdId: selectedOriginalId,
        });
        setGenerationProgress(30);
      } else {
        setGenerationProgress(30);
      }

      // 使用更智能的進度更新：根據時間估算，但不會超過 98%
      // 生成 3 張圖片可能需要較長時間，特別是使用 Gemini API
      const startTime = Date.now();
      const estimatedDuration = 300000; // 估計總時長 5 分鐘（300秒），給足夠的時間
      
      let progressInterval: NodeJS.Timeout | null = null;
      
      // 啟動進度更新
      progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        // 使用對數函數讓進度增長更合理：前 2 分鐘快速增長到 80%，之後緩慢增長到 98%
        let timeBasedProgress: number;
        if (elapsed < 120000) {
          // 前 2 分鐘：從 30% 增長到 80%
          timeBasedProgress = 30 + (elapsed / 120000) * 50;
        } else {
          // 2 分鐘後：從 80% 緩慢增長到 98%
          const remainingTime = Math.min(elapsed - 120000, 180000); // 最多再等 3 分鐘
          timeBasedProgress = 80 + (remainingTime / 180000) * 18;
        }
        
        timeBasedProgress = Math.min(98, timeBasedProgress);
        
        setGenerationProgress(prev => {
          // 使用時間基礎的進度，但確保不會倒退
          return Math.max(prev, Math.floor(timeBasedProgress));
        });
      }, 1000); // 每 1 秒更新一次

      try {
        await generateVariantsMutation.mutateAsync({
          originalAdId: selectedOriginalId,
          prompt: selectedAd.analysisPrompt || "",
        });

        // 成功完成
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        setGenerationProgress(100);
        toast.success("圖片生成成功！");
        
        setTimeout(() => setGenerationProgress(0), 2000);
      } catch (error: any) {
        // 發生錯誤
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        setGenerationProgress(0);
        const errorMessage = error?.message || "生成失敗，請檢查 Railway 日誌";
        toast.error(`生成失敗: ${errorMessage}`);
        console.error("[Generate] Error in handleGenerateVariants:", error);
        throw error; // 重新拋出錯誤，讓外層 catch 處理
      } finally {
        // 確保進度 interval 被清理
        if (progressInterval) {
          clearInterval(progressInterval);
        }
      }
    } catch (error: any) {
      // 外層錯誤處理（分析階段失敗等）
      setGenerationProgress(0);
      const errorMessage = error?.message || "操作失敗";
      toast.error(`錯誤: ${errorMessage}`);
      console.error("[Generate] Outer error in handleGenerateVariants:", error);
    }
  };

  const handleDownload = async (url: string, filename: string, event?: React.MouseEvent) => {
    // 阻止事件冒泡，防止觸發預覽
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    try {
      console.log('[Download] Starting download:', filename);
      console.log('[Download] URL:', url);
      
      // 使用 fetch 下載圖片並轉換為 blob
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-cache',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      // 創建下載連結並觸發下載
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = filename;
      a.setAttribute('download', filename); // 確保下載屬性設置
      document.body.appendChild(a);
      
      // 使用 setTimeout 確保 DOM 已更新
      setTimeout(() => {
        a.click();
        document.body.removeChild(a);
        
        // 清理 blob URL
        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 100);
      }, 0);
      
      toast.success("下載成功");
    } catch (error) {
      console.error('[Download] Error:', error);
      toast.error(`下載失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      
      // 如果下載失敗，提供備用方案：在新標籤頁打開
      try {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.info("已在新標籤頁打開圖片，請右鍵保存");
      } catch (fallbackError) {
        console.error('[Download] Fallback also failed:', fallbackError);
      }
    }
  };

  const handleBatchDownload = async (e?: React.MouseEvent) => {
    // 阻止事件冒泡
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
    }
    
    if (selectedImageIds.size === 0) {
      toast.error("請先選擇要下載的圖片");
      return;
    }

    const selectedAds = generatedAds.filter(ad => selectedImageIds.has(ad.id));
    toast.info(`開始下載 ${selectedAds.length} 張圖片...`);

    // 逐一下載，每次延遲 500ms 避免瀏覽器阻止多個下載
    for (let i = 0; i < selectedAds.length; i++) {
      const ad = selectedAds[i];
      try {
        // 創建一個虛擬事件對象用於下載
        const virtualEvent = {
          preventDefault: () => {},
          stopPropagation: () => {},
          nativeEvent: { stopImmediatePropagation: () => {} }
        } as React.MouseEvent;
        await handleDownload(ad.fileUrl, `generated-${ad.id}.png`, virtualEvent);
        // 延遲 500ms 再下載下一張
        if (i < selectedAds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`[BatchDownload] Failed to download image ${ad.id}:`, error);
      }
    }

    toast.success(`已開始下載 ${selectedAds.length} 張圖片`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0a0a0f]">
        {/* 高科技動態背景 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* 漸變網格背景 */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, black 40%, transparent)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, black 40%, transparent)'
          }}></div>
          
          {/* 動態發光球體 - 深藍色系 */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-700 rounded-full blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 rounded-full blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-700 via-cyan-600 to-blue-800 rounded-full blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
          
          {/* 掃描線效果 */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent h-full" style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(59, 130, 246, 0.1) 50%, transparent 100%)',
            animation: 'scan 8s linear infinite'
          }}></div>
        </div>

        {/* 玻璃態卡片 */}
        <Card className="w-full max-w-md mx-4 relative z-10 border border-blue-500/30 shadow-2xl backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-transparent">
          {/* 卡片發光邊框 */}
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-blue-600/20 opacity-50 blur-xl -z-10"></div>
          <div className="absolute inset-[1px] rounded-lg bg-[#0a0a0f] -z-10"></div>
          
          <CardHeader className="text-center space-y-6 pt-8 pb-6">
            {/* Logo 容器 - 帶發光效果 */}
            <div className="mx-auto mb-2 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 rounded-2xl blur-xl opacity-60 animate-pulse"></div>
              <div className="relative w-24 h-24 bg-gradient-to-br from-blue-500/30 via-cyan-500/30 to-blue-600/30 rounded-2xl flex items-center justify-center border border-blue-400/50 shadow-[0_0_30px_rgba(59,130,246,0.5)] backdrop-blur-sm">
                <Sparkles className="w-12 h-12 text-blue-300 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
              </div>
            </div>
            
            {/* 標題 - 霓虹燈效果 */}
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]">
              adesign
            </CardTitle>
            
            {/* 副標題 */}
            <CardDescription className="text-base text-gray-300/80">
              AI-Powered Ad Design
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pb-8 px-8">
            <Button 
              className="w-full h-14 text-lg font-semibold relative overflow-hidden group shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:shadow-[0_0_40px_rgba(59,130,246,0.6)] transition-all duration-300 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 hover:from-blue-500 hover:via-cyan-500 hover:to-blue-600 border border-blue-400/50" 
              size="lg"
              onClick={() => window.location.href = getLoginUrl()}
            >
              {/* 按鈕發光效果 */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              
              {/* Google 圖標 */}
              <svg className="w-5 h-5 mr-2 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="relative z-10">使用 Google 登入</span>
            </Button>
            
            {/* 裝飾性文字 */}
            <div className="text-center">
              <p className="text-xs text-gray-400/60 font-mono tracking-wider">
                ✦ AI POWERED ✦
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* 底部裝飾線 */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/3 via-background to-accent/3 relative">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }}></div>
      
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50 sticky top-0 z-50 shadow-sm">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              adesign
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground font-medium">{user?.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="container py-8">
        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3 bg-muted/50 border border-border/50 p-1 rounded-lg">
            <TabsTrigger value="generate" className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">生成廣告</TabsTrigger>
            <TabsTrigger value="library" className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">圖片庫</TabsTrigger>
            <TabsTrigger value="elements" className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Logo 區塊</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* 上傳區域 */}
              <Card className="border-primary/10 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Upload className="w-5 h-5 text-primary" />
                    </div>
                    上傳廣告圖
                  </CardTitle>
                  <CardDescription className="text-sm">
                    上傳一張成效好的廣告圖，AI 將分析並生成相似變體
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 國家選擇 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">國家分類（可選）</label>
                    <select
                      className="w-full px-3 py-2 border border-border/50 rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                    >
                      <option value="">未指定</option>
                      <option value="TW">台灣</option>
                      <option value="CN">中國</option>
                      <option value="HK">香港</option>
                      <option value="SG">新加坡</option>
                      <option value="MY">馬來西亞</option>
                      <option value="TH">泰國</option>
                      <option value="VN">越南</option>
                      <option value="ID">印尼</option>
                      <option value="PH">菲律賓</option>
                      <option value="KH">柬埔寨</option>
                      <option value="MM">緬甸</option>
                      <option value="US">美國</option>
                      <option value="JP">日本</option>
                      <option value="KR">韓國</option>
                      <option value="OTHER">其他</option>
                    </select>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button
                    className="w-full shadow-md hover:shadow-lg transition-all duration-300"
                    size="lg"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadOriginalMutation.isPending}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadOriginalMutation.isPending ? "上傳中..." : "選擇圖片（支持多選）"}
                  </Button>

                  {originalAds.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">已上傳的廣告圖：</p>
                        {originalAds.length > 6 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAllAds(!showAllAds)}
                          >
                            {showAllAds ? "顯示最新 6 張" : `顯示全部 ${originalAds.length} 張`}
                          </Button>
                        )}
                      </div>
                          <div className="grid grid-cols-3 gap-3">
                        {(showAllAds ? originalAds : originalAds.slice(0, 6)).map((ad) => (
                          <div
                            key={ad.id}
                            className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all group ${
                              selectedOriginalId === ad.id
                                ? "border-primary ring-2 ring-primary/30 shadow-lg shadow-primary/20 scale-105"
                                : "border-border/50 hover:border-primary/50 hover:shadow-md"
                            }`}
                            onClick={() => setSelectedOriginalId(ad.id)}
                          >
                            <img
                              src={ad.fileUrl}
                              alt={ad.filename}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                            {selectedOriginalId === ad.id && (
                              <div className="absolute inset-0 bg-primary/10 pointer-events-none"></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 分析與生成區域 */}
              <Card className="border-primary/10 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    AI 生成變體
                  </CardTitle>
                  <CardDescription className="text-sm">
                    一鍵生成 3 張相似的廣告圖變體
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedAd ? (
                    <>
                      <div className="aspect-video rounded-xl overflow-hidden border border-border/50 bg-muted/30 shadow-inner">
                        <img
                          src={selectedAd.fileUrl}
                          alt={selectedAd.filename}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <Button
                        className="w-full shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                        size="lg"
                        onClick={handleGenerateVariants}
                        disabled={generateVariantsMutation.isPending || analyzeImageMutation.isPending}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {generateVariantsMutation.isPending || analyzeImageMutation.isPending
                          ? "生成中..."
                          : "生成 3 張變體圖"}
                      </Button>

                      {/* 生成進度條 */}
                      {generationProgress > 0 && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>生成進度</span>
                            <span>{generationProgress}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-primary h-full transition-all duration-300 ease-out"
                              style={{ width: `${generationProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {selectedGeneratedAds.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">已生成 {selectedGeneratedAds.length} 張變體：</p>
                          <div className="grid grid-cols-3 gap-3">
                            {selectedGeneratedAds.map((ad) => (
                              <div key={ad.id} className="relative aspect-square rounded-xl overflow-hidden border border-border/50 group hover:border-primary/50 transition-all hover:shadow-lg">
                                <img
                                  src={ad.fileUrl}
                                  alt="Generated"
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-3">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="shadow-md"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDownload(ad.fileUrl, `generated-${ad.id}.png`, e);
                                    }}
                                  >
                                    <Download className="w-4 h-4 mr-1" />
                                    下載
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="aspect-video rounded-xl border-2 border-dashed border-border/50 flex items-center justify-center text-muted-foreground bg-muted/20">
                      <div className="text-center">
                        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">請先選擇一張廣告圖</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="library">
            <Card className="border-primary/10 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-primary" />
                  </div>
                  圖片庫
                </CardTitle>
                <CardDescription className="text-sm">
                  所有生成的廣告圖變體（共 {generatedAds.length} 張）
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 批量操作 */}
                {selectedImageIds.size > 0 && (
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-sm text-muted-foreground">
                      已選擇 {selectedImageIds.size} 張
                    </span>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.nativeEvent.stopImmediatePropagation();
                        handleBatchDownload(e);
                      }}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      批量下載
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm(`確定要刪除 ${selectedImageIds.size} 張圖片嗎？此操作無法復原。`)) {
                          deleteBatchMutation.mutate({ ids: Array.from(selectedImageIds) });
                        }
                      }}
                      disabled={deleteBatchMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      批量刪除
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedImageIds(new Set())}
                    >
                      取消選擇
                    </Button>
                  </div>
                )}

                {/* 圖片庫內容 */}
                <div>
                {generatedAds.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>尚未生成任何圖片</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {generatedAds.map((ad) => {
                      const isSelected = selectedImageIds.has(ad.id);
                      return (
                        <div 
                          key={ad.id} 
                          className={`relative aspect-square rounded-xl overflow-hidden border transition-all hover:shadow-lg ${
                            isSelected 
                              ? "border-primary ring-2 ring-primary/30 shadow-lg shadow-primary/20" 
                              : "border-border/50 group hover:border-primary/50"
                          }`}
                        >
                          {/* 選擇框 */}
                          <div className="absolute top-2 left-2 z-20">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                const newSet = new Set(selectedImageIds);
                                if (e.target.checked) {
                                  newSet.add(ad.id);
                                } else {
                                  newSet.delete(ad.id);
                                }
                                setSelectedImageIds(newSet);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-5 h-5 rounded border-2 border-background bg-background/90 cursor-pointer"
                            />
                          </div>
                          
                          <img
                            src={ad.fileUrl}
                            alt="Generated"
                            className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-110"
                            onClick={(e) => {
                              // 只有當點擊的不是按鈕時才觸發預覽
                              const target = e.target as HTMLElement;
                              if (!target.closest('button') && !target.closest('input')) {
                                const index = generatedAds.findIndex(a => a.id === ad.id);
                                setPreviewIndex(index);
                                setPreviewImage(ad.fileUrl);
                              }
                            }}
                          />
                          <div 
                            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-2 p-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const index = generatedAds.findIndex(a => a.id === ad.id);
                                setPreviewIndex(index);
                                setPreviewImage(ad.fileUrl);
                              }}
                            >
                              <ZoomIn className="w-4 h-4 mr-1" />
                              預覽
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // 立即阻止默認行為和冒泡
                                e.nativeEvent.stopImmediatePropagation();
                                await handleDownload(ad.fileUrl, `generated-${ad.id}.png`, e);
                              }}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              下載
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.nativeEvent.stopImmediatePropagation();
                                if (confirm("確定要刪除此圖片嗎？此操作無法復原。")) {
                                  deleteImageMutation.mutate({ id: ad.id });
                                }
                              }}
                              disabled={deleteImageMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="elements">
            <Card className="border-primary/10 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-primary" />
                  </div>
                  Logo 區塊管理
                </CardTitle>
                <CardDescription className="text-sm">
                  上傳 Logo 圖片，啟用後會自動添加到所有生成圖片的右下角
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4 p-4 border border-border/50 rounded-xl bg-muted/20">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Logo 名稱</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-border/50 rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                      placeholder="例如：公司 Logo"
                      value={elementName}
                      onChange={(e) => setElementName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 hidden">
                    <label className="text-sm font-medium">描述（選填）</label>
                    <textarea
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="描述此元素的特徵，幫助 AI 更準確地生成"
                      rows={2}
                      value={elementDescription}
                      onChange={(e) => setElementDescription(e.target.value)}
                    />
                  </div>
                  <input
                    ref={elementFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleElementUpload}
                  />
                  <Button
                    className="w-full"
                    onClick={() => elementFileInputRef.current?.click()}
                    disabled={uploadElementMutation.isPending}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadElementMutation.isPending ? "上傳中..." : "上傳元素"}
                  </Button>
                </div>

                {logos.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">已上傳的 Logo：</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {logos.map((element) => (
                        <div key={element.id} className="relative aspect-square rounded-xl overflow-hidden border border-border/50 group hover:border-primary/50 transition-all hover:shadow-lg">
                          <img
                            src={element.fileUrl}
                            alt={element.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          <div className="absolute top-2 right-2">
                            <div className={`px-2 py-1 rounded-md text-xs font-medium shadow-md ${
                              element.enabled 
                                ? "bg-green-500/90 text-white border border-green-400/30" 
                                : "bg-muted/90 text-muted-foreground border border-border/50"
                            }`}>
                              {element.enabled ? "已啟用" : "已停用"}
                            </div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-3">
                            <p className="text-xs text-white font-medium truncate">{element.name}</p>
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-2 p-3">
                            <Button
                              size="sm"
                              variant={element.enabled ? "secondary" : "default"}
                              onClick={() => toggleLogoMutation.mutate({ 
                                id: element.id, 
                                enabled: !element.enabled 
                              })}
                            >
                              {element.enabled ? "停用" : "啟用"}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteElementMutation.mutate({ id: element.id })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* 圖片預覽對話框 */}
      {previewImage && previewIndex >= 0 && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => {
            setPreviewImage(null);
            setPreviewIndex(-1);
          }}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 bg-background/90 hover:bg-background border border-border/50 shadow-lg z-10"
              onClick={() => {
                setPreviewImage(null);
                setPreviewIndex(-1);
              }}
            >
              <X className="w-6 h-6" />
            </Button>
            
            {/* 上一頁按鈕 - 始終顯示，但禁用時變灰 */}
            <Button
              variant="ghost"
              size="icon"
              className={`absolute left-4 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background border border-border/50 shadow-lg z-10 w-12 h-12 ${
                previewIndex <= 0 ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (previewIndex > 0) {
                  const prevIndex = previewIndex - 1;
                  const prevAd = generatedAds[prevIndex];
                  if (prevAd) {
                    setPreviewIndex(prevIndex);
                    setPreviewImage(prevAd.fileUrl);
                  }
                }
              }}
              disabled={previewIndex <= 0}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            
            {/* 下一頁按鈕 - 始終顯示，但禁用時變灰 */}
            <Button
              variant="ghost"
              size="icon"
              className={`absolute right-4 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background border border-border/50 shadow-lg z-10 w-12 h-12 ${
                previewIndex >= generatedAds.length - 1 ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (previewIndex < generatedAds.length - 1) {
                  const nextIndex = previewIndex + 1;
                  const nextAd = generatedAds[nextIndex];
                  if (nextAd) {
                    setPreviewIndex(nextIndex);
                    setPreviewImage(nextAd.fileUrl);
                  }
                }
              }}
              disabled={previewIndex >= generatedAds.length - 1}
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
            
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-border/20"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* 圖片索引指示器 */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background/90 px-4 py-2 rounded-lg border border-border/50 shadow-lg z-10">
              <span className="text-sm font-medium">
                {previewIndex + 1} / {generatedAds.length}
              </span>
            </div>
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              <Button
                variant="default"
                className="shadow-lg"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const ad = generatedAds[previewIndex];
                  if (ad) handleDownload(ad.fileUrl, `generated-${ad.id}.png`, e);
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                下載圖片
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
