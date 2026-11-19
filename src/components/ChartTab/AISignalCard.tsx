'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertOctagon,
  Clock,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  BookMarked,
  Sparkles,
  FileText,
  Globe,
  Activity,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { AIAnalysisResult, SupportedPair, Timeframe } from '@/lib/types';
import { soundAlert } from '@/lib/soundAlert';
import Tooltip from '../Tooltip';

interface AISignalCardProps {
  pair: SupportedPair;
  timeframe: Timeframe;
  analysis: AIAnalysisResult | null;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  onLogTradeToJournal: (result: 'WIN' | 'LOSS') => void;
  isDrawdownLocked: boolean;
  onShowToast?: (message: string) => void;
  sessions?: {
    sydney: boolean;
    tokyo: boolean;
    london: boolean;
    newYork: boolean;
  };
  isRollover?: boolean;
  wibTime?: string;
  spreadPips?: number;
  marketPhase?: string;
}

// Decimal formatting helper according to pair conventions
export function formatPairPrice(price: number, pair: SupportedPair): string {
  if (pair === 'XAU/USD' || pair === 'BTC/USD') {
    return price.toFixed(2);
  }
  if (pair.includes('JPY')) {
    return price.toFixed(3);
  }
  return price.toFixed(5);
}

const DEFAULT_GATES = [
  { index: 0, name: 'Gate 0 — News Spike Shield' },
  { index: 1, name: 'Gate 1 — Session & Spread Guard' },
  { index: 2, name: 'Gate 2 — Market Condition (ADX & Trend)' },
  { index: 3, name: 'Gate 3 — Multi-Timeframe (15m & 1h)' },
  { index: 4, name: 'Gate 4 — Supply & Demand SnR Zone' },
  { index: 5, name: 'Gate 5 — Risk/Reward Ratio & Invalidation' },
];

