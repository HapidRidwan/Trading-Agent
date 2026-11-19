import { NextRequest, NextResponse } from 'next/server';
import { SupportedPair } from '@/lib/types';
import { PAIR_CONFIGS } from '@/lib/marketSimulator';

export const dynamic = 'force-dynamic';

interface TickCacheEntry {
  data: {
    pair: SupportedPair;
    midPrice: number;
    bid: number;
    ask: number;
    spreadPips: number;
    timestamp: number;
  };
  cachedAt: number;
}

const tickCache = new Map<string, TickCacheEntry>();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pair = (searchParams.get('pair') as SupportedPair) || 'XAU/USD';
    const config = PAIR_CONFIGS[pair] || PAIR_CONFIGS['XAU/USD'];

    const now = Date.now();
    const cached = tickCache.get(pair);
    // Cache for 1000ms max
    if (cached && now - cached.cachedAt < 1000) {
      return NextResponse.json(cached.data);
    }

    let bid = 0;
    let ask = 0;
    let midPrice = 0;
    let spreadPips = config.defaultSpreadPips;

    if (pair === 'BTC/USD') {
      // Binance public bookTicker for real-time crypto ticks
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/bookTicker?symbol=BTCUSDT', {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          cache: 'no-store',
        });
        if (res.ok) {
          const j = await res.json();
          bid = parseFloat(j.bidPrice);
          ask = parseFloat(j.askPrice);
          if (bid > 0 && ask > 0) {
            midPrice = (bid + ask) / 2;
            spreadPips = Number(((ask - bid) / config.pipSize).toFixed(1));
          }
        }
      } catch (err) {
        // Ignore and fallback below
      }
    } else {
      // Swissquote Public Institutional Feed for Forex & Gold
      const parts = pair.split('/');
      const base = parts[0];
      const quote = parts[1];
      const url = `https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/${encodeURIComponent(
        base
      )}/${encodeURIComponent(quote)}?_t=${now}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      try {
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

        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json) && json.length > 0) {
            const profiles = json[0]?.spreadProfilePrices;
            if (Array.isArray(profiles) && profiles.length > 0) {
              const item = profiles[0];
              const b = typeof item.bid === 'number' ? item.bid : parseFloat(item.bid);
              const a = typeof item.ask === 'number' ? item.ask : parseFloat(item.ask);

              if (!isNaN(b) && !isNaN(a) && b > 0 && a > 0) {
                bid = b;
                ask = a;
                midPrice = (b + a) / 2;
                spreadPips = Number(((a - b) / config.pipSize).toFixed(1));
              }
            }
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
      }
    }

    // Fallback if network issue
    if (midPrice === 0) {
      if (cached) {
        return NextResponse.json(cached.data);
      }
      // Minimal fallback to avoid NaN
      midPrice = pair === 'XAU/USD' ? 2650.0 : 1.085;
      bid = midPrice - (config.defaultSpreadPips * config.pipSize) / 2;
      ask = midPrice + (config.defaultSpreadPips * config.pipSize) / 2;
    }

    const payload = {
      pair,
      midPrice,
      bid,
      ask,
      spreadPips: Math.max(0.1, spreadPips),
      timestamp: now,
    };

    tickCache.set(pair, { data: payload, cachedAt: now });
    return NextResponse.json(payload);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Gagal mengambil tick live', details: err.message },
      { status: 500 }
    );
  }
}
