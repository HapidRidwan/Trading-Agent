'use client';

import React, { useState, useEffect } from 'react';
import {
  Calculator,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Zap,
  Info,
  Copy,
  Check,
} from 'lucide-react';
import { AccountSettings, SupportedPair } from '@/lib/types';
import { PAIR_CONFIGS } from '@/lib/marketSimulator';
import { soundAlert } from '@/lib/soundAlert';
import Tooltip from '../Tooltip';

interface LotCalculatorProps {
  settings: AccountSettings;
  onUpdateSettings: (newSettings: AccountSettings) => void;
  activePair: SupportedPair;
  aiSlPips?: number;
  onShowToast?: (msg: string) => void;
}

export default function LotCalculator({
  settings,
  onUpdateSettings,
  activePair,
  aiSlPips,
  onShowToast,
}: LotCalculatorProps) {
  const [selectedPair, setSelectedPair] = useState<SupportedPair>(activePair || 'XAU/USD');
  const [mode, setMode] = useState<'auto' | 'custom'>('auto');

  // Input states
  const [balanceInput, setBalanceInput] = useState<number>(settings.balance);
  const [accountType, setAccountType] = useState<'standard' | 'cent'>(settings.accountType);
  const [leverageInput, setLeverageInput] = useState<number>(settings.leverage || 1000);
  const [customLeverageText, setCustomLeverageText] = useState<string>('');

  // Auto Lot states
  const [riskPercent, setRiskPercent] = useState<number>(settings.riskPercent || 1.0);
  const [slPipsInput, setSlPipsInput] = useState<number>(aiSlPips || 20);

  // Custom Lot states
  const [customLotInput, setCustomLotInput] = useState<number>(0.05);
  const [copiedLot, setCopiedLot] = useState<boolean>(false);

  const pairConfig = PAIR_CONFIGS[selectedPair] || PAIR_CONFIGS['XAU/USD'];

  // Sync balance from settings
  useEffect(() => {
    setBalanceInput(settings.balance);
    setAccountType(settings.accountType);
    setLeverageInput(settings.leverage);
  }, [settings]);

  // Sync selected pair when activePair changes
  useEffect(() => {
    if (activePair) {
      setSelectedPair(activePair);
    }
  }, [activePair]);

  const handleBalanceChange = (val: number) => {
    setBalanceInput(val);
    const updated = { ...settings, balance: Math.max(1, val) };
    onUpdateSettings(updated);
  };

  const handleAccountTypeChange = (type: 'standard' | 'cent') => {
    setAccountType(type);
    const updated = { ...settings, accountType: type };
    onUpdateSettings(updated);
  };

  const handleLeverageChange = (lev: number) => {
    setLeverageInput(lev);
    setCustomLeverageText('');
    const updated = { ...settings, leverage: lev };
    onUpdateSettings(updated);
  };

  const handleCustomLeverageChange = (text: string) => {
    setCustomLeverageText(text);
    const parsed = parseInt(text.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(parsed) && parsed > 0) {
      setLeverageInput(parsed);
      const updated = { ...settings, leverage: parsed };
      onUpdateSettings(updated);
    }
  };

  // Apply AI SL distance
  const handleUseAiSl = () => {
    if (aiSlPips && aiSlPips > 0) {
      soundAlert.playCopyTick();
      setSlPipsInput(aiSlPips);
      if (onShowToast) {
        onShowToast(`Jarak SL (${aiSlPips} pips) dari analisis AI berhasil diterapkan.`);
      }
    }
  };

  // Copy Lot size
  const handleCopyLot = (lotToCopy: number) => {
    soundAlert.playCopyTick();
    const formatted = lotToCopy.toFixed(2);
    navigator.clipboard.writeText(formatted);
    setCopiedLot(true);
    if (onShowToast) {
      onShowToast(`Ukuran Lot (${formatted}) tersalin! Siap tempel di MT4/MT5.`);
    }
    setTimeout(() => {
      setCopiedLot(false);
    }, 1500);
  };

  // Calculations
  let pipValuePerLot = pairConfig.pipValuePerStandardLot;
  if (accountType === 'cent') {
    pipValuePerLot = pipValuePerLot / 100;
  }

  const contractSize = pairConfig.contractSize;
  const leverage = leverageInput > 0 ? leverageInput : 1000;

  // Auto Lot Calculation
  const riskDollar = (balanceInput * riskPercent) / 100;
  const lossPerLot = slPipsInput * pipValuePerLot;
  const autoSafeLot = lossPerLot > 0 ? Math.max(0.01, Number((riskDollar / lossPerLot).toFixed(2))) : 0.01;

  // Effective Lot based on mode
  const currentLot = mode === 'auto' ? autoSafeLot : customLotInput;

  // Used Margin calculation
  const approximatePrice = selectedPair === 'XAU/USD' ? 2650 : selectedPair === 'BTC/USD' ? 90000 : 1.1;
  const notionalValue = currentLot * contractSize * approximatePrice;
  const usedMargin = notionalValue / leverage;
  const freeMargin = Math.max(0, balanceInput - usedMargin);
  const marginLevel = usedMargin > 0 ? (balanceInput / usedMargin) * 100 : 9999;

  // Potential Loss at SL
  const potentialFloatingLoss = currentLot * slPipsInput * pipValuePerLot;
  const potentialLossPercent = balanceInput > 0 ? (potentialFloatingLoss / balanceInput) * 100 : 0;

  // Ketahanan Pips: how many pips can free margin withstand before stop out
  const pipLossPerPip = currentLot * pipValuePerLot;
  const pipsResilience = pipLossPerPip > 0 ? Math.floor(freeMargin / pipLossPerPip) : 9999;

  // Over-leverage danger check
  const isLossTooHigh = potentialLossPercent > 5.0; // > 5% risk
  const isPipsResilienceLow = pipsResilience < 50; // < 50 pips resilience
  const isOverLeveraged = isLossTooHigh || isPipsResilienceLow;

  const handleAdjustToSafeLot = () => {
    soundAlert.playCopyTick();
    setCustomLotInput(autoSafeLot);
    setMode('auto');
    if (onShowToast) {
      onShowToast(`Lot disesuaikan ke ukuran aman: ${autoSafeLot} Lot.`);
    }
  };

  const leveragePresets = [100, 200, 500, 1000, 2000];

  return (
    <div className="w-full bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-panel flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-trade-blue" />
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Kalkulator Custom Lot & Simulasi Leverage
            </h3>
            <p className="text-xs text-gray-400">
              Mendukung Custom Leverage (1:100 s/d 1:3000+) & 1-Tap Quick Copy Lot
            </p>
          </div>
        </div>

        {/* Pair selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">Pair:</span>
          <select
            value={selectedPair}
            onChange={(e) => setSelectedPair(e.target.value as SupportedPair)}
            className="bg-surface-subtle border border-border-strong rounded-xl px-2.5 py-1 text-xs font-mono font-bold text-white focus:outline-none focus:border-trade-blue cursor-pointer"
          >
            {Object.keys(PAIR_CONFIGS).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Account Parameters Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-surface-subtle/40 rounded-xl border border-border">
        {/* Saldo Modal ($) */}
        <div>
          <label className="text-[11px] font-semibold text-gray-300 block mb-1">
            Saldo Modal ({accountType === 'cent' ? 'USC' : '$ USD'}):
          </label>
          <input
            type="number"
            min="10"
            step="10"
            value={balanceInput}
            onChange={(e) => handleBalanceChange(parseFloat(e.target.value) || 0)}
            className="w-full bg-surface border border-border-strong rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-trade-blue"
          />
          <span className="text-[10px] text-gray-400 mt-1 block">
            Sinkron otomatis dengan Jurnal
          </span>
        </div>

        {/* Tipe Akun */}
        <div>
          <label className="text-[11px] font-semibold text-gray-300 block mb-1">
            Tipe Akun:
            <Tooltip term="Cent Account" explanation="Akun Cent membuat $10 terasa seperti 1.000 USC, melatih psikologi dengan lot mikro." />
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleAccountTypeChange('standard')}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${
                accountType === 'standard'
                  ? 'bg-trade-blue text-white shadow-sm'
                  : 'bg-surface text-gray-400 hover:text-white border border-border'
              }`}
            >
              Standard ($)
            </button>
            <button
              type="button"
              onClick={() => handleAccountTypeChange('cent')}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${
                accountType === 'cent'
                  ? 'bg-trade-gold text-black shadow-sm'
                  : 'bg-surface text-gray-400 hover:text-white border border-border'
              }`}
            >
              Cent (USC)
            </button>
          </div>
        </div>

        {/* Custom Leverage */}
        <div>
          <label className="text-[11px] font-semibold text-gray-300 block mb-1">
            Leverage (Pilih / Ketik Angka Bebas):
            <Tooltip term="Leverage" explanation="Default 1:1000. Memperkecil jaminan Used Margin agar Free Margin leluasa." />
          </label>
          <div className="flex items-center gap-1 flex-wrap">
            {leveragePresets.map((lev) => (
              <button
                key={lev}
                type="button"
                onClick={() => handleLeverageChange(lev)}
                className={`px-2 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  leverageInput === lev && !customLeverageText
                    ? 'bg-trade-blue text-white shadow-sm'
                    : 'bg-surface text-gray-400 hover:text-white border border-border'
                }`}
              >
                1:{lev}
              </button>
            ))}

            {/* Custom Input */}
            <div className="flex items-center bg-surface border border-border rounded-lg px-2 py-1 w-24">
              <span className="text-[11px] font-mono text-gray-500 mr-1">1:</span>
              <input
                type="text"
                placeholder="3000"
                value={customLeverageText || (leveragePresets.includes(leverageInput) ? '' : leverageInput)}
                onChange={(e) => handleCustomLeverageChange(e.target.value)}
                className="w-full bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          type="button"
          onClick={() => setMode('auto')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            mode === 'auto'
              ? 'bg-trade-buy/15 text-trade-buy border border-trade-buy/40 shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Auto Lot (Aman)</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('custom')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            mode === 'custom'
              ? 'bg-trade-blue/15 text-trade-blue border border-trade-blue/40 shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Custom Lot (Manual)</span>
        </button>
      </div>

      {/* Mode Specific Inputs */}
      {mode === 'auto' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-surface-subtle/50 rounded-xl border border-border">
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">
              Batas Toleransi Risiko per Trade:
            </label>
            <div className="flex items-center gap-2">
              {[0.5, 1.0, 2.0].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setRiskPercent(pct)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    riskPercent === pct
                      ? 'bg-trade-buy text-white shadow-sm'
                      : 'bg-surface text-gray-400 border border-border'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
            <span className="text-[11px] font-mono text-gray-400 mt-1 block">
              Nilai Risiko Dolar: <strong>${riskDollar.toFixed(2)}</strong>
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-300">
                Jarak Stop Loss (Pips):
              </label>

              {/* TOMBOL "GUNAKAN JARAK SL DARI AI" */}
              {aiSlPips && aiSlPips > 0 && (
                <button
                  type="button"
                  onClick={handleUseAiSl}
                  className="text-[10px] font-bold font-mono text-trade-blue hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Pakai SL AI ({aiSlPips} p)</span>
                </button>
              )}
            </div>

            <input
              type="number"
              min="1"
              step="0.5"
              value={slPipsInput}
              onChange={(e) => setSlPipsInput(Math.max(1, parseFloat(e.target.value) || 10))}
              className="w-full bg-surface border border-border-strong rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-trade-blue"
            />
            <span className="text-[11px] text-gray-400 mt-1 block">
              Dihitung dari Micro Swing High/Low + 1.5x ATR M1
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-surface-subtle/50 rounded-xl border border-border">
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">
              Ketik Ukuran Lot Sendiri:
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={customLotInput}
              onChange={(e) => setCustomLotInput(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
              className="w-full bg-surface border border-border-strong rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-trade-blue"
            />
            <span className="text-[10px] text-gray-400 mt-1 block">
              Contoh: 0.01, 0.05, 0.10, 0.50
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-300">
                Jarak Stop Loss Skenario (Pips):
              </label>
              {aiSlPips && aiSlPips > 0 && (
                <button
                  type="button"
                  onClick={handleUseAiSl}
                  className="text-[10px] font-bold font-mono text-trade-blue hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Pakai SL AI ({aiSlPips} p)</span>
                </button>
              )}
            </div>
            <input
              type="number"
              min="1"
              step="0.5"
              value={slPipsInput}
              onChange={(e) => setSlPipsInput(Math.max(1, parseFloat(e.target.value) || 10))}
              className="w-full bg-surface border border-border-strong rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-trade-blue"
            />
          </div>
        </div>
      )}

      {/* OVER-LEVERAGE DANGER ALERT */}
      {isOverLeveraged && (
        <div className="p-4 rounded-xl bg-trade-sell/15 border border-trade-sell/50 text-xs text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-trade-sell shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold text-trade-sell text-sm">
                PERINGATAN OVER-LEVERAGE & BAHAYA MARGIN CALL!
              </strong>
              <p className="text-gray-300 mt-0.5">
                {isLossTooHigh && (
                  <span>
                    Potensi rugi SL (${potentialFloatingLoss.toFixed(2)}) mencapai{' '}
                    <strong>{potentialLossPercent.toFixed(1)}% modal</strong> (batas aman maksimal 5%).{' '}
                  </span>
                )}
                {isPipsResilienceLow && (
                  <span>
                    Ketahanan pips Anda hanya <strong>{pipsResilience} pips</strong> (&lt; 50 pips).
                    Sedikit volatilitas dapat menghanguskan akun.
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdjustToSafeLot}
            className="px-3.5 py-2 rounded-xl bg-trade-buy text-white font-bold text-xs shrink-0 hover:bg-emerald-600 transition-all shadow-glow-buy"
          >
            Sesuaikan ke Lot Aman ({autoSafeLot} Lot)
          </button>
        </div>
      )}

      {/* Simulation Result Dashboard Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Recommended / Active Lot with 1-TAP COPY LOT BUTTON */}
        <div className="p-3 rounded-xl bg-surface-subtle border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-400">Ukuran Lot:</span>
            {/* 1-Tap Copy Lot */}
            <button
              type="button"
              onClick={() => handleCopyLot(currentLot)}
              className={`p-1 rounded text-[10px] font-bold font-mono transition-all flex items-center gap-1 ${
                copiedLot
                  ? 'bg-trade-buy text-white'
                  : 'bg-trade-gold/20 text-trade-gold hover:bg-trade-gold hover:text-black'
              }`}
              title="Salin Lot"
            >
              {copiedLot ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Salin Lot</span>
                </>
              )}
            </button>
          </div>
          <div className="font-mono text-xl font-bold text-trade-gold mt-1">
            {currentLot.toFixed(2)} Lot
          </div>
          <span className="text-[10px] text-gray-500 font-mono">
            Nilai Pip: ~${(currentLot * pipValuePerLot).toFixed(2)}/p
          </span>
        </div>

        {/* Used Margin */}
        <div className="p-3 rounded-xl bg-surface-subtle border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-400">Used Margin:</span>
            <Tooltip term="Used Margin" explanation="Jaminan dana yang dikunci broker untuk membuka lot tersebut." />
          </div>
          <div className="font-mono text-xl font-bold text-trade-blue mt-1">
            ${usedMargin.toFixed(2)}
          </div>
          <span className="text-[10px] text-gray-500 font-mono">
            Free: ${freeMargin.toFixed(2)}
          </span>
        </div>

        {/* Ketahanan Pips */}
        <div
          className={`p-3 rounded-xl border flex flex-col justify-between ${
            pipsResilience < 50
              ? 'bg-trade-sell/10 border-trade-sell/40'
              : 'bg-surface-subtle border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-400">Ketahanan Pips:</span>
            <Tooltip term="Ketahanan Pips" explanation="Berapa pips pasar dapat melawan posisi Anda sebelum akun MC/Stop Out." />
          </div>
          <div
            className={`font-mono text-xl font-bold mt-1 ${
              pipsResilience < 50 ? 'text-trade-sell' : 'text-trade-buy'
            }`}
          >
            {pipsResilience} Pips
          </div>
          <span className="text-[10px] text-gray-500 font-mono">
            {pipsResilience < 50 ? 'Sangat Berbahaya' : 'Aman untuk M1'}
          </span>
        </div>

        {/* Floating Loss at SL */}
        <div
          className={`p-3 rounded-xl border flex flex-col justify-between ${
            potentialLossPercent > 5.0
              ? 'bg-trade-sell/10 border-trade-sell/40'
              : 'bg-surface-subtle border-border'
          }`}
        >
          <span className="text-[11px] font-semibold text-gray-400">Estimasi Rugi Kena SL:</span>
          <div
            className={`font-mono text-xl font-bold mt-1 ${
              potentialLossPercent > 5.0 ? 'text-trade-sell' : 'text-gray-200'
            }`}
          >
            -${potentialFloatingLoss.toFixed(2)}
          </div>
          <span className="text-[10px] font-mono text-gray-400">
            {potentialLossPercent.toFixed(1)}% dari total modal
          </span>
        </div>
      </div>
    </div>
  );
}
