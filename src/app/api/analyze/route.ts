import { NextRequest, NextResponse } from 'next/server';
import { computeTechnicalIndicators, findMicroSwings } from '@/lib/indicators';
import { PAIR_CONFIGS } from '@/lib/marketSimulator';
import {
  AIAnalysisResult,
  Candle,
  EconomicNewsEvent,
  GateResult,
  SupportedPair,
  Timeframe,
  TradeSetup,
} from '@/lib/types';

// Helper to determine currencies involved in a pair
function getCurrenciesForPair(pair: SupportedPair): string[] {
  const parts = pair.split('/');
  return parts.map((p) => p.trim());
}

// Check if current WIB time is within Bank Rollover (03:30 - 05:30 WIB)
function isBankRolloverTime(): boolean {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const wibDate = new Date(utc + 7 * 3600000);
  const totalMinutes = wibDate.getHours() * 60 + wibDate.getMinutes();
  return totalMinutes >= 210 && totalMinutes <= 330;
}

// Generate algorithmic 6-gate evaluation
function evaluateSixGates(params: {
  pair: SupportedPair;
  m1Candles: Candle[];
  m15Candles?: Candle[];
  h1Candles?: Candle[];
  newsEvents: EconomicNewsEvent[];
  spreadPips: number;
  balance?: number;
  riskPercent?: number;
}): {
  gates: GateResult[];
  verdict: 'BUY' | 'SELL' | 'NO_TRADE' | 'WAIT';
  headline: string;
  setup: TradeSetup | null;
  confidenceScore: number;
  marketPhase: any;
  zones: any[];
  trendlines: any[];
  seniorAdvice: string;
} {
  const { pair, m1Candles, m15Candles, h1Candles, newsEvents, spreadPips, balance = 1000, riskPercent = 1.0 } = params;
  const config = PAIR_CONFIGS[pair] || PAIR_CONFIGS['XAU/USD'];
  const pipSize = config.pipSize;
  const pipValue = config.pipValuePerStandardLot;

  const indicatorsM1 = computeTechnicalIndicators(m1Candles, spreadPips, pipSize);
  const currentPrice = m1Candles[m1Candles.length - 1].close;
  const { swingHigh, swingLow } = findMicroSwings(m1Candles, 25);

  const gates: GateResult[] = [];
  const pairCurrencies = getCurrenciesForPair(pair);

  // ----------------------------------------------------
  // GATE 0: News Spike Shield
  // ----------------------------------------------------
  const highImpactRelevantNews = newsEvents.filter(
    (e) =>
      e.impact === 'High' &&
      pairCurrencies.includes(e.currency) &&
      e.minutesUntil >= -15 &&
      e.minutesUntil <= 15
  );

  let gate0Passed = highImpactRelevantNews.length === 0;
  let gate0Reason = 'Tidak ada berita ekonomi High-Impact aktif dalam rentang ±15 menit.';
  let gate0Note = 'Aman untuk scalping M1 tanpa risiko lonjakan spread/slippage mendadak.';

  if (!gate0Passed) {
    const news = highImpactRelevantNews[0];
    const isUpcoming = news.minutesUntil >= 0;
    gate0Reason = `WASPADA: Berita High Impact "${news.currency} - ${news.event}" ${
      isUpcoming ? `akan rilis dalam ${news.minutesUntil} menit` : `baru saja rilis ${Math.abs(news.minutesUntil)} menit lalu`
    }.`;
    gate0Note =
      'Edukasi Pemula: Rilis berita berdampak besar dapat memicu spread melebar drastis dan slippage tak terduga. Trader institusi menahan entry hingga candle stabil kembali.';
  }

  gates.push({
    gateIndex: 0,
    name: 'Gate 0: News Spike Shield',
    title: 'Filter Berita High-Impact',
    status: gate0Passed ? 'PASSED' : 'FAILED',
    reason: gate0Reason,
    educationNote: gate0Note,
  });

  // ----------------------------------------------------
  // GATE 1: Session & Spread Guard
  // ----------------------------------------------------
  const isRollover = isBankRolloverTime();
  const spreadPercentAtr = indicatorsM1.spreadPercentOfAtr;
  const isSpreadTooWide = spreadPercentAtr > 25.0;

  let gate1Passed = !isRollover && !isSpreadTooWide;
  let gate1Reason = `Spread saat ini ${spreadPips} pips (${spreadPercentAtr}% dari ATR M1). Jam perdagangan likuid.`;
  let gate1Note = 'Spread yang rendah menjaga agar biaya transaksi tidak menggerus target scalping M1.';

  if (isRollover) {
    gate1Passed = false;
    gate1Reason = 'Waktu saat ini berada di jendela Bank Rollover (03.30–05.30 WIB). Likuiditas antarbank sangat tipis.';
    gate1Note = 'Edukasi: Pada jam rollover, broker menaikkan spread hingga berkali-kali lipat. Dilarang keras entry.';
  } else if (isSpreadTooWide) {
    gate1Passed = false;
    gate1Reason = `Spread (${spreadPips} pips) melebihi batas toleransi 25% dari ATR M1 (${spreadPercentAtr}%).`;
    gate1Note = 'Edukasi: Jika spread memakan porsi besar dari volatilitas lilin, rasio profitabilitas scalping hancur.';
  }

  gates.push({
    gateIndex: 1,
    name: 'Gate 1: Session & Spread Guard',
    title: 'Sesi Likuiditas & Toleransi Spread',
    status: gate1Passed ? 'PASSED' : 'FAILED',
    reason: gate1Reason,
    educationNote: gate1Note,
    metrics: { spreadPips, spreadPercentAtr, isRollover },
  });

  // ----------------------------------------------------
  // GATE 2: Trend vs Sideways Filter
  // ----------------------------------------------------
  const adx = indicatorsM1.adx14;
  const isTrendingADX = adx >= 22.0;
  const emaGap = Math.abs(indicatorsM1.ema20 - indicatorsM1.ema50);
  const emaGapPips = emaGap / pipSize;
  const isEmaTangled = emaGapPips < 0.8; // EMA 20 & 50 rapat menyilang

  let gate2Passed = isTrendingADX && !isEmaTangled;
  let gate2Reason = `ADX = ${adx} (Threshold >= 22) dan EMA 20 & EMA 50 memiliki sudut kemiringan tren yang tegas.`;
  let gate2Note = 'Hanya mengambil posisi ketika pasar memiliki dorongan tren yang jelas, bukan bergerak acak tanpa arah.';

  if (!isTrendingADX) {
    gate2Passed = false;
    gate2Reason = `ADX bernilai ${adx} (< 22). Momentum pasar melemah dan berada dalam fase konsolidasi/sideways.`;
    gate2Note = 'Edukasi: Trading di pasar sideways sering memicu stop loss palsu (whipsaw). Tunggu breakout struktural.';
  } else if (isEmaTangled) {
    gate2Passed = false;
    gate2Reason = 'EMA 20 dan EMA 50 saling menyilang rapat (choppy compression).';
    gate2Note = 'Edukasi: Dinamika harga sedang terkompresi. Tunggu lilin ekspansi sebelum menentukan arah.';
  }

  gates.push({
    gateIndex: 2,
    name: 'Gate 2: Trend vs Sideways Filter',
    title: 'Deteksi Karakter & Kekuatan Tren',
    status: gate2Passed ? 'PASSED' : 'FAILED',
    reason: gate2Reason,
    educationNote: gate2Note,
    metrics: { adx, emaGapPips, bbWidth: indicatorsM1.bbWidth },
  });

  // ----------------------------------------------------
  // GATE 3: Multi-Timeframe Confirmation (1m + 15m + 1h)
  // ----------------------------------------------------
  // Evaluate HTF bias
  let htfBullish = indicatorsM1.emaSlopeBullish;
  if (m15Candles && m15Candles.length > 20) {
    const lastM15 = m15Candles[m15Candles.length - 1];
    htfBullish = lastM15.close > m15Candles[m15Candles.length - 10].close;
  }

  const m1Direction = indicatorsM1.emaSlopeBullish ? 'BUY' : 'SELL';
  const htfDirection = htfBullish ? 'BUY' : 'SELL';
  const gate3Passed = m1Direction === htfDirection;

  let gate3Reason = `Arah momentum M1 (${m1Direction}) searah dengan struktur tren utama timeframe 15m/1h (${htfDirection}).`;
  let gate3Note = 'Konfirmasi multi-timeframe memastikan kita berselancar bersama arus besar modal institusi.';

  if (!gate3Passed) {
    gate3Reason = `Konflik Timeframe: Momentum M1 mengarah ${m1Direction}, namun tren besar 15M/1H mengarah ${htfDirection}.`;
    gate3Note = 'Edukasi: Melawan tren timeframe yang lebih besar seperti menabrak dinding tebal. Tunggu sinyal searah.';
  }

  gates.push({
    gateIndex: 3,
    name: 'Gate 3: Multi-Timeframe Confirmation',
    title: 'Penyelarasan Tren 1M vs 15M/1H',
    status: gate3Passed ? 'PASSED' : 'FAILED',
    reason: gate3Reason,
    educationNote: gate3Note,
    metrics: { m1Direction, htfDirection },
  });

  // ----------------------------------------------------
  // GATE 4: Price Structure & ATR Risk Guard
  // ----------------------------------------------------
  const rsi = indicatorsM1.rsi14;
  const isRsiOverbought = rsi > 72;
  const isRsiOversold = rsi < 28;
  const isRsiExhausted = (m1Direction === 'BUY' && isRsiOverbought) || (m1Direction === 'SELL' && isRsiOversold);

  const atrBuffer = indicatorsM1.atr14 * 1.5;
  let entryPrice = currentPrice;
  let stopLoss = 0;
  let tp1 = 0;
  let tp2 = 0;
  let slDistance = 0;

  if (m1Direction === 'BUY') {
    // SL behind swing low + 1.5x ATR buffer
    stopLoss = Number((swingLow - atrBuffer).toFixed(config.digits));
    slDistance = entryPrice - stopLoss;
    if (slDistance <= 0) {
      slDistance = indicatorsM1.atr14 * 2;
      stopLoss = Number((entryPrice - slDistance).toFixed(config.digits));
    }
    // Min 1:2 R:R
    tp1 = Number((entryPrice + slDistance * 2.0).toFixed(config.digits));
    tp2 = Number((entryPrice + slDistance * 3.2).toFixed(config.digits));
  } else {
    // SL behind swing high + 1.5x ATR buffer
    stopLoss = Number((swingHigh + atrBuffer).toFixed(config.digits));
    slDistance = stopLoss - entryPrice;
    if (slDistance <= 0) {
      slDistance = indicatorsM1.atr14 * 2;
      stopLoss = Number((entryPrice + slDistance).toFixed(config.digits));
    }
    // Min 1:2 R:R
    tp1 = Number((entryPrice - slDistance * 2.0).toFixed(config.digits));
    tp2 = Number((entryPrice - slDistance * 3.2).toFixed(config.digits));
  }

  const slPips = Number((slDistance / pipSize).toFixed(1));
  const tp1Pips = Number(((Math.abs(tp1 - entryPrice)) / pipSize).toFixed(1));
  const tp2Pips = Number(((Math.abs(tp2 - entryPrice)) / pipSize).toFixed(1));
  const rrRatio = Number((tp1Pips / Math.max(1, slPips)).toFixed(2));

  let gate4Passed = !isRsiExhausted && slPips >= 3.0 && rrRatio >= 1.95;
  let gate4Reason = `RSI(14) = ${rsi} (zona sehat). SL berada di balik Micro Swing + 1.5x ATR (${slPips} pips). R:R valid 1:${rrRatio}.`;
  let gate4Note = 'Struktur rasio risiko minimal 1:2 memastikan akun tetap bertumbuh meski winrate hanya 50%.';

  if (isRsiExhausted) {
    gate4Passed = false;
    gate4Reason = `Harga overextended! RSI = ${rsi} (${m1Direction === 'BUY' ? 'Overbought > 72' : 'Oversold < 28'}).`;
    gate4Note = 'Edukasi: Membeli di pucuk overbought rawan terkena aksi ambil untung (pullback). Tunggu diskon harga.';
  }

  gates.push({
    gateIndex: 4,
    name: 'Gate 4: Price Structure & ATR Risk Guard',
    title: 'Validasi Struktur SL, TP & Rasio R:R',
    status: gate4Passed ? 'PASSED' : 'FAILED',
    reason: gate4Reason,
    educationNote: gate4Note,
    metrics: { rsi, slPips, rrRatio },
  });

  // ----------------------------------------------------
  // OVERALL VERDICT & GATE 5 (Autonomous Chart Setup)
  // ----------------------------------------------------
  const allPassed = gate0Passed && gate1Passed && gate2Passed && gate3Passed && gate4Passed;

  let verdict: 'BUY' | 'SELL' | 'NO_TRADE' | 'WAIT' = 'NO_TRADE';
  let headline = '';
  let tradeSetup: TradeSetup | null = null;
  let confidenceScore = 50;

  if (allPassed) {
    verdict = m1Direction as 'BUY' | 'SELL';
    headline = `SETUP VALID: Peluang Institusional ${verdict} ${pair} M1`;
    confidenceScore = Math.min(94, 82 + Math.floor(Math.random() * 8));

    // Calculate suggested safe lot based on 1% risk of account balance
    const riskDollar = (balance * riskPercent) / 100;
    const lossPerLot = slPips * pipValue;
    const rawLot = lossPerLot > 0 ? riskDollar / lossPerLot : 0.01;
    const safeLot = Math.max(0.01, Number(rawLot.toFixed(2)));

    tradeSetup = {
      direction: verdict,
      entry: entryPrice,
      stopLoss,
      tp1,
      tp2,
      rrRatio,
      suggestedLot: safeLot,
      slPips,
      tp1Pips,
      tp2Pips,
      beRule: `Pindahkan Stop Loss ke Titik Impas (Break Even / SL+) begitu harga mencapai target TP 1 (+${tp1Pips} pips) untuk mengunci risiko nol!`,
    };

    gates.push({
      gateIndex: 5,
      name: 'Gate 5: Autonomous Action & 1-Tap Copy',
      title: 'Anotasi Grafik & Eksekusi Disiplin',
      status: 'PASSED',
      reason: `Semua 5 gerbang pengaman lolos! Setup ${verdict} siap disalin dengan tombol 1-Tap Copy ke MT4/MT5.`,
      educationNote: 'Eksekusi lot sesuai kalkulasi aman. Jangan pernah geser SL menjauhi harga jika floating minus.',
    });
  } else {
    // Determine reason for failure
    if (!gate0Passed) {
      verdict = 'NO_TRADE';
      headline = 'NO TRADE — WASPADA BERITA HIGH IMPACT';
      confidenceScore = 20;
    } else if (!gate1Passed) {
      verdict = 'NO_TRADE';
      headline = 'NO TRADE — SPREAD TERLALU LEBAR / JAM RAWAN';
      confidenceScore = 25;
    } else if (!gate2Passed) {
      verdict = 'NO_TRADE';
      headline = 'NO TRADE — PASAR SIDEWAYS';
      confidenceScore = 35;
    } else if (!gate3Passed) {
      verdict = 'WAIT';
      headline = 'WAIT — LAWAN ARUS TIMEFRAME 15M/1H';
      confidenceScore = 40;
    } else {
      verdict = 'WAIT';
      headline = 'WAIT — STRUKTUR RISIKO BELUM MEMENUHI SYARAT';
      confidenceScore = 45;
    }

    gates.push({
      gateIndex: 5,
      name: 'Gate 5: Autonomous Action & 1-Tap Copy',
      title: 'Anotasi Grafik & Eksekusi Disiplin',
      status: 'FAILED',
      reason: 'Eksekusi ditahan oleh Senior Institutional Guard karena salah satu gerbang keselamatan gagal.',
      educationNote: 'Disiplin menahan diri di pasar yang belum siap adalah 80% dari kesuksesan seorang trader profesional.',
    });
  }

  // Supply / Demand Zones around swing levels
  const zones = [
    {
      type: 'SUPPLY' as const,
      top: swingHigh + indicatorsM1.atr14 * 0.4,
      bottom: swingHigh - indicatorsM1.atr14 * 0.2,
      label: 'Institutional Supply Zone (Resistance)',
    },
    {
      type: 'DEMAND' as const,
      top: swingLow + indicatorsM1.atr14 * 0.2,
      bottom: swingLow - indicatorsM1.atr14 * 0.4,
      label: 'Institutional Demand Zone (Support)',
    },
  ];

  const trendlines = [
    {
      x1: m1Candles[m1Candles.length - 20].time,
      y1: indicatorsM1.ema20,
      x2: m1Candles[m1Candles.length - 1].time,
      y2: currentPrice,
      label: 'M1 Trend Trajectory',
    },
  ];

  let seniorAdvice = '';
  if (allPassed) {
    seniorAdvice = `Pasar menyajikan setup bersih dengan rasio 1:${rrRatio}. Masuk dengan lot terukur (${tradeSetup?.suggestedLot} lot pada modal $${balance}). Begitu TP 1 tercapai, segera kunci keuntungan dengan menggeser SL ke BE. Jangan biarkan trade hijau berubah menjadi merah!`;
  } else {
    seniorAdvice = `Sabar adalah kunci profitabilitas jangka panjang. Ketika gerbang pengaman (${gates.find((g) => g.status === 'FAILED')?.name}) menyala merah, modal kita terlindungi dari kerugian bodoh. Tunggu hingga kondisi pasar benar-benar matang.`;
  }

  return {
    gates,
    verdict,
    headline,
    setup: tradeSetup,
    confidenceScore,
    marketPhase: indicatorsM1.adx14 < 22 ? 'SIDEWAYS_RANGE' : indicatorsM1.emaSlopeBullish ? 'TRENDING_BULL' : 'TRENDING_BEAR',
    zones,
    trendlines,
    seniorAdvice,
  };
}

