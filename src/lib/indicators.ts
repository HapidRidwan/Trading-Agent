// Technical Indicator Calculation Engine for Trading Agent
import { Candle, TechnicalIndicators } from './types';

// Calculate Simple Moving Average
export function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j];
      }
      sma.push(sum / period);
    }
  }
  return sma;
}

// Calculate Exponential Moving Average
export function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  let initialSMA = 0;
  for (let i = 0; i < period; i++) {
    initialSMA += data[i] || 0;
  }
  initialSMA = initialSMA / period;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ema.push(NaN);
    } else if (i === period - 1) {
      ema.push(initialSMA);
    } else {
      const prevEMA = ema[i - 1];
      const currentEMA = (data[i] - prevEMA) * multiplier + prevEMA;
      ema.push(currentEMA);
    }
  }
  return ema;
}

// Calculate Average True Range (ATR)
export function calculateATR(candles: Candle[], period: number = 14): number[] {
  const tr: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      tr.push(candles[i].high - candles[i].low);
    } else {
      const highLow = candles[i].high - candles[i].low;
      const highPrevClose = Math.abs(candles[i].high - candles[i - 1].close);
      const lowPrevClose = Math.abs(candles[i].low - candles[i - 1].close);
      tr.push(Math.max(highLow, highPrevClose, lowPrevClose));
    }
  }

  // Smooth with Wilder's Smoothing
  const atr: number[] = [];
  let sumFirstTR = 0;
  for (let i = 0; i < period && i < tr.length; i++) {
    sumFirstTR += tr[i];
  }

  for (let i = 0; i < tr.length; i++) {
    if (i < period - 1) {
      atr.push(NaN);
    } else if (i === period - 1) {
      atr.push(sumFirstTR / period);
    } else {
      const prevATR = atr[i - 1];
      atr.push((prevATR * (period - 1) + tr[i]) / period);
    }
  }
  return atr;
}

// Calculate Relative Strength Index (RSI)
export function calculateRSI(candles: Candle[], period: number = 14): number[] {
  const rsi: number[] = [];
  if (candles.length <= period) return rsi;

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? Math.abs(diff) : 0);
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // First RSI value
  for (let i = 0; i < period; i++) {
    rsi.push(NaN);
  }

  const initialRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi.push(100 - 100 / (1 + initialRS));

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }
  }

  return rsi;
}

// Calculate Average Directional Index (ADX)
export function calculateADX(candles: Candle[], period: number = 14): number[] {
  const len = candles.length;
  const adxResult: number[] = new Array(len).fill(NaN);
  if (len < period * 2) return adxResult;

  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 0; i < len; i++) {
    if (i === 0) {
      tr.push(candles[i].high - candles[i].low);
      plusDM.push(0);
      minusDM.push(0);
    } else {
      const upMove = candles[i].high - candles[i - 1].high;
      const downMove = candles[i - 1].low - candles[i].low;

      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);

      const highLow = candles[i].high - candles[i].low;
      const highPrevClose = Math.abs(candles[i].high - candles[i - 1].close);
      const lowPrevClose = Math.abs(candles[i].low - candles[i - 1].close);
      tr.push(Math.max(highLow, highPrevClose, lowPrevClose));
    }
  }

  // Smooth TR, +DM, -DM with Wilder's technique
  let smoothTR = tr.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothPlusDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothMinusDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

  const dx: number[] = new Array(len).fill(NaN);

  for (let i = period - 1; i < len; i++) {
    if (i > period - 1) {
      smoothTR = smoothTR - smoothTR / period + tr[i];
      smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i];
      smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i];
    }

    const plusDI = smoothTR === 0 ? 0 : (smoothPlusDM / smoothTR) * 100;
    const minusDI = smoothTR === 0 ? 0 : (smoothMinusDM / smoothTR) * 100;
    const diSum = plusDI + minusDI;
    const diDiff = Math.abs(plusDI - minusDI);
    dx[i] = diSum === 0 ? 0 : (diDiff / diSum) * 100;
  }

  // Calculate ADX as smoothed DX
  const firstValidDxIdx = period * 2 - 2;
  if (firstValidDxIdx < len) {
    let adxSum = 0;
    for (let i = period - 1; i <= firstValidDxIdx; i++) {
      adxSum += dx[i] || 0;
    }
    let currentADX = adxSum / period;
    adxResult[firstValidDxIdx] = currentADX;

    for (let i = firstValidDxIdx + 1; i < len; i++) {
      currentADX = (currentADX * (period - 1) + (dx[i] || 0)) / period;
      adxResult[i] = currentADX;
    }
  }

  return adxResult;
}

