'use client';

import React from 'react';
import { Globe, Clock, Moon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Tooltip from '../Tooltip';

interface SessionStatusProps {
  sessions: {
    sydney: boolean;
    tokyo: boolean;
    london: boolean;
    newYork: boolean;
  };
  isRollover: boolean;
  wibTime: string;
}

export default function SessionStatus({ sessions, isRollover, wibTime }: SessionStatusProps) {
  const sessionList = [
    {
      name: 'Sydney',
      hours: '04:00 - 13:00 WIB',
      isOpen: sessions.sydney,
      color: 'text-amber-400',
    },
    {
      name: 'Tokyo',
      hours: '06:00 - 15:00 WIB',
      isOpen: sessions.tokyo,
      color: 'text-rose-400',
    },
    {
      name: 'London',
      hours: '14:00 - 23:00 WIB',
      isOpen: sessions.london,
      color: 'text-sky-400',
      badge: 'High Volatility',
    },
    {
      name: 'New York',
      hours: '19:00 - 04:00 WIB',
      isOpen: sessions.newYork,
      color: 'text-emerald-400',
      badge: 'Peak Volume',
    },
  ];

  return (
    <div className="w-full bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-panel flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-trade-blue" />
          <h3 className="text-sm font-bold text-white tracking-tight">
            Status Sesi Pasar Global
          </h3>
          <Tooltip
            term="Sesi Pasar"
            explanation="Overlap sesi London dan New York (19.00-23.00 WIB) adalah waktu terbaik untuk scalping karena likuiditas dan volatilitas paling sehat."
          />
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-subtle border border-border text-xs font-mono text-gray-300">
          <Clock className="w-3.5 h-3.5 text-trade-blue" />
          <span>{wibTime || 'WIB Time'}</span>
        </div>
      </div>

      {/* Bank Rollover Warning Banner if active */}
      {isRollover && (
        <div className="p-3 rounded-xl bg-trade-sell/15 border border-trade-sell/40 text-xs text-trade-sell flex items-start gap-2.5 animate-pulse">
          <Moon className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold">WASPADA: Jendela Bank Rollover (03.30–05.30 WIB)</strong>
            <span>
              Perbankan global sedang tutup buku harian. Spread diperlebar ekstrem oleh broker. Dilarang keras membuka posisi scalping baru!
            </span>
          </div>
        </div>
      )}

      {/* Grid of Sessions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {sessionList.map((s) => (
          <div
            key={s.name}
            className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
              s.isOpen
                ? 'bg-surface-subtle/80 border-trade-blue/40 shadow-sm'
                : 'bg-surface-subtle/30 border-border/50 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-bold ${s.isOpen ? 'text-white' : 'text-gray-400'}`}>
                {s.name}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  s.isOpen ? 'bg-trade-buy animate-ping' : 'bg-gray-600'
                }`}
              />
            </div>

            <div className="text-[11px] font-mono text-gray-400 mb-2">{s.hours}</div>

            <div className="flex items-center justify-between text-[10px] font-medium pt-1 border-t border-border/40">
              <span className={s.isOpen ? 'text-trade-buy font-bold' : 'text-gray-500'}>
                {s.isOpen ? 'BUKA (Aktif)' : 'TUTUP'}
              </span>
              {s.badge && s.isOpen && (
                <span className="px-1.5 py-0.5 rounded bg-trade-blue/20 text-trade-blue font-mono">
                  {s.badge}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
