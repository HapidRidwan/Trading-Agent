// Types definition for Trading Agent

export type SupportedPair = 'XAU/USD' | 'EUR/USD' | 'GBP/USD' | 'USD/JPY' | 'AUD/USD' | 'BTC/USD';
export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PairConfig {
  symbol: string;
  name: string;
  baseAsset: string;
  quoteAsset: string;
  pipSize: number; // 0.0001 for EURUSD, 0.01 for USDJPY, 0.1 for XAUUSD
  pipValuePerStandardLot: number; // $10 for EURUSD, ~$6.7-$10 for USDJPY, $10 for XAUUSD (100 oz)
  digits: number;
  contractSize: number; // 100,000 for forex, 100 for XAUUSD
  defaultSpreadPips: number;
}

export type NewsImpact = 'High' | 'Medium' | 'Low';

export interface EconomicNewsEvent {
  id: string;
  time: string; // HH:mm WIB
  date: string; // YYYY-MM-DD
  currency: string; // USD, EUR, GBP, JPY, AUD
  event: string;
  impact: NewsImpact;
  forecast: string;
  previous: string;
  actual?: string;
  minutesUntil: number; // negative if passed, positive if upcoming
  isNewsSpikeRisk: boolean; // within -15 to +15 minutes
}

export type GateStatus = 'PASSED' | 'FAILED' | 'WARNING';

export interface GateResult {
  gateIndex: number;
  name: string;
  title: string;
  status: GateStatus;
  reason: string;
  educationNote: string;
  metrics?: Record<string, any>;
}

export interface TradeSetup {
  direction: 'BUY' | 'SELL';
  entry: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  rrRatio: number;
  suggestedLot: number;
  slPips: number;
  tp1Pips: number;
  tp2Pips: number;
  beRule: string; // "Geser SL ke Titik Impas (BE) saat harga menyentuh TP 1 (+1R)"
}

export interface ChartZone {
  type: 'SUPPLY' | 'DEMAND';
  top: number;
  bottom: number;
  label: string;
}

export interface ChartTrendline {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
}

export interface AIAnalysisResult {
  verdict: 'BUY' | 'SELL' | 'NO_TRADE' | 'WAIT';
  headline: string;
  confidenceScore: number; // 0 - 100
  gates: GateResult[];
  tradeSetup: TradeSetup | null;
  chartAnnotations: {
    supplyDemandZones: ChartZone[];
    trendlines: ChartTrendline[];
  };
  seniorAdvice: string;
  marketPhase: 'TRENDING_BULL' | 'TRENDING_BEAR' | 'SIDEWAYS_RANGE' | 'NEWS_SPIKE' | 'ROLLOVER';
  modelUsed: string;
  timestamp: number;
}

export interface TechnicalIndicators {
  ema20: number;
  ema50: number;
  adx14: number;
  rsi14: number;
  atr14: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  bbWidth: number;
  emaSlopeBullish: boolean;
  spreadPips: number;
  spreadPercentOfAtr: number;
}

export interface AccountSettings {
  balance: number;
  accountType: 'standard' | 'cent';
  leverage: number; // 100, 200, 500, 1000, 2000, etc.
  riskPercent: number; // default 1%
  dailyDrawdownLimitPercent: number; // default 3%
  maxConsecutiveSl: number; // default 2
}

export interface LotCalculation {
  mode: 'auto' | 'custom';
  lot: number;
  riskAmount: number;
  riskPercent: number;
  usedMargin: number;
  freeMargin: number;
  marginLevel: number;
  pipsBuffer: number;
  floatingLossSL: number;
  isOverLeveraged: boolean;
  warningMsg?: string;
  pipValue: number;
}

export interface JournalTrade {
  id: string;
  createdAt: string; // ISO string
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  pair: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  lot: number;
  entryPrice: number;
  exitPrice?: number;
  pnl: number; // USD (+ or -)
  pips?: number;
  status: 'WIN' | 'LOSS' | 'BE';
  source: 'AI_SIGNAL' | 'MANUAL';
  notes: string;
  tags?: string[];
}

export interface JournalSummary {
  startingBalance: number;
  currentBalance: number;
  totalPnl: number;
  pnlPercent: number;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number; // %
  profitFactor: number;
  bestTrade: number;
  worstTrade: number;
  todayLossAmount: number;
  todayConsecutiveLosses: number;
  isDrawdownLocked: boolean;
  drawdownLockReason?: string;
}
