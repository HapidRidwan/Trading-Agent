'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Trash2,
  Download,
  Upload,
  Filter,
  TrendingUp,
  TrendingDown,
  Calendar,
  FileSpreadsheet,
  FileCode,
  Tag,
} from 'lucide-react';
import { AccountSettings, JournalTrade } from '@/lib/types';
import { exportTradesToCSV, exportTradesToJSON } from '@/lib/storage';
import { soundAlert } from '@/lib/soundAlert';

interface TradeLogListProps {
  trades: JournalTrade[];
  settings: AccountSettings;
  onDeleteTrade: (id: string) => void;
  onImportTrades: (imported: JournalTrade[]) => void;
  onOpenAddModal: () => void;
}

export default function TradeLogList({
  trades,
  settings,
  onDeleteTrade,
  onImportTrades,
  onOpenAddModal,
}: TradeLogListProps) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');
  const [pairFilter, setPairFilter] = useState<string>('ALL');

  const pairs = Array.from(new Set(trades.map((t) => t.pair)));

  const filteredTrades = trades.filter((t) => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (pairFilter !== 'ALL' && t.pair !== pairFilter) return false;
    return true;
  });

  const handleExportCSV = () => {
    soundAlert.playCopyTick();
    exportTradesToCSV(trades);
  };

  const handleExportJSON = () => {
    soundAlert.playCopyTick();
    exportTradesToJSON(trades, settings);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed.trades && Array.isArray(parsed.trades)) {
          onImportTrades(parsed.trades);
          soundAlert.playChime();
        } else if (Array.isArray(parsed)) {
          onImportTrades(parsed);
          soundAlert.playChime();
        }
      } catch (err) {
        alert('Format file JSON tidak valid!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="w-full bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-panel flex flex-col gap-4">
      {/* Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-trade-blue" />
          <h4 className="text-base font-bold text-white tracking-tight">
            Riwayat Catatan Trading ({filteredTrades.length})
          </h4>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Add Manual Trade */}
          <button
            type="button"
            onClick={onOpenAddModal}
            className="px-3 py-1.5 rounded-xl bg-trade-blue text-white text-xs font-bold hover:bg-blue-600 transition-all shadow-glow-blue flex items-center gap-1.5"
          >
            <span>+ Tambah Catatan</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={trades.length === 0}
            className="p-1.5 rounded-lg bg-surface-subtle border border-border text-gray-300 hover:text-white hover:border-border-strong text-xs flex items-center gap-1 disabled:opacity-40"
            title="Ekspor ke Excel / CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExportJSON}
            disabled={trades.length === 0}
            className="p-1.5 rounded-lg bg-surface-subtle border border-border text-gray-300 hover:text-white hover:border-border-strong text-xs flex items-center gap-1 disabled:opacity-40"
            title="Backup Data JSON"
          >
            <Download className="w-4 h-4 text-trade-blue" />
            <span className="hidden sm:inline">JSON</span>
          </button>

          {/* Import JSON */}
          <label
            className="p-1.5 rounded-lg bg-surface-subtle border border-border text-gray-300 hover:text-white hover:border-border-strong text-xs flex items-center gap-1 cursor-pointer"
            title="Impor Backup JSON"
          >
            <Upload className="w-4 h-4 text-trade-gold" />
            <span className="hidden sm:inline">Impor</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-xl border border-border">
          {(['ALL', 'WIN', 'LOSS'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                statusFilter === st
                  ? st === 'WIN'
                    ? 'bg-trade-buy text-white'
                    : st === 'LOSS'
                    ? 'bg-trade-sell text-white'
                    : 'bg-trade-blue text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {st === 'ALL' ? 'Semua' : st}
            </button>
          ))}
        </div>

        {pairs.length > 0 && (
          <select
            value={pairFilter}
            onChange={(e) => setPairFilter(e.target.value)}
            className="bg-surface-subtle border border-border rounded-xl px-2.5 py-1 text-xs font-mono text-gray-200 focus:outline-none focus:border-trade-blue"
          >
            <option value="ALL">Semua Pair</option>
            {pairs.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Trades List */}
      <div className="flex flex-col gap-2.5">
        {filteredTrades.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500 bg-surface-subtle/50 rounded-xl border border-border">
            Belum ada catatan transaksi yang sesuai dengan filter.
          </div>
        ) : (
          filteredTrades.map((t) => {
            const isWin = t.pnl >= 0;

            return (
              <div
                key={t.id}
                className="p-3.5 rounded-xl bg-surface-subtle/50 border border-border hover:border-border-strong transition-all flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isWin
                          ? 'bg-trade-buy/15 text-trade-buy'
                          : 'bg-trade-sell/15 text-trade-sell'
                      }`}
                    >
                      {isWin ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </span>

                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-white font-mono">
                          {t.pair}
                        </strong>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                            t.direction === 'BUY'
                              ? 'bg-trade-buy/15 text-trade-buy'
                              : 'bg-trade-sell/15 text-trade-sell'
                          }`}
                        >
                          {t.direction}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400">
                          {t.lot} Lot
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {t.date} • {t.time} WIB ({t.timeframe})
                      </span>
                    </div>
                  </div>

                  {/* PnL and Actions */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div
                        className={`font-mono text-base font-extrabold ${
                          isWin ? 'text-trade-buy' : 'text-trade-sell'
                        }`}
                      >
                        {isWin ? '+' : ''}${t.pnl.toFixed(2)}
                      </div>
                      {t.pips !== undefined && (
                        <div className="text-[10px] font-mono text-gray-400">
                          {isWin ? '+' : ''}{t.pips} pips
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteTrade(t.id)}
                      className="p-1.5 text-gray-500 hover:text-trade-sell hover:bg-surface rounded-lg transition-colors"
                      title="Hapus Catatan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Evaluation notes */}
                {t.notes && (
                  <div className="p-2 rounded-lg bg-surface border border-border/70 text-xs text-gray-300 font-sans leading-relaxed">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">
                      Evaluasi Trader:
                    </span>
                    {t.notes}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
