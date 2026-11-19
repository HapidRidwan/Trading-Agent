'use client';

import React from 'react';
import {
  Activity,
  Cpu,
  Lock,
  Radio,
  Sun,
  AlertTriangle,
  Moon,
  Waves,
  ShieldCheck,
} from 'lucide-react';
import Tooltip from './Tooltip';

interface HeaderProps {
  marketPhase: string;
  hasActiveNewsSpike: boolean;
  isRollover: boolean;
  radarActive: boolean;
  onToggleRadar: () => void;
  onOpenModelSettings: () => void;
  onLockApp: () => void;
  activeModelName: string;
  isDrawdownLocked: boolean;
}

export default function Header({
  marketPhase,
  hasActiveNewsSpike,
  isRollover,
  radarActive,
  onToggleRadar,
  onOpenModelSettings,
  onLockApp,
  activeModelName,
  isDrawdownLocked,
}: HeaderProps) {
  // Determine Market Weather
  let weatherLabel = 'Tenang & Trending';
  let WeatherIcon = Sun;
  let weatherColor = 'text-trade-buy border-trade-buy/30 bg-trade-buy/10';
  let weatherTooltip = 'Pasar memiliki momentum tren yang bersih dan likuiditas sehat untuk scalping M1.';

  if (hasActiveNewsSpike) {
    weatherLabel = 'Waspada Berita High Impact';
    WeatherIcon = AlertTriangle;
    weatherColor = 'text-trade-sell border-trade-sell/40 bg-trade-sell/15 animate-pulse';
    weatherTooltip = 'Terdapat rilis berita berdampak tinggi dalam rentang ±15 menit. Volatilitas dan spread berbahaya!';
  } else if (isRollover) {
    weatherLabel = 'Jam Rollover Bank';
    WeatherIcon = Moon;
    weatherColor = 'text-trade-purple border-trade-purple/40 bg-trade-purple/15';
    weatherTooltip = 'Penutupan harian perbankan antarbank (03.30–05.30 WIB). Spread melebar tajam.';
  } else if (marketPhase === 'SIDEWAYS_RANGE') {
    weatherLabel = 'Sideways / Terkompresi';
    WeatherIcon = Waves;
    weatherColor = 'text-trade-gold border-trade-gold/30 bg-trade-gold/10';
    weatherTooltip = 'ADX < 22 atau EMA flat. Pasar tidak memiliki arah tren yang pasti, rawan whipsaw.';
  }

  return (
    <header className="sticky top-0 z-30 w-full bg-background/90 backdrop-blur-md border-b border-border px-3 py-2.5 sm:px-4 sm:py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Brand & Market Weather */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center shadow-inner">
              <span className="font-bold font-mono text-sm text-trade-blue">TA</span>
            </div>
            <div className="hidden xs:block">
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5 leading-none">
                Trading Agent
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-trade-blue/20 text-trade-blue border border-trade-blue/30">
                  PRO
                </span>
              </h1>
              <p className="text-[11px] text-gray-400 font-mono mt-0.5">6-Gate AI Scalper</p>
            </div>
          </div>

          {/* Market Weather Badge */}
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium border ${weatherColor} transition-all`}
            title={weatherTooltip}
          >
            <WeatherIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[130px] sm:max-w-none">{weatherLabel}</span>
            <Tooltip term="Market Weather" explanation={weatherTooltip} />
          </div>

          {isDrawdownLocked && (
            <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-trade-sell/20 text-trade-sell border border-trade-sell/40">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Rem Darurat Aktif</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Live Radar Toggle */}
          <button
            type="button"
            onClick={onToggleRadar}
            disabled={isDrawdownLocked}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              radarActive
                ? 'bg-trade-buy/15 text-trade-buy border-trade-buy/50 shadow-glow-buy'
                : 'bg-surface text-gray-400 border-border hover:text-gray-200'
            } ${isDrawdownLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Auto-scan radar latar belakang setiap candle baru"
          >
            <Radio className={`w-3.5 h-3.5 ${radarActive ? 'animate-pulse text-trade-buy' : ''}`} />
            <span className="hidden sm:inline">Live Radar</span>
            <span
              className={`w-2 h-2 rounded-full ${
                radarActive ? 'bg-trade-buy animate-ping' : 'bg-gray-500'
              }`}
            />
          </button>

          {/* AI Model Selector Button */}
          <button
            type="button"
            onClick={onOpenModelSettings}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs bg-surface border border-border text-gray-300 hover:text-white hover:border-border-strong transition-all"
            title="Pilih Model AI atau atur Custom Model ID"
          >
            <Cpu className="w-3.5 h-3.5 text-trade-blue" />
            <span className="font-mono text-[11px] truncate max-w-[80px] sm:max-w-[110px]">
              {activeModelName}
            </span>
          </button>

          {/* Lock Screen Button */}
          <button
            type="button"
            onClick={onLockApp}
            className="p-1.5 rounded-lg bg-surface border border-border text-gray-400 hover:text-gray-200 hover:border-border-strong transition-all"
            title="Kunci Aplikasi (Layar PIN)"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