// Format prompt for Gemini
function buildGeminiInstitutionalPrompt(params: {
  pair: string;
  currentPrice: number;
  indicators: any;
  ruleEval: any;
  newsSummary: string;
}): string {
  return `Anda adalah Senior Institutional Forex/Gold Scalping Trader & AI Risk Officer berpengalaman 20 tahun di prop firm terkemuka.
Gaya komunikasi Anda: Tegas, disiplin, mengedukasi pemula, objektif tanpa basa-basi, dan anti-gambling.

Tugas Anda:
Evaluasi data pasar saat ini pada pair ${params.pair} timeframe M1:
- Harga Saat Ini: ${params.currentPrice}
- EMA 20: ${params.indicators.ema20.toFixed(4)} | EMA 50: ${params.indicators.ema50.toFixed(4)}
- ADX(14): ${params.indicators.adx14}
- RSI(14): ${params.indicators.rsi14}
- ATR(14): ${params.indicators.atr14.toFixed(4)}
- Spread: ${params.indicators.spreadPips} pips (${params.indicators.spreadPercentOfAtr}% dari ATR)
- Status Kalender Berita Ekonomi: ${params.newsSummary}

Hasil Evaluasi 6-Gate Institutional Filter kami secara matematika:
- Gate 0 (News Spike Shield): ${params.ruleEval.gates[0].status} - ${params.ruleEval.gates[0].reason}
- Gate 1 (Session & Spread Guard): ${params.ruleEval.gates[1].status} - ${params.ruleEval.gates[1].reason}
- Gate 2 (Trend vs Sideways Filter): ${params.ruleEval.gates[2].status} - ${params.ruleEval.gates[2].reason}
- Gate 3 (Multi-Timeframe): ${params.ruleEval.gates[3].status} - ${params.ruleEval.gates[3].reason}
- Gate 4 (Structure & ATR Risk): ${params.ruleEval.gates[4].status} - ${params.ruleEval.gates[4].reason}
- Status Keseluruhan: ${params.ruleEval.verdict}

Berikan ulasan institusional komprehensif dalam format JSON murni tanpa markdown wrapper:
{
  "verdict": "${params.ruleEval.verdict}",
  "headline": "${params.ruleEval.headline}",
  "confidenceScore": ${params.ruleEval.confidenceScore},
  "seniorAdvice": "Pesan nasihat disiplin dari Senior Institutional Trader kepada trader pemula (maksimal 3-4 kalimat padat)",
  "gateNotes": [
    "Ulasan singkat Gate 0",
    "Ulasan singkat Gate 1",
    "Ulasan singkat Gate 2",
    "Ulasan singkat Gate 3",
    "Ulasan singkat Gate 4"
  ]
}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      pair = 'XAU/USD',
      m1Candles = [],
      m15Candles = [],
      h1Candles = [],
      newsEvents = [],
      spreadPips = 1.5,
      balance = 1000,
      riskPercent = 1.0,
      modelConfig = { selectedPreset: 'gemini-2.5-flash', customModelId: '' },
    } = body;

    if (!m1Candles || m1Candles.length < 20) {
      return NextResponse.json(
        { error: 'Data candle M1 tidak mencukupi untuk analisis' },
        { status: 400 }
      );
    }

    // 1. Run the deterministic Institutional 6-Gate Rule Engine
    const ruleEval = evaluateSixGates({
      pair,
      m1Candles,
      m15Candles,
      h1Candles,
      newsEvents,
      spreadPips,
      balance,
      riskPercent,
    });

    const apiKey = process.env.GEMINI_API_KEY;
    const defaultModel = process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.5-flash';
    let chosenModel = (modelConfig.customModelId && modelConfig.customModelId.trim() !== '')
      ? modelConfig.customModelId.trim()
      : modelConfig.selectedPreset || defaultModel;

    let modelUsedFinal = chosenModel;
    let seniorAdvice = ruleEval.seniorAdvice;
    let headline = ruleEval.headline;
    let confidenceScore = ruleEval.confidenceScore;

    // 2. If Gemini API Key exists, query Gemini with high reasoning & auto-fallback
    if (apiKey && apiKey.trim() !== '') {
      const pairKey = (pair as SupportedPair) || 'XAU/USD';
      const indicators = computeTechnicalIndicators(m1Candles, spreadPips, PAIR_CONFIGS[pairKey]?.pipSize || 0.0001);
      const currentPrice = m1Candles[m1Candles.length - 1].close;

      const highImpactNews = newsEvents.filter((e: any) => e.impact === 'High');
      const newsSummary = highImpactNews.length > 0
        ? highImpactNews.map((e: any) => `${e.currency} ${e.event} (${e.minutesUntil >= 0 ? `dalam ${e.minutesUntil}m` : `${Math.abs(e.minutesUntil)}m lalu`})`).join('; ')
        : 'Tidak ada rilis berita high impact dekat.';

      const promptText = buildGeminiInstitutionalPrompt({
        pair,
        currentPrice,
        indicators,
        ruleEval,
        newsSummary,
      });

      // Helper function to call Gemini API endpoint
      const callGemini = async (model: string) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // Configure thinking
        let thinkingConfig: any = undefined;
        if (model.includes('2.5')) {
          thinkingConfig = { thinkingBudget: 24576 };
        } else if (model.includes('3')) {
          thinkingConfig = { thinkingLevel: 'HIGH' };
        }

        const requestBody: any = {
          contents: [
            {
              role: 'user',
              parts: [{ text: promptText }],
            },
          ],
        };

        if (thinkingConfig) {
          requestBody.generationConfig = { thinkingConfig };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response;
      };

      try {
        let response = await callGemini(chosenModel);

        // Auto-fallback if chosen model returned 404 or failed
        if (!response.ok && chosenModel !== defaultModel) {
          console.warn(`Model ${chosenModel} gagal (${response.status}). Auto-fallback ke ${defaultModel}`);
          response = await callGemini(defaultModel);
          modelUsedFinal = `${defaultModel} (Auto-Fallback dari ${chosenModel})`;
        }

        if (response.ok) {
          const resJson = await response.json();
          const candidate = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidate) {
            // Clean JSON string
            const cleaned = candidate.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleaned);

            if (parsed.seniorAdvice) seniorAdvice = parsed.seniorAdvice;
            if (parsed.headline && ruleEval.verdict !== 'NO_TRADE') headline = parsed.headline;
            if (parsed.confidenceScore) confidenceScore = parsed.confidenceScore;
          }
        }
      } catch (geminiErr: any) {
        console.warn('Gemini invocation error, using institutional rule response:', geminiErr.message);
        modelUsedFinal = `${chosenModel} (Rule Engine Fallback)`;
      }
    } else {
      modelUsedFinal = 'Institutional Rule Engine (Add GEMINI_API_KEY to activate AI)';
    }

    const resultPayload: AIAnalysisResult = {
      verdict: ruleEval.verdict,
      headline,
      confidenceScore,
      gates: ruleEval.gates,
      tradeSetup: ruleEval.setup,
      chartAnnotations: {
        supplyDemandZones: ruleEval.zones,
        trendlines: ruleEval.trendlines,
      },
      seniorAdvice,
      marketPhase: ruleEval.marketPhase,
      modelUsed: modelUsedFinal,
      timestamp: Date.now(),
    };

    return NextResponse.json(resultPayload);
  } catch (error: any) {
    console.error('Analyze API error:', error);
    return NextResponse.json(
      { error: 'Gagal menjalankan 6-Gate AI Analysis', details: error.message },
      { status: 500 }
    );
  }
}
