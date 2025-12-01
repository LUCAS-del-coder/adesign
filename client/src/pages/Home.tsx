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
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [generationProgress, setGenerationProgress] = useState(0);

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

  // 篩選生成的廣告圖（根據國家）
  const filteredGeneratedAds = generatedAds.filter(ad => {
    if (countryFilter === "all") return true;
    
    // 找到對應的原始廣告圖
    const originalAd = originalAds.find(orig => orig.id === ad.originalAdId);
    if (!originalAd) return true; // 如果找不到原始圖，顯示它
    
    // 比對國家
    return originalAd.country === countryFilter;
  });

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
      }
    } catch (error: any) {
      // 外層錯誤處理（分析階段失敗等）
      setGenerationProgress(0);
      const errorMessage = error?.message || "操作失敗";
      toast.error(`錯誤: ${errorMessage}`);
      console.error("[Generate] Outer error in handleGenerateVariants:", error);
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      console.log('[Download] Starting download:', filename);
      console.log('[Download] URL:', url);
      
      // 使用 fetch 下載圖片並轉換為 blob，避免 CORS 問題
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
      });
      
      if (!response.ok) {
        throw new Error(`下載失敗: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      // 創建下載連結
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // 清理 blob URL
      window.URL.revokeObjectURL(blobUrl);
      
      toast.success("圖片下載成功！");
      console.log('[Download] Download completed');
    } catch (error: any) {
      console.error('[Download] Error:', error);
      toast.error(`下載失敗: ${error.message || '未知錯誤'}`);
    }
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <Card className="w-full max-w-md mx-4 relative z-10 border-primary/20 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center border border-primary/20 shadow-lg">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              廣告圖生成工具
            </CardTitle>
            <CardDescription className="text-base">
              使用 AI 技術，快速生成高效廣告圖變體
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full shadow-lg hover:shadow-xl transition-all duration-300" 
              size="lg"
              onClick={() => window.location.href = getLoginUrl()}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              登入開始使用
            </Button>
          </CardContent>
        </Card>
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
              廣告圖生成工具
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
                                    onClick={() => handleDownload(ad.fileUrl, `generated-${ad.id}.png`)}
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
                  所有生成的廣告圖變體（共 {generatedAds.length} 張，篩選後 {filteredGeneratedAds.length} 張）
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 國家篩選器 */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium">篩選國家：</label>
                  <select
                    className="px-3 py-2 border border-border/50 rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                  >
                    <option value="all">全部國家</option>
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

                {/* 圖片庫內容 */}
                <div>
                {filteredGeneratedAds.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>{generatedAds.length === 0 ? "尚未生成任何圖片" : "沒有符合篩選條件的圖片"}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {filteredGeneratedAds.map((ad) => (
                      <div key={ad.id} className="relative aspect-square rounded-xl overflow-hidden border border-border/50 group hover:border-primary/50 transition-all hover:shadow-lg">
                        <img
                          src={ad.fileUrl}
                          alt="Generated"
                          className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-110"
                          onClick={() => {
                            const index = filteredGeneratedAds.findIndex(a => a.id === ad.id);
                            setPreviewIndex(index);
                            setPreviewImage(ad.fileUrl);
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-2 p-3">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              const index = filteredGeneratedAds.findIndex(a => a.id === ad.id);
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(ad.fileUrl, `generated-${ad.id}.png`);
                            }}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            下載
                          </Button>
                        </div>
                      </div>
                    ))}
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
            
            {/* 上一頁按鈕 */}
            {previewIndex > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background border border-border/50 shadow-lg z-10 w-12 h-12"
                onClick={(e) => {
                  e.stopPropagation();
                  const prevIndex = previewIndex - 1;
                  const prevAd = filteredGeneratedAds[prevIndex];
                  if (prevAd) {
                    setPreviewIndex(prevIndex);
                    setPreviewImage(prevAd.fileUrl);
                  }
                }}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
            )}
            
            {/* 下一頁按鈕 */}
            {previewIndex < filteredGeneratedAds.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background border border-border/50 shadow-lg z-10 w-12 h-12"
                onClick={(e) => {
                  e.stopPropagation();
                  const nextIndex = previewIndex + 1;
                  const nextAd = filteredGeneratedAds[nextIndex];
                  if (nextAd) {
                    setPreviewIndex(nextIndex);
                    setPreviewImage(nextAd.fileUrl);
                  }
                }}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            )}
            
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-border/20"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* 圖片索引指示器 */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background/90 px-4 py-2 rounded-lg border border-border/50 shadow-lg z-10">
              <span className="text-sm font-medium">
                {previewIndex + 1} / {filteredGeneratedAds.length}
              </span>
            </div>
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              <Button
                variant="default"
                className="shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  const ad = filteredGeneratedAds[previewIndex];
                  if (ad) handleDownload(ad.fileUrl, `generated-${ad.id}.png`);
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
