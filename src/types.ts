export interface StockAnalysis {
  id: string;
  stockCode: string;
  stockName: string;
  verdict: string;
  verdictType: 'buy' | 'hold' | 'sell';
  analysis: string;
  warning?: string;
  roc: string;
  rocStatus: string;
  rsi: string;
  rsiStatus: string;
  obv: string;
  obvStatus: string;
  support: string;
  resist: string;
  buyPrice: string;
  time: string;
  imageUrl?: string;
}

export interface SectorData {
  id: string;
  name: string;
  tag: string;
  tagClass: string;
  strength: number;
  pct: string;
  pos: boolean;
  color: string;
  icon: string;
  bg: string;
  desc: string;
  stocks: { code: string; name: string }[];
  spark: number[];
}

export interface MarketData {
  vix: number;
  cnn: number;
  sp: number;
  spChg: number;
  nq: number;
  nqChg: number;
  pc: number;
  lastUpdated: string;
}
