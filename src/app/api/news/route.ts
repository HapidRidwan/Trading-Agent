import { NextRequest, NextResponse } from 'next/server';
import { EconomicNewsEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Helper to determine WIB time and market sessions
function getWIBTimeInfo() {
  const now = new Date();
  // WIB is UTC+7
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const wibDate = new Date(utc + 7 * 3600000);

  const hours = wibDate.getHours();
  const minutes = wibDate.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Session boundaries in WIB minutes
  // Sydney: 04:00 (240) - 13:00 (780)
  // Tokyo: 06:00 (360) - 15:00 (900)
  // London: 14:00 (840) - 23:00 (1380)
  // New York: 19:00 (1140) - 04:00 (240 next day)
  // Rollover: 03:30 (210) - 05:30 (330)

  const isSydneyOpen = totalMinutes >= 240 && totalMinutes < 780;
  const isTokyoOpen = totalMinutes >= 360 && totalMinutes < 900;
  const isLondonOpen = totalMinutes >= 840 && totalMinutes < 1380;
  const isNewYorkOpen = totalMinutes >= 1140 || totalMinutes < 240;
  const isRolloverHour = totalMinutes >= 210 && totalMinutes <= 330;

  return {
    wibDate,
    hours,
    minutes,
    totalMinutes,
    timeString: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} WIB`,
    sessions: {
      sydney: isSydneyOpen,
      tokyo: isTokyoOpen,
      london: isLondonOpen,
      newYork: isNewYorkOpen,
    },
    isRolloverHour,
  };
}

// Generate realistic daily economic news with live countdowns
function generateDailyNewsEvents(wibInfo: ReturnType<typeof getWIBTimeInfo>): EconomicNewsEvent[] {
  const dateStr = wibInfo.wibDate.toISOString().slice(0, 10);
  const currentTotalMinutes = wibInfo.totalMinutes;

  // Realistic template events distributed throughout the trading day
  const templates = [
    {
      hour: 7,
      minute: 30,
      currency: 'AUD',
      event: 'Employment Change & Unemployment Rate',
      impact: 'High' as const,
      forecast: '25.0K / 4.1%',
      previous: '64.1K / 4.1%',
    },
    {
      hour: 9,
      minute: 30,
      currency: 'JPY',
      event: 'BOJ Monetary Policy Statement & Core CPI',
      impact: 'High' as const,
      forecast: '0.25%',
      previous: '0.25%',
    },
    {
      hour: 14,
      minute: 0,
      currency: 'GBP',
      event: 'GDP m/m & Industrial Production',
      impact: 'Medium' as const,
      forecast: '0.2%',
      previous: '0.1%',
    },
    {
      hour: 15,
      minute: 30,
      currency: 'EUR',
      event: 'German Flash Manufacturing & Services PMI',
      impact: 'Medium' as const,
      forecast: '43.5',
      previous: '43.0',
    },
    {
      hour: 17,
      minute: 0,
      currency: 'EUR',
      event: 'Eurozone Core CPI y/y Flash Estimate',
      impact: 'High' as const,
      forecast: '2.7%',
      previous: '2.7%',
    },
    {
      hour: 19,
      minute: 30,
      currency: 'USD',
      event: 'Core CPI m/m & Headline CPI y/y',
      impact: 'High' as const,
      forecast: '0.3% / 2.6%',
      previous: '0.3% / 2.4%',
    },
    {
      hour: 19,
      minute: 30,
      currency: 'USD',
      event: 'Unemployment Claims (Weekly Jobless Claims)',
      impact: 'Medium' as const,
      forecast: '215K',
      previous: '221K',
    },
    {
      hour: 21,
      minute: 0,
      currency: 'USD',
      event: 'ISM Services PMI & New Orders',
      impact: 'High' as const,
      forecast: '53.8',
      previous: '54.9',
    },
    {
      hour: 22,
      minute: 30,
      currency: 'USD',
      event: 'Crude Oil Inventories (EIA Report)',
      impact: 'Low' as const,
      forecast: '1.2M',
      previous: '2.1M',
    },
    {
      hour: 1,
      minute: 0,
      currency: 'USD',
      event: 'FOMC Meeting Minutes & Fed Interest Rate Decision',
      impact: 'High' as const,
      forecast: '4.75%',
      previous: '5.00%',
    },
  ];

  return templates.map((t, idx) => {
    const eventMinutes = t.hour * 60 + t.minute;
    // Calculate difference taking day rollover into account
    let diff = eventMinutes - currentTotalMinutes;
    if (diff < -720) diff += 1440;
    if (diff > 720) diff -= 1440;

    const isNewsSpikeRisk = t.impact === 'High' && diff >= -15 && diff <= 15;

    let actual: string | undefined = undefined;
    if (diff < -5) {
      // Event happened recently
      actual = t.forecast;
    }

    return {
      id: `ev_${dateStr}_${idx}`,
      time: `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`,
      date: dateStr,
      currency: t.currency,
      event: t.event,
      impact: t.impact,
      forecast: t.forecast,
      previous: t.previous,
      actual,
      minutesUntil: diff,
      isNewsSpikeRisk,
    };
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filterCurrency = searchParams.get('currency');

    const wibInfo = getWIBTimeInfo();
    let events = generateDailyNewsEvents(wibInfo);

    if (filterCurrency) {
      events = events.filter((e) => e.currency === filterCurrency.toUpperCase());
    }

    // Sort by chronological closeness (upcoming first)
    events.sort((a, b) => {
      // Upcoming events first, then passed events
      if (a.minutesUntil >= 0 && b.minutesUntil >= 0) return a.minutesUntil - b.minutesUntil;
      if (a.minutesUntil < 0 && b.minutesUntil < 0) return b.minutesUntil - a.minutesUntil;
      return a.minutesUntil >= 0 ? -1 : 1;
    });

    const activeSpikeRisks = events.filter((e) => e.isNewsSpikeRisk);

    return NextResponse.json({
      wibTime: wibInfo.timeString,
      isRolloverHour: wibInfo.isRolloverHour,
      sessions: wibInfo.sessions,
      hasActiveHighImpactRisk: activeSpikeRisks.length > 0,
      activeSpikeRiskEvents: activeSpikeRisks,
      events,
    });
  } catch (error: any) {
    console.error('News API error:', error);
    return NextResponse.json(
      { error: 'Gagal memuat kalender berita ekonomi', details: error.message },
      { status: 500 }
    );
  }
}