// Calculate Bollinger Bands
export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): { upper: number[]; middle: number[]; lower: number[]; bandwidth: number[] } {
  const sma = calculateSMA(closes, period);
  const upper: number[] = [];
  const middle: number[] = [];
  const lower: number[] = [];
  const bandwidth: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1 || isNaN(sma[i])) {
      upper.push(NaN);
      middle.push(NaN);
      lower.push(NaN);
      bandwidth.push(NaN);
    } else {
      let sumSqDiff = 0;
      for (let j = 0; j < period; j++) {
        const diff = closes[i - j] - sma[i];
        sumSqDiff += diff * diff;
      }
      const stdDev = Math.sqrt(sumSqDiff / period);
      const up = sma[i] + stdDevMultiplier * stdDev;
      const low = sma[i] - stdDevMultiplier * stdDev;

      upper.push(up);
      middle.push(sma[i]);
      lower.push(low);
      bandwidth.push(((up - low) / sma[i]) * 100);
    }
  }

  return { upper, middle, lower, bandwidth };
}

// Extract Micro Swing Highs & Lows from recent M1 candles
export function findMicroSwings(
  candles: Candle[],
  lookback: number = 20
): { swingHigh: number; swingLow: number } {
  const slice = candles.slice(-lookback);
  let swingHigh = -Infinity;
  let swingLow = Infinity;

  for (const c of slice) {
    if (c.high > swingHigh) swingHigh = c.high;
    if (c.low < swingLow) swingLow = c.low;
  }

  return {
    swingHigh: isFinite(swingHigh) ? swingHigh : candles[candles.length - 1].close,
    swingLow: isFinite(swingLow) ? swingLow : candles[candles.length - 1].close,
  };
}

// Comprehensive indicator pack computation
export function computeTechnicalIndicators(
  candles: Candle[],
  spreadPips: number = 1.5,
  pipSize: number = 0.0001
): TechnicalIndicators {
  const closes = candles.map((c) => c.close);
  const len = candles.length;

  const ema20Arr = calculateEMA(closes, 20);
  const ema50Arr = calculateEMA(closes, 50);
  const adxArr = calculateADX(candles, 14);
  const rsiArr = calculateRSI(candles, 14);
  const atrArr = calculateATR(candles, 14);
  const bb = calculateBollingerBands(closes, 20, 2);

  const lastIdx = len - 1;
  const ema20 = ema20Arr[lastIdx] || closes[lastIdx];
  const ema50 = ema50Arr[lastIdx] || closes[lastIdx];
  const adx14 = isNaN(adxArr[lastIdx]) ? 24 : adxArr[lastIdx];
  const rsi14 = isNaN(rsiArr[lastIdx]) ? 50 : rsiArr[lastIdx];
  const atr14 = isNaN(atrArr[lastIdx]) ? pipSize * 15 : atrArr[lastIdx];

  const bbUpper = bb.upper[lastIdx] || closes[lastIdx] + atr14;
  const bbMiddle = bb.middle[lastIdx] || closes[lastIdx];
  const bbLower = bb.lower[lastIdx] || closes[lastIdx] - atr14;
  const bbWidth = bb.bandwidth[lastIdx] || 0.15;

  const emaSlopeBullish = ema20 > ema50;
  const atrInPips = atr14 / pipSize;
  const spreadPercentOfAtr = atrInPips > 0 ? (spreadPips / atrInPips) * 100 : 10;

  return {
    ema20,
    ema50,
    adx14: Number(adx14.toFixed(1)),
    rsi14: Number(rsi14.toFixed(1)),
    atr14,
    bbUpper,
    bbMiddle,
    bbLower,
    bbWidth: Number(bbWidth.toFixed(3)),
    emaSlopeBullish,
    spreadPips,
    spreadPercentOfAtr: Number(spreadPercentOfAtr.toFixed(1)),
  };
}
