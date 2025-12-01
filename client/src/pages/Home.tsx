import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Upload, Image as ImageIcon, Sparkles, Download, Trash2, Plus, ZoomIn, X } from "lucide-react";
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

      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 5;
        });
      }, 1000);

      await generateVariantsMutation.mutateAsync({
        originalAdId: selectedOriginalId,
        prompt: selectedAd.analysisPrompt || "",
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);

      setTimeout(() => setGenerationProgress(0), 1000);
    } catch (error) {
      setGenerationProgress(0);
    }
  };

  const handleDownload = (url: string, filename: string) => {
    console.log('[Download] Starting download:', filename);
    console.log('[Download] URL:', url);
    
    // 直接使用 URL 下載（即使有 CORS 問題，也會在新標籤頁打開）
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast.success("圖片下載已開始（如果在新標籤頁打開，請右鍵點擊圖片並選擇「將圖片另存為」）");
    console.log('[Download] Download triggered');
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">廣告圖生成工具</CardTitle>
            <CardDescription>
              使用 AI 技術，快速生成高效廣告圖變體
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => window.location.href = getLoginUrl()}
            >
              登入開始使用
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">廣告圖生成工具</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="container py-8">
        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="generate">生成廣告</TabsTrigger>
            <TabsTrigger value="library">圖片庫</TabsTrigger>
            <TabsTrigger value="elements">Logo 區塊</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* 上傳區域 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    上傳廣告圖
                  </CardTitle>
                  <CardDescription>
                    上傳一張成效好的廣告圖，AI 將分析並生成相似變體
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 國家選擇 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">國家分類（可選）</label>
                    <select
                      className="w-full px-3 py-2 border rounded-md"
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
                    className="w-full"
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
                      <div className="grid grid-cols-3 gap-2">
                        {(showAllAds ? originalAds : originalAds.slice(0, 6)).map((ad) => (
                          <div
                            key={ad.id}
                            className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                              selectedOriginalId === ad.id
                                ? "border-primary ring-2 ring-primary/20"
                                : "border-transparent hover:border-primary/50"
                            }`}
                            onClick={() => setSelectedOriginalId(ad.id)}
                          >
                            <img
                              src={ad.fileUrl}
                              alt={ad.filename}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 分析與生成區域 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    AI 生成變體
                  </CardTitle>
                  <CardDescription>
                    一鍵生成 3 張相似的廣告圖變體
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedAd ? (
                    <>
                      <div className="aspect-video rounded-lg overflow-hidden border">
                        <img
                          src={selectedAd.fileUrl}
                          alt={selectedAd.filename}
                          className="w-full h-full object-contain bg-muted"
                        />
                      </div>
                      <Button
                        className="w-full"
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
                          <div className="grid grid-cols-3 gap-2">
                            {selectedGeneratedAds.map((ad) => (
                              <div key={ad.id} className="relative aspect-square rounded-lg overflow-hidden border group">
                                <img
                                  src={ad.fileUrl}
                                  alt="Generated"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleDownload(ad.fileUrl, `generated-${ad.id}.png`)}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="aspect-video rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>請先選擇一張廣告圖</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="library">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  圖片庫
                </CardTitle>
                <CardDescription>
                  所有生成的廣告圖變體（共 {generatedAds.length} 張，篩選後 {filteredGeneratedAds.length} 張）
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 國家篩選器 */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium">篩選國家：</label>
                  <select
                    className="px-3 py-2 border rounded-md"
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
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredGeneratedAds.map((ad) => (
                      <div key={ad.id} className="relative aspect-square rounded-lg overflow-hidden border group">
                        <img
                          src={ad.fileUrl}
                          alt="Generated"
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setPreviewImage(ad.fileUrl)}
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Logo 區塊管理
                </CardTitle>
                <CardDescription>
                  上傳 Logo 圖片，啟用後會自動添加到所有生成圖片的右下角
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Logo 名稱</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-md"
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
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {logos.map((element) => (
                        <div key={element.id} className="relative aspect-square rounded-lg overflow-hidden border group">
                          <img
                            src={element.fileUrl}
                            alt={element.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2">
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              element.enabled 
                                ? "bg-green-500 text-white" 
                                : "bg-gray-500 text-white"
                            }`}>
                              {element.enabled ? "已啟用" : "已停用"}
                            </div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2">
                            <p className="text-xs text-white truncate">{element.name}</p>
                          </div>
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
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
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 bg-background/80 hover:bg-background"
              onClick={() => setPreviewImage(null)}
            >
              <X className="w-6 h-6" />
            </Button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              <Button
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  const ad = generatedAds.find(a => a.fileUrl === previewImage);
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
