// Realistic M1 Market Simulator and Pair Configurations
import { Candle, PairConfig, SupportedPair, Timeframe } from './types';

export const PAIR_CONFIGS: Record<SupportedPair, PairConfig> = {
  'XAU/USD': {
    symbol: 'XAU/USD',
    name: 'Gold / US Dollar',
    baseAsset: 'XAU',
    quoteAsset: 'USD',
    pipSize: 0.1, // $0.10 per pip
    pipValuePerStandardLot: 10, // 100 oz contract * $0.10 = $10 per pip
    digits: 2,
    contractSize: 100,
    defaultSpreadPips: 2.0, // 20 cents
  },
  'EUR/USD': {
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    baseAsset: 'EUR',
    quoteAsset: 'USD',
    pipSize: 0.0001,
    pipValuePerStandardLot: 10, // 100,000 * 0.0001 = $10 per pip
    digits: 5,
    contractSize: 100000,
    defaultSpreadPips: 1.2,
  },
  'GBP/USD': {
    symbol: 'GBP/USD',
    name: 'British Pound / US Dollar',
    baseAsset: 'GBP',
    quoteAsset: 'USD',
    pipSize: 0.0001,
    pipValuePerStandardLot: 10,
    digits: 5,
    contractSize: 100000,
    defaultSpreadPips: 1.6,
  },
  'USD/JPY': {
    symbol: 'USD/JPY',
    name: 'US Dollar / Japanese Yen',
    baseAsset: 'USD',
    quoteAsset: 'JPY',
    pipSize: 0.01,
    pipValuePerStandardLot: 6.7, // approx $6.70 at ~150 rate
    digits: 3,
    contractSize: 100000,
    defaultSpreadPips: 1.4,
  },
  'AUD/USD': {
    symbol: 'AUD/USD',
    name: 'Australian Dollar / US Dollar',
    baseAsset: 'AUD',
    quoteAsset: 'USD',
    pipSize: 0.0001,
    pipValuePerStandardLot: 10,
    digits: 5,
    contractSize: 100000,
    defaultSpreadPips: 1.5,
  },
  'BTC/USD': {
    symbol: 'BTC/USD',
    name: 'Bitcoin / US Dollar',
    baseAsset: 'BTC',
    quoteAsset: 'USD',
    pipSize: 1.0,
    pipValuePerStandardLot: 1.0,
    digits: 2,
    contractSize: 1,
    defaultSpreadPips: 12.0,
  },
};

const BASE_PRICES: Record<SupportedPair, number> = {
  'XAU/USD': 2645.8,
  'EUR/USD': 1.0865,
  'GBP/USD': 1.294,
  'USD/JPY': 154.3,
  'AUD/USD': 0.654,
  'BTC/USD': 89250.0,
};

// Simple pseudo-random generator with seed
function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export function timeframeToSeconds(tf: Timeframe): number {
  switch (tf) {
    case '1m':
      return 60;
    case '5m':
      return 300;
    case '15m':
      return 900;
    case '1h':
      return 3600;
    case '4h':
      return 14400;
    case '1d':
      return 86400;
    default:
      return 60;
  }
}

/**
 * Generate realistic historical and real-time candles
 * Supports dynamic cycle: Trending Bull -> Sideways -> Trending Bear -> News Spike
 */
