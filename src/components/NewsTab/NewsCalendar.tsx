'use client';

import React, { useState } from 'react';
import {
  Newspaper,
  AlertTriangle,
  Clock,
  Filter,
  ShieldAlert,
  ShieldCheck,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { EconomicNewsEvent, SupportedPair } from '@/lib/types';
import Tooltip from '../Tooltip';

interface NewsCalendarProps {
  events: EconomicNewsEvent[];
  hasActiveNewsSpike: boolean;
  activeSpikeRiskEvents: EconomicNewsEvent[];
  activePair?: SupportedPair;
}

export default function NewsCalendar({
  events,
  hasActiveNewsSpike,
  activeSpikeRiskEvents,
  activePair = 'XAU/USD',
}: NewsCalendarProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<string>('ALL');

  const currencies = ['ALL', 'USD', 'EUR', 'GBP', 'JPY', 'AUD'];

  const filteredEvents =
    selectedCurrency === 'ALL'
      ? events
      : events.filter((e) => e.currency === selectedCurrency);

  // Active Pair News Guard calculation
  const pairCurrencies = activePair ? activePair.split('/').map((c) => c.trim()) : ['USD', 'XAU'];
  const activePairHighImpact = events.find(
    (e) =>
      e.impact === 'High' &&
      pairCurrencies.includes(e.currency) &&
      e.minutesUntil >= -15 &&
      e.minutesUntil <= 30
  );

  const getImpactBadge = (impact: 'High' | 'Medium' | 'Low') => {
    switch (impact) {
      case 'High':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-trade-sell/15 text-trade-sell border border-trade-sell/30">
            <Flame className="w-3 h-3 text-trade-sell" />
            HIGH
          </span>
        );
      case 'Medium':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-trade-gold/15 text-trade-gold border border-trade-gold/30">
            MEDIUM
          </span>
        );
      case 'Low':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium font-mono bg-surface text-gray-400 border border-border">
            LOW
          </span>
        );
    }
  };

  const getCountdownBadge = (event: EconomicNewsEvent) => {
    const diff = event.minutesUntil;

    if (event.isNewsSpikeRisk) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-trade-sell text-white animate-pulse">
          {diff >= 0 ? `Rilis dlm ${diff}m!` : `Rilis ${Math.abs(diff)}m lalu`}
        </span>
      );
    }

    if (diff > 0) {
      if (diff >= 60) {
        const hours = Math.floor(diff / 60);
        const mins = diff % 60;
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-gray-300 bg-surface-subtle border border-border">
            dlm {hours}j {mins}m
          </span>
        );
      }
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-trade-gold bg-trade-gold/15 border border-trade-gold/30">
          dlm {diff}m
        </span>
      );
    }

    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-gray-500 bg-surface">
        Selesai ({Math.abs(diff)}m lalu)
      </span>
    );
  };

  return (
    <div className="w-full bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-panel flex flex-col gap-4">
      {/* 1. ACTIVE PAIR NEWS GUARD BANNER (Paling Atas) */}
      <div
        className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
          activePairHighImpact
            ? 'bg-trade-sell/15 border-trade-sell/50 text-white animate-pulse'
            : 'bg-trade-buy/10 border-trade-buy/30 text-gray-200'
        }`}
      >
        {activePairHighImpact ? (
          <ShieldAlert className="w-5 h-5 text-trade-sell shrink-0 mt-0.5" />
        ) : (
          <ShieldCheck className="w-5 h-5 text-trade-buy shrink-0 mt-0.5" />
        )}
        <div className="leading-relaxed text-xs">
          {activePairHighImpact ? (
            <>
              <strong className="block font-bold text-trade-sell text-sm mb-0.5">
                ACTIVE PAIR GUARD: {activePair} BERISIKO TINGGI!
              </strong>
              <span>
                Berita <strong>{activePairHighImpact.currency} — {activePairHighImpact.event}</strong>{' '}
                {activePairHighImpact.minutesUntil >= 0
                  ? `akan rilis dalam ${activePairHighImpact.minutesUntil} menit (${activePairHighImpact.time} WIB)`
                  : `baru saja rilis ${Math.abs(activePairHighImpact.minutesUntil)} menit lalu`}
                . Tahan posisi scalping M1 untuk menghindari lonjakan spread!
              </span>
            </>
          ) : (
            <>
              <strong className="block font-bold text-trade-buy text-sm mb-0.5">
                ACTIVE PAIR GUARD: {activePair} AMAN UNTUK SCALPING
              </strong>
              <span>
                Tidak ada rilis berita High Impact untuk mata uang <strong>{pairCurrencies.join('/')}</strong> dalam 30 menit ke depan. Kondisi aman untuk entry terukur.
              </span>
            </>
          )}
        </div>
      </div>

      {/* 2. Global High Impact Alert Banner (Gate 0 trigger notice if applicable) */}
      {hasActiveNewsSpike && !activePairHighImpact && (
        <div className="p-4 rounded-xl bg-trade-sell/15 border border-trade-sell/40 text-xs text-white flex items-start gap-3 animate-pulse">
          <ShieldAlert className="w-5 h-5 text-trade-sell shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="block font-bold text-trade-sell text-sm mb-1">
              GATE 0 AKTIF: WASPADA BERITA HIGH IMPACT GLOBAL
            </strong>
            <p className="text-gray-200">
              AI secara otomatis memantau spread dan likuiditas selama rilis berita ekonomi berdampak tinggi.
            </p>
            {activeSpikeRiskEvents.map((e) => (
              <div key={e.id} className="mt-1.5 font-mono text-[11px] text-gray-300">
                • {e.currency} - {e.event} ({e.time} WIB)
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-trade-blue" />
          <h3 className="text-sm font-bold text-white tracking-tight">
            Kalender Berita Ekonomi Hari Ini
          </h3>
          <Tooltip
            term="High-Impact News"
            explanation="Berita seperti NFP, CPI, dan suku bunga FOMC menggerakkan puluhan hingga ratusan pips dalam hitungan detik. Scalper profesional menghindari trading 15 menit sebelum dan sesudah rilis."
          />
        </div>

        {/* Currency Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
          {currencies.map((curr) => (
            <button
              key={curr}
              type="button"
              onClick={() => setSelectedCurrency(curr)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                selectedCurrency === curr
                  ? 'bg-trade-blue text-white shadow-sm'
                  : 'bg-surface-subtle text-gray-400 hover:text-gray-200 border border-border'
              }`}
            >
              {curr}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="flex flex-col gap-2">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400 bg-surface-subtle rounded-xl border border-border">
            Tidak ada jadwal berita ekonomi untuk mata uang ini hari ini.
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              className={`p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                event.isNewsSpikeRisk
                  ? 'bg-trade-sell/10 border-trade-sell/40 shadow-sm'
                  : 'bg-surface-subtle/40 border-border hover:border-border-strong'
              }`}
            >
              {/* Event Meta */}
              <div className="flex items-start sm:items-center gap-3">
                <div className="text-center shrink-0 w-12 sm:w-14">
                  <span className="block font-mono text-xs font-bold text-white">
                    {event.time}
                  </span>
                  <span className="block text-[10px] text-gray-400 font-mono">WIB</span>
                </div>

                <div className="w-9 h-7 rounded-md bg-surface border border-border flex items-center justify-center font-mono text-xs font-bold text-trade-blue shrink-0">
                  {event.currency}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-semibold text-white tracking-tight truncate">
                      {event.event}
                    </span>
                    {getImpactBadge(event.impact)}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono text-gray-400 mt-0.5">
                    <span>
                      Prediksi: <strong className="text-gray-200">{event.forecast}</strong>
                    </span>
                    <span>
                      Sebelumnya: <strong className="text-gray-200">{event.previous}</strong>
                    </span>
                    {event.actual && (
                      <span className="text-trade-buy font-bold">
                        Aktual: {event.actual}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Countdown Badge */}
              <div className="self-end sm:self-center shrink-0">
                {getCountdownBadge(event)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
