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
      return 30 * 1000; // 30 seconds (Protects Twelve Data quota: max 2 calls/min vs 8/min limit)
  }
}

// ============================================================================
// 1. SWISSQUOTE LIVE INSTITUTIONAL FEED (GRATIS, TANPA KEY, REAL-TIME 1 DETIK)
// ============================================================================
export interface SwissquoteLiveQuote {
  bid: number;
  ask: number;
  midPrice: number;
  spreadPips: number;
}

async function fetchSwissquoteLiveQuote(pair: SupportedPair): Promise<SwissquoteLiveQuote | null> {
  try {
    const parts = pair.split('/');
    if (parts.length !== 2) return null;
    const base = parts[0];
    const quote = parts[1];

    const url = `https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/${encodeURIComponent(
      base
    )}/${encodeURIComponent(quote)}?_t=${Date.now()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const json = await res.json();
    if (!Array.isArray(json) || json.length === 0) return null;

    const profiles = json[0]?.spreadProfilePrices;
    if (!Array.isArray(profiles) || profiles.length === 0) return null;

    const item = profiles[0];
    const bid = typeof item.bid === 'number' ? item.bid : parseFloat(item.bid);
    const ask = typeof item.ask === 'number' ? item.ask : parseFloat(item.ask);

    if (isNaN(bid) || isNaN(ask) || bid <= 0 || ask <= 0) return null;

    const midPrice = (bid + ask) / 2;
    const config = PAIR_CONFIGS[pair] || PAIR_CONFIGS['XAU/USD'];
    const spreadPips = Number(((ask - bid) / config.pipSize).toFixed(1));

    return {
      bid,
      ask,
      midPrice,
      spreadPips: Math.max(0.1, spreadPips),
    };
  } catch {
    return null;
  }
}

// ============================================================================
// 2. TWELVE DATA HELPERS
// ============================================================================
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
    const tdInterval = getTwelveDataInterval(timeframe);
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(
      pair
    )}&interval=${tdInterval}&outputsize=${count}&apikey=${apiKey}`;

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
      json.code === 401 ||
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
// 3. YAHOO FINANCE CHART API (GRATIS TANPA API KEY, CACHE-BUSTER NO-CACHE)
// ============================================================================
function getYahooFinanceSymbol(pair: SupportedPair): string {
  switch (pair) {
    case 'XAU/USD':
      return 'GC=F'; // Gold Continuous Futures (sangat aktif dan real-time)
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
): Promise<{ candles: Candle[]; regularMarketPrice?: number } | null> {
  try {
    const symbol = getYahooFinanceSymbol(pair);
    const { interval, range } = getYahooFinanceIntervalAndRange(timeframe);
    // Cache-buster parameter &_t=${Date.now()} to prevent stale cache responses
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?interval=${interval}&range=${range}&_t=${Date.now()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
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
    const sliced = candles.slice(-count);

    // Live price from Yahoo Finance meta
    const regularMarketPrice = result.meta?.regularMarketPrice;

    return {
      candles: sliced,
      regularMarketPrice: typeof regularMarketPrice === 'number' ? regularMarketPrice : undefined,
    };
  } catch (err: any) {
    console.warn('[YahooFinance] Fetch exception:', err.message);
    return null;
  }
}

// ============================================================================
// 4. FCS API HELPERS
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
// CORE DATA FETCH PIPELINE WITH SWISSQUOTE LIVE TICK INJECTION
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

  // Fetch Swissquote Live Institutional Quote (Real-time Bid/Ask/Mid & Spread)
  const sqQuote = await fetchSwissquoteLiveQuote(pair);

  // ------------------------------------------------------------------------
  // PRIORITAS 1: Twelve Data (TWELVEDATA_API_KEY / TWELVE_DATA_API_KEY)
  // ------------------------------------------------------------------------
  const tdKey = (process.env.TWELVEDATA_API_KEY || process.env.TWELVE_DATA_API_KEY || '')
    .replace(/['"]/g, '')
    .trim();

  console.log(`[TwelveData] Key loaded: ${tdKey ? 'YA (' + tdKey.slice(0, 4) + '***)' : 'KOSONG'}`);

  if (tdKey !== '') {
    candles = await fetchFromTwelveData(pair, timeframe, count, tdKey);
    if (candles && candles.length > 0) {
      activeSource = 'TwelveData';
      currentPrice = candles[candles.length - 1].close;
      if (sqQuote) {
        const last = candles[candles.length - 1];
        last.close = sqQuote.midPrice;
        last.high = Math.max(last.high, sqQuote.midPrice);
        last.low = Math.min(last.low, sqQuote.midPrice);
        currentPrice = sqQuote.midPrice;
        spreadPips = sqQuote.spreadPips;
      }
    }
  }

  // ------------------------------------------------------------------------
  // PRIORITAS 2: Yahoo Finance Historical Candles + Swissquote Live Tick
  // ------------------------------------------------------------------------
  if (!candles || candles.length === 0) {
    const yfResult = await fetchFromYahooFinance(pair, timeframe, count);
    if (yfResult && yfResult.candles.length > 0) {
      candles = yfResult.candles;

      // Injeksi Live Tick dari Swissquote jika tersedia
      if (sqQuote) {
        const last = candles[candles.length - 1];
        last.close = sqQuote.midPrice;
        last.high = Math.max(last.high, sqQuote.midPrice);
        last.low = Math.min(last.low, sqQuote.midPrice);
        currentPrice = sqQuote.midPrice;
        spreadPips = sqQuote.spreadPips;
        activeSource = 'Swissquote Live';
      } else {
        if (yfResult.regularMarketPrice) {
          const last = candles[candles.length - 1];
          last.close = yfResult.regularMarketPrice;
          last.high = Math.max(last.high, yfResult.regularMarketPrice);
          last.low = Math.min(last.low, yfResult.regularMarketPrice);
          currentPrice = yfResult.regularMarketPrice;
        } else {
          currentPrice = candles[candles.length - 1].close;
        }
        activeSource = 'YahooFinance';
      }
    }
  }

  // ------------------------------------------------------------------------
  // PRIORITAS 3: FCS API (FCSAPI_KEY) — Cadangan Ketiga
  // ------------------------------------------------------------------------
  if (!candles || candles.length === 0) {
    const fcsKey = (process.env.FCSAPI_KEY || '').replace(/['"]/g, '').trim();
    if (fcsKey !== '') {
      candles = await fetchFromFCSAPI(pair, timeframe, count, fcsKey);
      if (candles && candles.length > 0) {
        if (sqQuote) {
          const last = candles[candles.length - 1];
          last.close = sqQuote.midPrice;
          last.high = Math.max(last.high, sqQuote.midPrice);
          last.low = Math.min(last.low, sqQuote.midPrice);
          currentPrice = sqQuote.midPrice;
          spreadPips = sqQuote.spreadPips;
          activeSource = 'Swissquote Live';
        } else {
          activeSource = 'FCSAPI';
          currentPrice = candles[candles.length - 1].close;
        }
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

    // Even on simulator, inject real Swissquote mid price & spread if available!
    if (sqQuote && candles.length > 0) {
      const last = candles[candles.length - 1];
      last.close = sqQuote.midPrice;
      last.high = Math.max(last.high, sqQuote.midPrice);
      last.low = Math.min(last.low, sqQuote.midPrice);
      currentPrice = sqQuote.midPrice;
      spreadPips = sqQuote.spreadPips;
      activeSource = 'Swissquote Live';
    }
  } else if (!currentPrice && candles.length > 0) {
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
// MAIN GET HANDLER WITH IN-FLIGHT DEDUPLICATION & SMART CACHING (1s for 1m)
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
        // Save to in-memory cache (1s for 1m timeframe)
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
