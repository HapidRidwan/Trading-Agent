'use client';

import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, AlertOctagon, Lock, RefreshCw, Zap } from 'lucide-react';
import { AccountSettings, JournalSummary } from '@/lib/types';
import Tooltip from '../Tooltip';

interface EmergencyDrawdownGuardProps {
  settings: AccountSettings;
  summary: JournalSummary;
  onUpdateSettings: (newSettings: AccountSettings) => void;
}

export default function EmergencyDrawdownGuard({
  settings,
  summary,
  onUpdateSettings,
}: EmergencyDrawdownGuardProps) {
  const [dailyLimitPercent, setDailyLimitPercent] = useState<number>(
    settings.dailyDrawdownLimitPercent || 3.0
  );
  const [maxSlCount, setMaxSlCount] = useState<number>(settings.maxConsecutiveSl || 2);

  const handleSave = () => {
    onUpdateSettings({
      ...settings,
      dailyDrawdownLimitPercent: dailyLimitPercent,
      maxConsecutiveSl: maxSlCount,
    });
  };

  const maxLossDollar = (settings.balance * dailyLimitPercent) / 100;
  const progressPercent =
    maxLossDollar > 0 ? Math.min(100, (summary.todayLossAmount / maxLossDollar) * 100) : 0;

  return (
    <div className="w-full bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-panel flex flex-col gap-4">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-trade-sell" />
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Rem Darurat Harian (Daily Drawdown Guard)
            </h3>
            <p className="text-xs text-gray-400">
              Kunci otomatis untuk mematikan godaan revenge trading setelah terkena stop loss beruntun
            </p>
          </div>
        </div>

        {summary.isDrawdownLocked ? (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-trade-sell/20 text-trade-sell border border-trade-sell/40 animate-pulse">
            <Lock className="w-3.5 h-3.5" />
            TERKUNCI
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-trade-buy/15 text-trade-buy border border-trade-buy/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            AMAN
          </span>
        )}
      </div>

      {/* Lock Status Alert */}
      {summary.isDrawdownLocked && (
        <div className="p-4 rounded-xl bg-trade-sell/15 border border-trade-sell/50 text-xs text-white flex flex-col gap-2">
          <div className="flex items-center gap-2 text-trade-sell font-bold text-sm">
            <AlertOctagon className="w-5 h-5" />
            <span>AKUN DIKUNCI HINGGA ESOK HARI</span>
          </div>
          <p className="text-gray-200 leading-relaxed">{summary.drawdownLockReason}</p>
          <div className="p-2.5 rounded-lg bg-surface/80 border border-border text-[11px] text-gray-300">
            <strong>Nasihat Psikologi Institusi:</strong> Menutup laptop saat batas rugi tercapai adalah tanda kedewasaan seorang trader. Pasar selalu buka kembali besok; modal dan ketenangan mental Anda jauh lebih berharga.
          </div>
        </div>
      )}

      {/* Progress Bar Today's Loss */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-gray-400">Penggunaan Batas Rugi Hari Ini:</span>
          <span className={summary.todayLossAmount > 0 ? 'text-trade-sell font-bold' : 'text-gray-300'}>
            -${summary.todayLossAmount.toFixed(2)} / ${maxLossDollar.toFixed(2)} ({progressPercent.toFixed(0)}%)
          </span>
        </div>

        <div className="w-full h-2.5 bg-surface-subtle rounded-full overflow-hidden border border-border">
          <div
            className={`h-full transition-all duration-500 ${
              progressPercent >= 100
                ? 'bg-trade-sell'
                : progressPercent > 60
                ? 'bg-trade-gold'
                : 'bg-trade-blue'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-gray-500">
          <span>Stop Loss Hari Ini Beruntun: {summary.todayConsecutiveLosses}x / {maxSlCount}x</span>
          <span>Reset otomatis setiap 00:00 WIB</span>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border">
        <div>
          <label className="text-xs font-semibold text-gray-300 block mb-1">
            Batas Maksimal Rugi Harian (% Modal):
            <Tooltip
              term="Daily Drawdown"
              explanation="Rekomendasi institusi: 2% hingga 3% per hari. Jika hilang 3%, berhenti untuk hari itu."
            />
          </label>
          <div className="flex items-center gap-2">
            {[2.0, 3.0, 5.0].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => {
                  setDailyLimitPercent(pct);
                  onUpdateSettings({ ...settings, dailyDrawdownLimitPercent: pct });
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  dailyLimitPercent === pct
                    ? 'bg-trade-blue text-white shadow-sm'
                    : 'bg-surface-subtle text-gray-400 border border-border'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-300 block mb-1">
            Maksimal Stop Loss Beruntun:
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => {
                  setMaxSlCount(count);
                  onUpdateSettings({ ...settings, maxConsecutiveSl: count });
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  maxSlCount === count
                    ? 'bg-trade-blue text-white shadow-sm'
                    : 'bg-surface-subtle text-gray-400 border border-border'
                }`}
              >
                {count}x SL
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
