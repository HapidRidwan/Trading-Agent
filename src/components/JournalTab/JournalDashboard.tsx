'use client';

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Award,
  Layers,
  BarChart3,
  Flame,
} from 'lucide-react';
import { JournalSummary } from '@/lib/types';
import Tooltip from '../Tooltip';

interface JournalDashboardProps {
  summary: JournalSummary;
}

export default function JournalDashboard({ summary }: JournalDashboardProps) {
  const isNetPositive = summary.totalPnl >= 0;

  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Saldo Terkini */}
      <div className="p-4 rounded-2xl bg-surface border border-border shadow-panel flex flex-col justify-between col-span-2 sm:col-span-1">
        <div className="flex items-center justify-between text-gray-400 text-xs">
          <span>Saldo Akun Terkini</span>
          <div className="w-6 h-6 rounded-lg bg-trade-blue/15 text-trade-blue flex items-center justify-center font-bold">
            $
          </div>
        </div>
        <div className="my-2">
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ${summary.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-gray-400 font-mono">
            Modal Awal: ${summary.startingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="text-[10px] text-gray-500 font-mono">Real-time sync</div>
      </div>

      {/* Net PnL ($ and %) */}
      <div className="p-4 rounded-2xl bg-surface border border-border shadow-panel flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 text-xs">
          <span>Total Net PnL</span>
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold ${
              isNetPositive
                ? 'bg-trade-buy/15 text-trade-buy'
                : 'bg-trade-sell/15 text-trade-sell'
            }`}
          >
            {isNetPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          </div>
        </div>
        <div className="my-2">
          <div
            className={`font-mono text-xl sm:text-2xl font-extrabold tracking-tight ${
              isNetPositive ? 'text-trade-buy' : 'text-trade-sell'
            }`}
          >
            {isNetPositive ? '+' : ''}${summary.totalPnl.toFixed(2)}
          </div>
          <span
            className={`text-xs font-mono font-bold ${
              isNetPositive ? 'text-trade-buy' : 'text-trade-sell'
            }`}
          >
            {isNetPositive ? '+' : ''}{summary.pnlPercent}% Pertumbuhan
          </span>
        </div>
        <div className="text-[10px] text-gray-500 font-mono">
          {summary.totalTrades} Total Transaksi
        </div>
      </div>

      {/* Win Rate (%) */}
      <div className="p-4 rounded-2xl bg-surface border border-border shadow-panel flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 text-xs">
          <span className="flex items-center gap-1">
            Win Rate
            <Tooltip term="Winrate" explanation="Persentase trade profit. Dengan rasio R:R 1:2, winrate 40% saja sudah membuat akun untung bersih!" />
          </span>
          <div className="w-6 h-6 rounded-lg bg-trade-gold/15 text-trade-gold flex items-center justify-center font-bold">
            %
          </div>
        </div>
        <div className="my-2">
          <div className="font-mono text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {summary.winRate}%
          </div>
          <span className="text-xs font-mono text-gray-300">
            <span className="text-trade-buy font-bold">{summary.winCount}W</span> -{' '}
            <span className="text-trade-sell font-bold">{summary.lossCount}L</span>
          </span>
        </div>
        <div className="text-[10px] text-gray-500 font-mono">
          Target Konsistensi &gt; 50%
        </div>
      </div>

      {/* Profit Factor */}
      <div className="p-4 rounded-2xl bg-surface border border-border shadow-panel flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 text-xs">
          <span className="flex items-center gap-1">
            Profit Factor
            <Tooltip term="Profit Factor" explanation="Perbandingan total dolar untung vs total dolar rugi. Nilai di atas 1.5 dianggap sangat bagus oleh institusi." />
          </span>
          <div className="w-6 h-6 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold">
            PF
          </div>
        </div>
        <div className="my-2">
          <div className="font-mono text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {summary.profitFactor.toFixed(2)}
          </div>
          <span className="text-[11px] font-mono text-gray-400">
            Best: <span className="text-trade-buy font-bold">+${summary.bestTrade.toFixed(2)}</span>
          </span>
        </div>
        <div className="text-[10px] text-gray-500 font-mono">
          Worst: <span className="text-trade-sell">-${Math.abs(summary.worstTrade).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