export default function AISignalCard({
  pair,
  timeframe,
  analysis,
  onAnalyze,
  isAnalyzing,
  onLogTradeToJournal,
  isDrawdownLocked,
  onShowToast,
  sessions = { sydney: false, tokyo: false, london: false, newYork: false },
  isRollover = false,
  wibTime = '',
  spreadPips = 2.0,
  marketPhase = 'REAL_MARKET',
}: AISignalCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    if (onShowToast) {
      onShowToast(msg);
    }
  };

  const handleCopyIndividual = (value: string | number, fieldName: string, label: string) => {
    soundAlert.playCopyTick();
    const strVal = String(value);
    navigator.clipboard.writeText(strVal);
    setCopiedField(fieldName);

    triggerToast(`Angka ${label} (${strVal}) tersalin! Siap tempel di MT4/MT5`);

    setTimeout(() => {
      setCopiedField(null);
    }, 1500);
  };

  const setup = analysis?.tradeSetup;

  const handleCopyFullTicket = () => {
    if (!setup) return;
    soundAlert.playCopyTick();

    const formattedEntry = formatPairPrice(setup.entry, pair);
    const formattedSL = formatPairPrice(setup.stopLoss, pair);
    const formattedTP1 = formatPairPrice(setup.tp1, pair);
    const formattedTP2 = formatPairPrice(setup.tp2, pair);

    const fullTicketText = [
      '=== MT4/MT5 EXECUTION TICKET ===',
      `Pair: ${pair}`,
      `Timeframe: ${timeframe}`,
      `Order Type: ${setup.direction} (M1 Scalping)`,
      `Lot Size: ${setup.suggestedLot}`,
      `Entry Price: ${formattedEntry}`,
      `Stop Loss: ${formattedSL} (-${setup.slPips} pips)`,
      `Take Profit 1: ${formattedTP1} (+${setup.tp1Pips} pips)`,
      `Take Profit 2: ${formattedTP2} (+${setup.tp2Pips} pips)`,
      `Risk/Reward Ratio: 1:${setup.rrRatio}`,
      `Break-Even Rule: ${setup.beRule}`,
      '================================',
    ].join('\n');

    navigator.clipboard.writeText(fullTicketText);
    setCopiedField('full_ticket');

    triggerToast('Tiket Order Lengkap tersalin! Siap tempel di MT4/MT5 / Jurnal.');

    setTimeout(() => {
      setCopiedField(null);
    }, 1500);
  };

  const isBuy = analysis?.verdict === 'BUY';
  const isSell = analysis?.verdict === 'SELL';
  const isNoTrade = analysis?.verdict === 'NO_TRADE';
  const isWait = analysis?.verdict === 'WAIT';

  return (
    <div className="w-full bg-surface border border-white/[0.06] rounded-2xl p-4 shadow-panel flex flex-col justify-between lg:h-[calc(100vh-140px)] lg:min-h-[580px] overflow-y-auto gap-4 transition-all">
      {/* ==================================================================== */}
      {/* TOP SECTION: AI PRO ANALYST & 6-GATE FILTER PANEL */}
      {/* ==================================================================== */}
      <div className="flex flex-col gap-3.5">
        {/* Status Header & Action Button */}
        <div className="flex items-center justify-between gap-2.5 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isBuy
                  ? 'bg-trade-buy/15 text-trade-buy border border-trade-buy/30 shadow-glow-buy'
                  : isSell
                  ? 'bg-trade-sell/15 text-trade-sell border border-trade-sell/30 shadow-glow-sell'
                  : isNoTrade
                  ? 'bg-trade-sell/10 text-trade-sell border border-white/[0.08]'
                  : isWait
                  ? 'bg-trade-gold/10 text-trade-gold border border-white/[0.08]'
                  : 'bg-white/[0.04] text-gray-400 border border-white/[0.08]'
              }`}
            >
              {isBuy ? (
                <TrendingUp className="w-4 h-4" />
              ) : isSell ? (
                <TrendingDown className="w-4 h-4" />
              ) : isNoTrade ? (
                <AlertOctagon className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md font-mono ${
                    isBuy
                      ? 'bg-trade-buy/20 text-trade-buy border border-trade-buy/30'
                      : isSell
                      ? 'bg-trade-sell/20 text-trade-sell border border-trade-sell/30'
                      : isNoTrade
                      ? 'bg-trade-sell/20 text-trade-sell border border-trade-sell/30'
                      : isWait
                      ? 'bg-trade-gold/20 text-trade-gold border border-trade-gold/30'
                      : 'bg-white/[0.06] text-gray-400 border border-white/[0.08]'
                  }`}
                >
                  {analysis ? analysis.verdict.replace('_', ' ') : 'STANDBY'}
                </span>

                {analysis && (
                  <span className="text-[11px] font-mono text-gray-400">
                    Prob: <strong className="text-white">{analysis.confidenceScore}%</strong>
                  </span>
                )}
              </div>

              <h3 className="text-xs font-bold text-white tracking-tight mt-0.5 truncate">
                {analysis ? analysis.headline : 'AI Co-Pilot Standby'}
              </h3>
            </div>
          </div>

          {/* Smooth Gradient Action Button */}
          <button
            type="button"
            onClick={onAnalyze}
            disabled={isAnalyzing || isDrawdownLocked}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 shrink-0 ${
              isDrawdownLocked
                ? 'bg-surface-subtle text-gray-500 border border-white/[0.06] cursor-not-allowed'
                : 'bg-gradient-to-r from-trade-blue via-blue-600 to-indigo-600 text-white hover:brightness-110 shadow-glow-blue'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Menganalisis...' : 'Analisis AI'}</span>
          </button>
        </div>

        {/* 6-Gate Step-by-Step Progress Bar / Filter Status */}
        <div className="bg-[#151A23] border border-white/[0.06] rounded-xl p-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-gray-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-trade-blue" />
              6-Gate Institutional Risk Filter
            </span>
            <span className="font-mono text-[10px] text-gray-400">
              {analysis
                ? `${analysis.gates.filter((g) => g.status === 'PASSED').length}/6 Lolos`
                : '6 Gerbang Disiplin'}
            </span>
          </div>

          {/* Mini Step-by-step Gate Checklist */}
          <div className="grid grid-cols-2 gap-1.5">
            {DEFAULT_GATES.map((dg) => {
              const liveGate = analysis?.gates.find((g) => g.gateIndex === dg.index);
              const isPassed = liveGate?.status === 'PASSED';
              const isFailed = liveGate?.status === 'FAILED';

              return (
                <div
                  key={dg.index}
                  className={`px-2 py-1.5 rounded-lg border text-[10px] flex items-center justify-between transition-all ${
                    isPassed
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : isFailed
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : 'bg-[#0F131A] border-white/[0.04] text-gray-400'
                  }`}
                  title={liveGate ? `${liveGate.name}: ${liveGate.reason}` : dg.name}
                >
                  <span className="truncate max-w-[120px] font-mono">
                    G{dg.index}: {dg.name.split('—')[1]?.trim() || dg.name}
                  </span>
                  <span className="font-mono font-bold shrink-0">
                    {isPassed ? '✓' : isFailed ? '✕' : '•'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Senior Institutional Trader Advice (if analyzed) */}
        {analysis && (
          <div
            className={`p-2.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2 ${
              isNoTrade || isWait
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                : 'bg-trade-blue/10 border-trade-blue/20 text-gray-300'
            }`}
          >
            <ShieldAlert className="w-4 h-4 shrink-0 text-trade-blue mt-0.5" />
            <div className="text-[11px] leading-snug">
              <strong className="text-white block mb-0.5">Ulasan Senior Trader:</strong>
              {analysis.seniorAdvice}
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* MIDDLE SECTION: MT4 / MT5 QUICK-COPY EXECUTION TICKET */}
      {/* ==================================================================== */}
      <div className="flex-1 flex flex-col justify-center">
        {setup ? (
          /* Active MT4/MT5 Ticket */
          <div className="bg-[#151A23] border border-white/[0.08] rounded-xl p-3 flex flex-col gap-2.5 shadow-lg animate-in fade-in">
            {/* Ticket Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-trade-blue/20 text-trade-blue flex items-center justify-center font-mono text-[10px] font-bold">
                  MT
                </span>
                <div>
                  <span className="text-xs font-bold text-white tracking-tight block leading-none">
                    MT4 / MT5 Execution Ticket
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {pair} • {setup.direction} • M1 Scalping
                  </span>
                </div>
              </div>

              <span className="text-xs font-mono font-bold text-trade-buy px-2 py-0.5 rounded bg-trade-buy/10 border border-trade-buy/20">
                R:R 1:{setup.rrRatio}
              </span>
            </div>

            {/* Individual Execution Rows (1-Tap Copy per Baris) */}
            <div className="grid grid-cols-2 gap-2">
              {/* ENTRY PRICE */}
              <div className="p-2 rounded-lg bg-[#0F131A] border border-trade-blue/20 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold text-gray-400 block leading-none">
                    ENTRY ({setup.direction})
                  </span>
                  <span className="font-mono text-xs font-bold text-white">
                    {formatPairPrice(setup.entry, pair)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyIndividual(formatPairPrice(setup.entry, pair), 'entry', 'Entry')
                  }
                  className="p-1.5 rounded bg-trade-blue/15 text-trade-blue hover:bg-trade-blue hover:text-white transition-all"
                  title="Salin Entry"
                >
                  {copiedField === 'entry' ? (
                    <Check className="w-3.5 h-3.5 text-trade-buy" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* STOP LOSS */}
              <div className="p-2 rounded-lg bg-[#0F131A] border border-rose-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold text-rose-400 block leading-none">
                    SL (-{setup.slPips}p)
                  </span>
                  <span className="font-mono text-xs font-bold text-rose-400">
                    {formatPairPrice(setup.stopLoss, pair)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyIndividual(formatPairPrice(setup.stopLoss, pair), 'sl', 'Stop Loss')
                  }
                  className="p-1.5 rounded bg-rose-500/15 text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                  title="Salin SL"
                >
                  {copiedField === 'sl' ? (
                    <Check className="w-3.5 h-3.5 text-trade-buy" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* TAKE PROFIT 1 */}
              <div className="p-2 rounded-lg bg-[#0F131A] border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold text-emerald-400 block leading-none">
                    TP 1 (+{setup.tp1Pips}p)
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    {formatPairPrice(setup.tp1, pair)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyIndividual(formatPairPrice(setup.tp1, pair), 'tp1', 'Take Profit 1')
                  }
                  className="p-1.5 rounded bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all"
                  title="Salin TP 1"
                >
                  {copiedField === 'tp1' ? (
                    <Check className="w-3.5 h-3.5 text-trade-buy" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* TAKE PROFIT 2 */}
              <div className="p-2 rounded-lg bg-[#0F131A] border border-emerald-600/20 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold text-emerald-300 block leading-none">
                    TP 2 (+{setup.tp2Pips}p)
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-300">
                    {formatPairPrice(setup.tp2, pair)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyIndividual(formatPairPrice(setup.tp2, pair), 'tp2', 'Take Profit 2')
                  }
                  className="p-1.5 rounded bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all"
                  title="Salin TP 2"
                >
                  {copiedField === 'tp2' ? (
                    <Check className="w-3.5 h-3.5 text-trade-buy" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* SUGGESTED LOT SIZE & MASTER COPY BUTTON */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#0F131A] border border-amber-500/20">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">
                  Lot Aman:
                </span>
                <span className="font-mono text-xs font-bold text-amber-300">
                  {setup.suggestedLot} Lot
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyIndividual(setup.suggestedLot, 'lot', 'Ukuran Lot')}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500 hover:text-black transition-all"
              >
                {copiedField === 'lot' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Salin Lot</span>
              </button>
            </div>

            {/* Master Button: COPY FULL MT5 TICKET */}
            <button
              type="button"
              onClick={handleCopyFullTicket}
              className={`w-full py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                copiedField === 'full_ticket'
                  ? 'bg-trade-buy text-white shadow-glow-buy'
                  : 'bg-white/[0.04] text-white border border-white/[0.08] hover:bg-white/[0.08] hover:border-trade-blue'
              }`}
            >
              {copiedField === 'full_ticket' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Tiket Order Berhasil Disalin!</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 text-trade-blue" />
                  <span>Salin Tiket Lengkap (MT4 / MT5)</span>
                </>
              )}
            </button>

            {/* Quick Journal Logging Buttons */}
            <div className="flex items-center justify-between pt-1 border-t border-white/[0.06] text-[11px]">
              <span className="text-gray-400">Catat ke Jurnal:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onLogTradeToJournal('WIN')}
                  className="px-2 py-1 rounded bg-trade-buy/15 text-trade-buy border border-trade-buy/30 hover:bg-trade-buy/25 text-[10px] font-bold transition-all"
                >
                  + Win
                </button>
                <button
                  type="button"
                  onClick={() => onLogTradeToJournal('LOSS')}
                  className="px-2 py-1 rounded bg-trade-sell/15 text-trade-sell border border-trade-sell/30 hover:bg-trade-sell/25 text-[10px] font-bold transition-all"
                >
                  + Loss
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Institutional Standby / Waiting Placeholder Ticket (No Empty Hole!) */
          <div className="bg-[#151A23] border border-white/[0.06] rounded-xl p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-white/[0.06] text-gray-400 flex items-center justify-center font-mono text-[10px] font-bold">
                  MT
                </span>
                <span className="text-xs font-bold text-gray-300">
                  Quick MT4/MT5 Ticket
                </span>
              </div>
              <span className="text-[10px] font-mono text-gray-400 px-1.5 py-0.5 rounded bg-white/[0.04]">
                Standby
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded-lg bg-[#0F131A] border border-white/[0.03]">
                <span className="text-[9px] text-gray-400 block font-sans">ENTRY</span>
                <span className="text-gray-400 font-bold">---</span>
              </div>
              <div className="p-2 rounded-lg bg-[#0F131A] border border-white/[0.03]">
                <span className="text-[9px] text-gray-400 block font-sans">STOP LOSS</span>
                <span className="text-gray-400 font-bold">---</span>
              </div>
              <div className="p-2 rounded-lg bg-[#0F131A] border border-white/[0.03]">
                <span className="text-[9px] text-gray-400 block font-sans">TAKE PROFIT</span>
                <span className="text-gray-400 font-bold">---</span>
              </div>
              <div className="p-2 rounded-lg bg-[#0F131A] border border-white/[0.03]">
                <span className="text-[9px] text-gray-400 block font-sans">LOT SIZE</span>
                <span className="text-gray-400 font-bold">---</span>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 text-center leading-snug py-1">
              Tiket eksekusi otomatis terisi angka presisi setelah AI mendeteksi setup yang lolos 6-Gate.
            </p>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* BOTTOM SECTION: RINGKASAN SESI & VOLATILITAS ATR */}
      {/* ==================================================================== */}
      <div className="bg-[#151A23] border border-white/[0.06] rounded-xl p-2.5 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] pb-1 border-b border-white/[0.04]">
          <span className="font-semibold text-gray-300 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-trade-blue" />
            Sesi Pasar & Volatilitas
          </span>
          <span className="font-mono text-[10px] text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-trade-blue" />
            {wibTime || 'WIB Time'}
          </span>
        </div>

        {/* Global Market Session Status Chips */}
        <div className="grid grid-cols-4 gap-1.5 text-center">
          {[
            { name: 'Sydney', open: sessions.sydney },
            { name: 'Tokyo', open: sessions.tokyo },
            { name: 'London', open: sessions.london },
            { name: 'NY', open: sessions.newYork },
          ].map((s) => (
            <div
              key={s.name}
              className={`py-1 px-1 rounded-md text-[10px] font-mono flex items-center justify-center gap-1 border ${
                s.open
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-[#0F131A] border-white/[0.03] text-gray-400 opacity-60'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  s.open ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'
                }`}
              />
              <span>{s.name}</span>
            </div>
          ))}
        </div>

        {/* Volatility & Spread Metric Pills */}
        <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 pt-1">
          <div className="flex items-center gap-1">
            <span>Spread:</span>
            <strong className="text-white">{spreadPips} pips</strong>
          </div>
          <div className="flex items-center gap-1">
            <span>Fase:</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                isRollover
                  ? 'bg-purple-500/20 text-purple-300'
                  : 'bg-emerald-500/15 text-emerald-300'
              }`}
            >
              {isRollover ? 'Rollover' : marketPhase.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