export function generateRealisticCandles(
  pair: SupportedPair,
  timeframe: Timeframe = '1m',
  count: number = 120
): { candles: Candle[]; currentPrice: number; spreadPips: number; marketPhase: string } {
  const config = PAIR_CONFIGS[pair] || PAIR_CONFIGS['XAU/USD'];
  const basePrice = BASE_PRICES[pair] || 2650;
  const tfSec = timeframeToSeconds(timeframe);
  const nowSec = Math.floor(Date.now() / 1000);

  // Align to timeframe boundary
  const currentCandleTime = Math.floor(nowSec / tfSec) * tfSec;

  const volatility =
    pair === 'XAU/USD'
      ? 0.45 // ~45-80 cents per M1 candle
      : pair === 'BTC/USD'
      ? 25.0
      : pair === 'USD/JPY'
      ? 0.035
      : 0.00022; // ~2.2 pips per M1 candle

  const candles: Candle[] = [];
  let currentPrice = basePrice;

  // Global cycle based on current hour & minute
  const totalMinutes = Math.floor(nowSec / 60);
  const cyclePhase = (totalMinutes % 60) / 60; // 0.0 to 1.0

  let marketPhase = 'TRENDING_BULL';
  if (cyclePhase < 0.35) {
    marketPhase = 'TRENDING_BULL';
  } else if (cyclePhase < 0.65) {
    marketPhase = 'SIDEWAYS_RANGE';
  } else if (cyclePhase < 0.9) {
    marketPhase = 'TRENDING_BEAR';
  } else {
    marketPhase = 'NEWS_SPIKE';
  }

  // Pre-seed price starting from count candles in the past
  const startSec = currentCandleTime - (count - 1) * tfSec;

  for (let i = 0; i < count; i++) {
    const candleTime = startSec + i * tfSec;
    const seed = Math.floor(candleTime / 60);

    const r1 = seededRandom(seed * 7 + 1);
    const r2 = seededRandom(seed * 13 + 3);
    const r3 = seededRandom(seed * 17 + 5);
    const r4 = seededRandom(seed * 23 + 7);

    // Determine bias based on cycle and index
    const progress = i / count;
    let bias = 0;

    if (marketPhase === 'TRENDING_BULL') {
      bias = (r1 - 0.42) * volatility * 1.5;
    } else if (marketPhase === 'TRENDING_BEAR') {
      bias = (r1 - 0.58) * volatility * 1.5;
    } else if (marketPhase === 'SIDEWAYS_RANGE') {
      // Mean reversion pull towards basePrice
      const delta = currentPrice - basePrice;
      bias = (r1 - 0.5) * volatility * 0.8 - delta * 0.02;
    } else {
      // News Spike: extreme volatility
      const isSpikeCandle = i >= count - 8 && i <= count - 5;
      if (isSpikeCandle) {
        bias = (r1 > 0.5 ? 1 : -1) * volatility * 4.2;
      } else {
        bias = (r1 - 0.48) * volatility * 2.0;
      }
    }

    const open = Number(currentPrice.toFixed(config.digits));
    const close = Number((open + bias).toFixed(config.digits));

    // Wicks
    const maxBody = Math.max(open, close);
    const minBody = Math.min(open, close);

    const upperWick = r2 * volatility * (marketPhase === 'NEWS_SPIKE' ? 2.5 : 1.1);
    const lowerWick = r3 * volatility * (marketPhase === 'NEWS_SPIKE' ? 2.5 : 1.1);

    const high = Number((maxBody + upperWick).toFixed(config.digits));
    const low = Number((Math.max(0.0001, minBody - lowerWick)).toFixed(config.digits));

    const volume = Math.floor(50 + r4 * 450 + (marketPhase === 'NEWS_SPIKE' ? 800 : 0));

    candles.push({
      time: candleTime,
      open,
      high,
      low,
      close,
      volume,
    });

    currentPrice = close;
  }

  // Real-time second variation for the active candle
  const secondsIntoCandle = nowSec % tfSec;
  const tickOffset = (Math.sin(nowSec * 1.5) * 0.3 + (Math.random() - 0.5) * 0.2) * volatility;
  const lastCandle = candles[candles.length - 1];

  lastCandle.close = Number((lastCandle.close + tickOffset).toFixed(config.digits));
  if (lastCandle.close > lastCandle.high) lastCandle.high = lastCandle.close;
  if (lastCandle.close < lastCandle.low) lastCandle.low = lastCandle.close;

  const currentPriceFinal = lastCandle.close;

  // Spread simulation (slightly wider during news spike or night rollover)
  let spreadPips = config.defaultSpreadPips;
  if (marketPhase === 'NEWS_SPIKE') {
    spreadPips *= 2.2;
  }

  return {
    candles,
    currentPrice: currentPriceFinal,
    spreadPips: Number(spreadPips.toFixed(1)),
    marketPhase,
  };
}
