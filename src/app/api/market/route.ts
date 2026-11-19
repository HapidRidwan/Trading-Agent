import { NextRequest, NextResponse } from 'next/server';
import { generateRealisticCandles, PAIR_CONFIGS } from '@/lib/marketSimulator';
import { Candle, SupportedPair, Timeframe } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface CacheEntry {
  data: any;
  timestamp: number;
}

// In-memory cache for timeframes to save API quota
const cache = new Map<string, CacheEntry>();

// In-flight request deduplication map to prevent parallel duplicate provider requests
const inFlightRequests = new Map<string, Promise<any>>();

function getCacheTTL(timeframe: Timeframe): number {
  switch (timeframe) {
    case '1h':
    case '4h':
    case '1d':
      return 10 * 60 * 1000; // 10 minutes
    case '15m':
      return 3 * 60 * 1000; // 3 minutes
    case '5m':
    case '1m':
    default:
      return 15 * 1000; // 15 seconds (prevents rate limits on free tiers)
  }
}

// ============================================================================
// 1. TWELVE DATA HELPERS
// ============================================================================
function getTwelveDataSymbol(pair: SupportedPair): string {
  switch (pair) {
    case 'XAU/USD':
      return 'XAU/USD';
    case 'EUR/USD':
      return 'EUR/USD';
    case 'GBP/USD':
      return 'GBPUSD';
    case 'USD/JPY':
      return 'USD/JPY';
    case 'AUD/USD':
      return 'AUD/USD';
    case 'BTC/USD':
      return 'BTC/USD';
    default:
      return 'XAU/USD';
  }
}

function getTwelveDataInterval(tf: Timeframe): string {
  switch (tf) {
    case '1m':
      return '1min';
    case '5m':
      return '5min';
    case '15m':
      return '15min';
    case '1h':
      return '1h';
    case '4h':
      return '4h';
    case '1d':
      return '1day';
    default:
      return '1min';
  }
}

async function fetchFromTwelveData(
  pair: SupportedPair,
  timeframe: Timeframe,
  count: number,
  apiKey: string
): Promise<Candle[] | null> {
  try {
    const symbol = getTwelveDataSymbol(pair);
    const interval = getTwelveDataInterval(timeframe);
    const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&outputsize=${count}&apikey=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    const rawText = await res.text();
    let json: any = {};
    try {
      json = JSON.parse(rawText);
    } catch {
      json = { raw: rawText };
    }

    if (!res.ok) {
      console.warn(`[TwelveData] HTTP Error ${res.status}:`, JSON.stringify(json));
      return null;
    }

    if (
      json.status === 'error' ||
      json.code === 429 ||
      !json.values ||
      !Array.isArray(json.values) ||
      json.values.length === 0
    ) {
      console.warn(
        '[TwelveData] API rejected or empty response:',
        JSON.stringify({
          code: json.code,
          message: json.message,
          status: json.status,
        })
      );
      return null;
    }

    // TwelveData returns newest first; reverse to chronological order
    const values = [...json.values].reverse();
    return values.map((v: any) => ({
      time: Math.floor(new Date(v.datetime).getTime() / 1000),
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: v.volume ? parseFloat(v.volume) : 100,
    }));
  } catch (err: any) {
    console.warn('[TwelveData] Fetch exception:', err.message);
    return null;
  }
}

// ============================================================================
// 2. YAHOO FINANCE CHART API (GRATIS TANPA API KEY, 100% STABIL)
// ============================================================================
function getYahooFinanceSymbol(pair: SupportedPair): string {
  switch (pair) {
    case 'XAU/USD':
      return 'GC=F'; // Gold Continuous Futures
    case 'EUR/USD':
      return 'EURUSD=X';
    case 'GBP/USD':
      return 'GBPUSD=X';
    case 'USD/JPY':
      return 'USDJPY=X';
    case 'AUD/USD':
      return 'AUDUSD=X';
    case 'BTC/USD':
      return 'BTC-USD';
    default:
      return 'GC=F';
  }
}

