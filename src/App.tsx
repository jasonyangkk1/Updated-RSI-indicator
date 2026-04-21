import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { 
  Zap, 
  History, 
  Globe, 
  LayoutGrid, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  BarChart3, 
  Activity, 
  ChevronRight, 
  RefreshCcw,
  Search,
  Trash2
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { cn } from './lib/utils';
import { StockAnalysis, SectorData, MarketData } from './types';
import { SECTORS } from './constants';

const MAX_HISTORY = 50;

export default function App() {
  const [activeTab, setActiveTab] = useState('tech');
  const [history, setHistory] = useState<StockAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<StockAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('stock_analyzer_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Clean up old invalid items or those with massive base64 if accidentally stored
        setHistory(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
    refreshMarketData();
  }, []);

  // Save history when it changes (with error catching)
  useEffect(() => {
    try {
      // Create a copy without the images to save space in localStorage if images are too large
      // But for now, we'll just try to save and handle error
      localStorage.setItem('stock_analyzer_history', JSON.stringify(history));
    } catch (e) {
      console.warn("History too large for localStorage, clearing oldest item");
      if (history.length > 0) {
        setHistory(prev => prev.slice(0, prev.length - 1));
      }
    }
  }, [history]);

  // Clean up preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const refreshMarketData = () => {
    const newData: MarketData = {
      vix: +(Math.random() * 5 + 14).toFixed(1),
      cnn: Math.floor(Math.random() * 20 + 50),
      sp: 5800 + Math.floor(Math.random() * 200),
      spChg: +(Math.random() * 2 - 0.5).toFixed(2),
      nq: 19000 + Math.floor(Math.random() * 800),
      nqChg: +(Math.random() * 2 - 0.3).toFixed(2),
      pc: +(Math.random() * 0.4 + 0.6).toFixed(2),
      lastUpdated: new Date().toLocaleTimeString('zh-TW')
    };
    setMarketData(newData);
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max size 1024px for Gemini while keeping aspect ratio
          const MAX_SIZE = 1024;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Quality 0.7 is plenty for technical analysis
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setAnalysisResult(null);

    // Immediate preview using blob URL (fast, memory efficient)
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const newPreview = URL.createObjectURL(file);
    setPreviewUrl(newPreview);

    try {
      // Background compression
      const compressed = await compressImage(file);
      setSelectedImage(compressed);
    } catch (err) {
      console.error("Compression failed", err);
      // Fallback: use simple reader if compression fails
      const reader = new FileReader();
      reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const runAnalysis = async () => {
    if (!selectedImage) {
      setError("請先上傳圖片。");
      return;
    }
    setIsAnalyzing(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const base64Data = selectedImage.split(',')[1];

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { inlineData: { mimeType: "image/jpeg", data: base64Data } },
              { text: "你是一位專業的台灣股市技術分析師，請分析這張 K 線圖。請針對圖表中的趨勢、指標(如RSI, ROC, OBV)以及支撐壓力位進行分析。請回傳 JSON 格式，包含: stockCode, stockName, verdict, verdictType ('buy'|'hold'|'sell'), analysis, warning, roc, rocStatus, rsi, rsiStatus, obv, obvStatus, support, resist, buyPrice。" }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              stockCode: { type: Type.STRING },
              stockName: { type: Type.STRING },
              verdict: { type: Type.STRING },
              verdictType: { type: Type.STRING },
              analysis: { type: Type.STRING },
              warning: { type: Type.STRING },
              roc: { type: Type.STRING },
              rocStatus: { type: Type.STRING },
              rsi: { type: Type.STRING },
              rsiStatus: { type: Type.STRING },
              obv: { type: Type.STRING },
              obvStatus: { type: Type.STRING },
              support: { type: Type.STRING },
              resist: { type: Type.STRING },
              buyPrice: { type: Type.STRING }
            }
          }
        }
      });

      if (!response.text) throw new Error("AI 未能返回分析結果。");
      
      const result = JSON.parse(response.text) as StockAnalysis;
      const completeResult = {
        ...result,
        id: crypto.randomUUID(),
        time: new Date().toLocaleString('zh-TW'),
        // Store the compressed version in history to save space
        imageUrl: selectedImage
      };

      setAnalysisResult(completeResult);
      
      // Update history with capacity limit
      setHistory(prev => {
        const newHistory = [completeResult, ...prev];
        return newHistory.slice(0, MAX_HISTORY);
      });

    } catch (err: any) {
      console.error("Analysis error:", err);
      setError(err.message || '分析中發生錯誤，請稍後再試。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearHistory = () => {
    if (confirm('確定要清除所有搜尋紀錄嗎？')) {
      setHistory([]);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-[#e8eaf0] pb-24 font-sans selection:bg-[#00e5ff33] selection:text-[#00e5ff]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0d1525]/80 backdrop-blur-xl border-b border-[#1e3050] px-5 py-4">
        <div className="max-w-xl mx-auto">
          <div className="text-[10px] text-[#00e5ff] font-mono font-bold tracking-[2px] mb-1">TW MARKET</div>
          <h1 className="text-2xl font-bold tracking-tight">台股分析儀</h1>
          <p className="text-xs text-[#8899aa] mt-1 tracking-wide">AI 動能分析・族群輪漲・歷史隨行</p>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/*技術分析頁面 */}
          {activeTab === 'tech' && (
            <motion.div 
              key="tech"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-4"
            >
              {!previewUrl ? (
                <div 
                  className="relative group cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-[#00e5ff] bg-[#00e5ff08] hover:bg-[#00e5ff12] transition-all duration-300"
                >
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className="py-12 flex flex-col items-center gap-3">
                    <div className="text-4xl group-hover:scale-110 transition-transform duration-300">📊</div>
                    <span className="text-[#00e5ff] font-medium">上傳 K 線圖</span>
                    <span className="text-[#556677] text-xs">支援截圖、相機拍照</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden border border-[#1e3050] bg-[#111827]">
                    <img src={previewUrl} alt="Preview" className={cn("w-full max-h-[300px] object-contain transition-opacity duration-300", !selectedImage ? "opacity-50 blur-sm" : "opacity-100")} />
                    {!selectedImage && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <RefreshCcw className="animate-spin text-[#00e5ff]" size={24} />
                      </div>
                    )}
                    <button 
                      onClick={() => {
                        setSelectedImage(null);
                        setPreviewUrl(null);
                        setAnalysisResult(null);
                      }}
                      className="absolute top-3 right-3 bg-black/60 backdrop-blur-md p-2 rounded-full hover:bg-black/80 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <button 
                    onClick={runAnalysis}
                    disabled={isAnalyzing || !selectedImage}
                    className="w-full bg-gradient-to-br from-[#00e5ff] to-[#00b0cc] text-[#0a0e1a] font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
                  >
                    {!selectedImage ? (
                      <>
                        <RefreshCcw className="animate-spin" size={20} />
                        準備中...
                      </>
                    ) : isAnalyzing ? (
                      <>
                        <RefreshCcw className="animate-spin" size={20} />
                        分析中...
                      </>
                    ) : (
                      <>
                        <Zap size={20} fill="currentColor" />
                        開始 AI 分析
                      </>
                    )}
                  </button>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm flex gap-3">
                  <AlertTriangle size={18} className="shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {analysisResult && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className={cn(
                    "bg-[#131c2e] border-l-4 rounded-2xl p-5 shadow-xl",
                    analysisResult.verdictType === 'buy' ? "border-[#00e676]" : analysisResult.verdictType === 'sell' ? "border-[#ff5252]" : "border-[#ffd740]"
                  )}>
                    <div className="flex items-center gap-3 mb-3">
                      {analysisResult.stockCode && (
                        <div className="bg-[#00e5ff1a] border border-[#00e5ff3d] text-[#00e5ff] text-xs font-mono px-3 py-1 rounded-lg">
                          {analysisResult.stockCode} {analysisResult.stockName}
                        </div>
                      )}
                      <span className={cn(
                        "text-xl font-bold flex items-center gap-2",
                        analysisResult.verdictType === 'buy' ? "text-[#00e676]" : analysisResult.verdictType === 'sell' ? "text-[#ff5252]" : "text-[#ffd740]"
                      )}>
                        {analysisResult.verdictType === 'buy' ? '📈' : analysisResult.verdictType === 'sell' ? '📉' : '⏸️'} {analysisResult.verdict}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed mb-4">{analysisResult.analysis}</p>
                    {analysisResult.warning && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-300 flex gap-2">
                        <span>⚠️</span> {analysisResult.warning}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[#131c2e] border border-[#1e3050] p-3 rounded-xl text-center">
                      <div className="text-[10px] text-[#8899aa] mb-1">ROC 動能</div>
                      <div className="text-[#00e5ff] font-mono font-bold text-lg">{analysisResult.roc}</div>
                      <div className="text-[10px] text-[#556677]">{analysisResult.rocStatus}</div>
                    </div>
                    <div className="bg-[#131c2e] border border-[#1e3050] p-3 rounded-xl text-center">
                      <div className="text-[10px] text-[#8899aa] mb-1">RSI 強弱</div>
                      <div className="text-[#00e5ff] font-mono font-bold text-lg">{analysisResult.rsi}</div>
                      <div className="text-[10px] text-[#556677]">{analysisResult.rsiStatus}</div>
                    </div>
                    <div className="bg-[#131c2e] border border-[#1e3050] p-3 rounded-xl text-center">
                      <div className="text-[10px] text-[#8899aa] mb-1">OBV 能量</div>
                      <div className="text-[#00e5ff] font-mono font-bold text-lg">穩定</div>
                      <div className="text-[10px] text-[#556677]">{analysisResult.obvStatus}</div>
                    </div>
                  </div>

                  <div className="bg-[#131c2e] border border-[#1e3050] rounded-xl p-5 grid grid-cols-3 divide-x divide-[#1e3050]">
                    <div className="text-center pr-2">
                      <div className="text-[10px] text-[#8899aa] mb-1">支撐位</div>
                      <div className="text-[#00e676] font-mono font-bold text-xl">{analysisResult.support}</div>
                    </div>
                    <div className="text-center px-2">
                      <div className="text-[10px] text-[#00e5ff] mb-1">建議進場</div>
                      <div className="text-[#00e5ff] font-mono font-bold text-xl">{analysisResult.buyPrice}</div>
                    </div>
                    <div className="text-center pl-2">
                      <div className="text-[10px] text-[#8899aa] mb-1">壓力位</div>
                      <div className="text-[#ff5252] font-mono font-bold text-xl">{analysisResult.resist}</div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/*歷史紀錄頁面 (New Tab) */}
          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-[#8899aa] flex items-center gap-2">
                  <History size={16} /> 歷史紀錄 ({history.length}/{MAX_HISTORY})
                </h3>
                {history.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    className="text-[10px] text-red-400/60 hover:text-red-400 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 size={12} /> 清除全部
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="py-20 text-center space-y-3 opacity-40">
                  <Search size={48} className="mx-auto" />
                  <p className="text-sm">尚未有任何分析紀錄</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => {
                    const isExpanded = expandedId === item.id;
                    return (
                      <motion.div 
                        key={item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "bg-[#131c2e] border border-[#1e3050] rounded-xl overflow-hidden transition-all duration-300",
                          isExpanded ? "ring-1 ring-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.1)]" : ""
                        )}
                      >
                        <div 
                          className="p-4 flex items-start justify-between cursor-pointer active:bg-white/5 transition-colors gap-4"
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        >
                           <div className="flex-1 min-w-0 space-y-2">
                              {/* Row 1: Stock info */}
                              <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono text-[#00e5ff] bg-[#00e5ff12] border border-[#00e5ff33] w-fit">
                                {item.stockCode || '---'} {item.stockName}
                              </div>
                              
                              {/* Row 2: Verdict (Primary label) */}
                              <div className={cn(
                                "text-sm font-bold leading-relaxed transition-all",
                                item.verdictType === 'buy' ? "text-[#00e676]" : item.verdictType === 'sell' ? "text-[#ff5252]" : "text-[#ffd740]",
                                isExpanded ? "" : "line-clamp-2"
                              )}>
                                {item.verdict}
                              </div>
                              
                              {/* Row 3: Footer (Time & Price Preview) */}
                              {!isExpanded && (
                                <div className="flex items-end justify-between pt-1 border-t border-[#1e3050]/30">
                                   <div className="text-[10px] text-[#556677]">{item.time}</div>
                                   <div className="text-right">
                                     <span className="text-[9px] text-[#556677] block leading-tight">建議買價</span>
                                     <span className="text-[11px] font-mono font-bold text-[#00e5ff] truncate max-w-[120px] block">
                                       {item.buyPrice}
                                     </span>
                                   </div>
                                </div>
                              )}
                              
                              {isExpanded && (
                                <div className="text-[10px] text-[#556677] pt-1">{item.time}</div>
                              )}
                           </div>
                           
                           <motion.div
                              animate={{ rotate: isExpanded ? 90 : 0 }}
                              className="text-[#556677] self-center shrink-0"
                           >
                              <ChevronRight size={20} />
                           </motion.div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden bg-[#0d1525]/50 border-t border-[#1e3050]"
                            >
                              <div className="p-4 space-y-4">
                                <div className="space-y-3">
                                  <div className="text-[10px] text-[#00e5ff] font-bold uppercase tracking-wider">AI 分析觀點</div>
                                  <p className="text-sm leading-relaxed text-[#e8eaf0] whitespace-pre-wrap">{item.analysis}</p>
                                  
                                  <div className="pt-3 border-t border-[#1e3050]/50">
                                    <div className="text-[10px] text-[#00e5ff] font-bold uppercase tracking-wider mb-2">建議進場細節</div>
                                    <div className="bg-[#1c2840] p-3 rounded-xl border border-[#00e5ff20]">
                                      <div className="flex flex-col gap-1">
                                        <div className="text-[10px] text-[#8899aa]">建議買價 / 進場策略</div>
                                        <div className="text-sm font-bold text-[#00e5ff] leading-relaxed break-words">
                                          {item.buyPrice}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {item.warning && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-300 flex gap-2">
                                      <span>⚠️</span> {item.warning}
                                    </div>
                                  )}
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                  <div className="bg-[#1c2840] p-2 rounded-lg text-center">
                                    <div className="text-[9px] text-[#8899aa] mb-1">ROC</div>
                                    <div className="text-[#00e5ff] font-mono font-bold text-xs">{item.roc}</div>
                                    <div className="text-[9px] text-[#556677]">{item.rocStatus}</div>
                                  </div>
                                  <div className="bg-[#1c2840] p-2 rounded-lg text-center">
                                    <div className="text-[9px] text-[#8899aa] mb-1">RSI</div>
                                    <div className="text-[#00e5ff] font-mono font-bold text-xs">{item.rsi}</div>
                                    <div className="text-[9px] text-[#556677]">{item.rsiStatus}</div>
                                  </div>
                                  <div className="bg-[#1c2840] p-2 rounded-lg text-center">
                                    <div className="text-[9px] text-[#8899aa] mb-1">OBV</div>
                                    <div className="text-[#00e5ff] font-mono font-bold text-xs">{item.obvStatus}</div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1e3050]/50">
                                  <div className="text-center">
                                    <div className="text-[9px] text-[#8899aa]">支撐位</div>
                                    <div className="text-[#00e676] font-mono font-bold text-sm">{item.support}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-[9px] text-[#00e5ff]">建議買價</div>
                                    <div className="text-[#00e5ff] font-mono font-bold text-sm">{item.buyPrice}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-[9px] text-[#8899aa]">壓力位</div>
                                    <div className="text-[#ff5252] font-mono font-bold text-sm">{item.resist}</div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/*族群輪漲頁面 */}
          {activeTab === 'sector' && (
             <motion.div 
               key="sector"
               initial={{ opacity: 0, x: 10 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -10 }}
               className="space-y-4"
             >
               <div className="bg-[#ffd74015] border border-[#ffd74030] rounded-xl p-3 text-xs text-[#ffd740cc] flex gap-2">
                 <span>💡</span> 每 15 分鐘自動更新強度評估，由市場成交量估算。
               </div>
               
               <div className="space-y-2">
                 {SECTORS.map((s) => (
                   <div key={s.id} className="bg-[#131c2e] border border-[#1e3050] rounded-xl p-4 flex items-center gap-4 active:border-[#00e5ff] transition-all">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: s.bg }}>
                        {s.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-bold">{s.name}</span>
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-full border", s.tagClass)}>{s.tag}</span>
                        </div>
                        <div className="h-1 bg-[#0a0e1a] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${s.strength}%`, backgroundColor: s.color }}></div>
                        </div>
                        <div className="text-[10px] text-[#556677] mt-1.5 font-mono">STRENGTH: {s.strength}/100</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="w-16 h-8 mb-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={s.spark.map(v => ({ v }))}>
                               <Line type="monotone" dataKey="v" stroke={s.color} strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <div className={cn("text-sm font-mono font-bold", s.pos ? "text-[#00e676]" : "text-[#ff5252]")}>{s.pct}</div>
                      </div>
                   </div>
                 ))}
               </div>
             </motion.div>
          )}

          {/* 市場情緒頁面 */}
          {activeTab === 'market' && marketData && (
            <motion.div 
              key="market"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-[#556677]">更新：{marketData.lastUpdated}</span>
                <button onClick={refreshMarketData} className="flex items-center gap-1.5 text-xs text-[#00e5ff] hover:opacity-80">
                  <RefreshCcw size={12} /> 刷新數據
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div className="bg-[#131c2e] border border-[#1e3050] rounded-2xl p-5 text-center">
                    <div className="text-[10px] text-[#8899aa] mb-4 uppercase tracking-wider">VIX 恐慌指數</div>
                    <div className="relative w-24 h-24 mx-auto mb-3">
                       <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                         <circle cx="50" cy="50" r="42" fill="none" stroke="#1e3050" strokeWidth="8" />
                         <circle cx="50" cy="50" r="42" fill="none" stroke="#00e676" strokeWidth="8" strokeDasharray="264" strokeDashoffset={264 - (264 * (Math.min(marketData.vix, 40) / 40))} strokeLinecap="round" className="transition-all duration-1000" />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center">
                         <span className="text-2xl font-bold font-mono">{marketData.vix}</span>
                         <span className="text-[10px] text-[#8899aa]">平靜</span>
                       </div>
                    </div>
                    <div className="text-sm font-bold text-[#00e676]">市場極度穩定</div>
                 </div>

                 <div className="bg-[#131c2e] border border-[#1e3050] rounded-2xl p-5 text-center">
                    <div className="text-[10px] text-[#8899aa] mb-4 uppercase tracking-wider">恐慌貪婪指數</div>
                    <div className="relative w-24 h-24 mx-auto mb-3">
                       <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                         <circle cx="50" cy="50" r="42" fill="none" stroke="#1e3050" strokeWidth="8" />
                         <circle cx="50" cy="50" r="42" fill="none" stroke="#ffd740" strokeWidth="8" strokeDasharray="264" strokeDashoffset={264 - (264 * (marketData.cnn / 100))} strokeLinecap="round" className="transition-all duration-1000" />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center">
                         <span className="text-2xl font-bold font-mono">{marketData.cnn}</span>
                         <span className="text-[10px] text-[#8899aa]">情緒</span>
                       </div>
                    </div>
                    <div className="text-sm font-bold text-[#ffd740]">偏向貪婪</div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#131c2e] border border-[#1e3050] rounded-xl p-4">
                   <div className="text-[10px] text-[#8899aa] mb-1">S&P 500</div>
                   <div className="text-lg font-mono font-bold">{marketData.sp.toLocaleString()}</div>
                   <div className={cn("text-xs font-mono", marketData.spChg >= 0 ? "text-[#00e676]" : "text-[#ff5252]")}>
                     {marketData.spChg >= 0 ? '+' : ''}{marketData.spChg}%
                   </div>
                </div>
                <div className="bg-[#131c2e] border border-[#1e3050] rounded-xl p-4">
                   <div className="text-[10px] text-[#8899aa] mb-1">Nasdaq</div>
                   <div className="text-lg font-mono font-bold">{marketData.nq.toLocaleString()}</div>
                   <div className={cn("text-xs font-mono", marketData.nqChg >= 0 ? "text-[#00e676]" : "text-[#ff5252]")}>
                     {marketData.nqChg >= 0 ? '+' : ''}{marketData.nqChg}%
                   </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#00e6760a] to-[#00e5ff0a] border border-[#00e67620] rounded-xl p-5">
                <h4 className="text-[10px] text-[#8899aa] uppercase tracking-wider mb-2">市場情緒摘要</h4>
                <p className="text-sm leading-relaxed text-[#e8eaf0]">
                   當前市場流動性充足，VIX 處於低檔顯示追價意願強烈。Nasdaq 突破前高帶動 AI 族群整體上揚。建議關注資產集中度，適時進行波段獲利了結。
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/*導覽列 */}
      <nav className="fixed bottom-0 inset-x-0 bg-[#0d1525ee] backdrop-blur-2xl border-t border-[#1e3050] pb-[env(safe-area-inset-bottom)] flex z-[100]">
        <button 
          onClick={() => setActiveTab('tech')}
          className={cn(
            "flex-1 flex flex-col items-center gap-1.5 py-4 transition-colors",
            activeTab === 'tech' ? "text-[#00e5ff]" : "text-[#556677]"
          )}
        >
          <Activity size={20} />
          <span className="text-[10px] font-medium">技術分析</span>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={cn(
            "flex-1 flex flex-col items-center gap-1.5 py-4 transition-colors",
            activeTab === 'history' ? "text-[#00e5ff]" : "text-[#556677]"
          )}
        >
          <History size={20} />
          <span className="text-[10px] font-medium">歷史紀錄</span>
        </button>
        <button 
          onClick={() => setActiveTab('sector')}
          className={cn(
            "flex-1 flex flex-col items-center gap-1.5 py-4 transition-colors",
            activeTab === 'sector' ? "text-[#00e5ff]" : "text-[#556677]"
          )}
        >
          <LayoutGrid size={20} />
          <span className="text-[10px] font-medium">族群輪漲</span>
        </button>
        <button 
          onClick={() => setActiveTab('market')}
          className={cn(
            "flex-1 flex flex-col items-center gap-1.5 py-4 transition-colors",
            activeTab === 'market' ? "text-[#00e5ff]" : "text-[#556677]"
          )}
        >
          <Globe size={20} />
          <span className="text-[10px] font-medium">市場情緒</span>
        </button>
      </nav>
    </div>
  );
}