function getYahooFinanceIntervalAndRange(tf: Timeframe): { interval: string; range: string } {
  switch (tf) {
    case '1m':
      return { interval: '1m', range: '1d' };
    case '5m':
      return { interval: '5m', range: '5d' };
    case '15m':
      return { interval: '15m', range: '5d' };
    case '1h':
      return { interval: '60m', range: '1mo' };
    case '4h':
      return { interval: '60m', range: '1mo' };
    case '1d':
      return { interval: '1d', range: '1y' };
    default:
      return { interval: '1m', range: '1d' };
  }
}

async function fetchFromYahooFinance(
  pair: SupportedPair,
  timeframe: Timeframe,
  count: number
): Promise<Candle[] | null> {
  try {
    const symbol = getYahooFinanceSymbol(pair);
    const { interval, range } = getYahooFinanceIntervalAndRange(timeframe);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?interval=${interval}&range=${range}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[YahooFinance] HTTP Error: ${res.status}`);
      return null;
    }

    const json = await res.json();
    const result = json.chart?.result?.[0];
    if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
      console.warn('[YahooFinance] Invalid or empty chart payload');
      return null;
    }

    const timestamps: number[] = result.timestamp;
    const quote = result.indicators.quote[0];
    const opens: (number | null)[] = quote.open || [];
    const highs: (number | null)[] = quote.high || [];
    const lows: (number | null)[] = quote.low || [];
    const closes: (number | null)[] = quote.close || [];
    const volumes: (number | null)[] = quote.volume || [];

    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const o = opens[i];
      const h = highs[i];
      const l = lows[i];
      const c = closes[i];
      const t = timestamps[i];

      // Exclude null/missing price data points
      if (
        t &&
        o !== null &&
        h !== null &&
        l !== null &&
        c !== null &&
        !isNaN(o) &&
        !isNaN(c)
      ) {
        candles.push({
          time: t,
          open: Number(o),
          high: Number(h),
          low: Number(l),
          close: Number(c),
          volume: volumes[i] && !isNaN(volumes[i]!) ? Number(volumes[i]) : 100,
        });
      }
    }

    if (candles.length === 0) {
      console.warn('[YahooFinance] Zero valid candle entries parsed');
      return null;
    }

    // Sort chronologically ascending and slice to requested count
    candles.sort((a, b) => a.time - b.time);
    return candles.slice(-count);
  } catch (err: any) {
    console.warn('[YahooFinance] Fetch exception:', err.message);
    return null;
  }
}

// ============================================================================
// 3. FCS API HELPERS
// ============================================================================
async function fetchFromFCSAPI(
  pair: SupportedPair,
  timeframe: Timeframe,
  count: number,
  apiKey: string
): Promise<Candle[] | null> {
  try {
    const isCrypto = pair === 'BTC/USD';
    const symbol = pair; // FCS API format: XAU/USD, EUR/USD, etc.
    const period = timeframe; // 1m, 5m, 15m, 1h, 4h, 1d

    const baseUrl = isCrypto
      ? 'https://fcsapi.com/api-v3/crypto/history'
      : 'https://fcsapi.com/api-v3/forex/history';

    const url = `${baseUrl}?symbol=${encodeURIComponent(symbol)}&period=${period}&access_key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[FCSAPI] HTTP Error: ${res.status}`);
      return null;
    }

    const json = await res.json();
    if (!json.status || !json.response) {
      console.warn('[FCSAPI] API returned error:', json.msg || json.code);
      return null;
    }

    // FCS API response can be array or object with indexed keys
    const rawList = Array.isArray(json.response)
      ? json.response
      : Object.values(json.response);

    if (!rawList || rawList.length === 0) {
      return null;
    }

    const parsed: Candle[] = rawList
      .map((item: any) => ({
        time: item.t ? parseInt(item.t, 10) : Math.floor(new Date(item.tm).getTime() / 1000),
        open: parseFloat(item.o),
        high: parseFloat(item.h),
        low: parseFloat(item.l),
        close: parseFloat(item.c),
        volume: item.v ? parseFloat(item.v) : 100,
      }))
      .filter((c: Candle) => !isNaN(c.time) && !isNaN(c.close));

    // Sort chronologically ascending
    parsed.sort((a, b) => a.time - b.time);
    return parsed.slice(-count);
  } catch (err: any) {
    console.warn('[FCSAPI] Fetch exception:', err.message);
    return null;
  }
}

// ============================================================================
// CORE DATA FETCH PIPELINE WITH MULTI-PROVIDER AUTO-FAILOVER
// ============================================================================
async function executeFetchMarket(
  pair: SupportedPair,
  timeframe: Timeframe,
  count: number
) {
  const config = PAIR_CONFIGS[pair] || PAIR_CONFIGS['XAU/USD'];

  let candles: Candle[] | null = null;
  let activeSource = 'Simulator';
  let marketPhase = 'REAL_MARKET';
  let currentPrice = 0;
  let spreadPips = config.defaultSpreadPips;

  // ------------------------------------------------------------------------
  // PRIORITAS 1: Twelve Data (TWELVEDATA_API_KEY)
  // ------------------------------------------------------------------------
  const twelveDataKey = process.env.TWELVEDATA_API_KEY;
  if (twelveDataKey && twelveDataKey.trim() !== '') {
    candles = await fetchFromTwelveData(pair, timeframe, count, twelveDataKey.trim());
    if (candles && candles.length > 0) {
      activeSource = 'TwelveData';
    }
  }

  // ------------------------------------------------------------------------
  // PRIORITAS 2: Yahoo Finance Chart API (Gratis Tanpa API Key, 100% Stabil)
  // ------------------------------------------------------------------------
  if (!candles || candles.length === 0) {
    candles = await fetchFromYahooFinance(pair, timeframe, count);
    if (candles && candles.length > 0) {
      activeSource = 'YahooFinance';
    }
  }

  // ------------------------------------------------------------------------
  // PRIORITAS 3: FCS API (FCSAPI_KEY) — Cadangan Ketiga
  // ------------------------------------------------------------------------
  if (!candles || candles.length === 0) {
    const fcsKey = process.env.FCSAPI_KEY;
    if (fcsKey && fcsKey.trim() !== '') {
      candles = await fetchFromFCSAPI(pair, timeframe, count, fcsKey.trim());
      if (candles && candles.length > 0) {
        activeSource = 'FCSAPI';
      }
    }
  }

  // ------------------------------------------------------------------------
  // PRIORITAS 4: Realistic M1 Market Simulator — Cadangan Terakhir
  // ------------------------------------------------------------------------
  if (!candles || candles.length === 0) {
    const simulated = generateRealisticCandles(pair, timeframe, count);
    candles = simulated.candles;
    currentPrice = simulated.currentPrice;
    spreadPips = simulated.spreadPips;
    marketPhase = simulated.marketPhase;
    activeSource = 'Simulator';
  } else {
    currentPrice = candles[candles.length - 1].close;
  }

  return {
    pair,
    timeframe,
    candles,
    currentPrice,
    spreadPips,
    source: activeSource,
    marketPhase,
    timestamp: Date.now(),
  };
}

// ============================================================================
// MAIN GET HANDLER WITH IN-FLIGHT DEDUPLICATION & SMART CACHING
// ============================================================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pair = (searchParams.get('pair') as SupportedPair) || 'XAU/USD';
    const timeframe = (searchParams.get('timeframe') as Timeframe) || '1m';
    const count = parseInt(searchParams.get('count') || '120', 10);

    const cacheKey = `${pair}_${timeframe}_${count}`;
    const now = Date.now();
    const ttl = getCacheTTL(timeframe);

    // 1. Check in-memory cache to save provider API quotas
    const cached = cache.get(cacheKey);
    if (cached && now - cached.timestamp < ttl) {
      return NextResponse.json(cached.data);
    }

    // 2. In-Flight Request Deduplication: if another request for the same pair/timeframe
    // is already fetching right now, await its existing Promise instead of spawning a duplicate
    if (inFlightRequests.has(cacheKey)) {
      const data = await inFlightRequests.get(cacheKey)!;
      return NextResponse.json(data);
    }

    // 3. Initiate fetch with deduplication tracking
    const fetchPromise = (async () => {
      try {
        const result = await executeFetchMarket(pair, timeframe, count);
        // Save to in-memory cache
        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      } finally {
        inFlightRequests.delete(cacheKey);
      }
    })();

    inFlightRequests.set(cacheKey, fetchPromise);
    const payload = await fetchPromise;

    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('Market API error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data market', details: error.message },
      { status: 500 }
    );
  }
}
