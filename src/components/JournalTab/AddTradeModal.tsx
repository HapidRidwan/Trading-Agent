'use client';

import React, { useState, useEffect } from 'react';
import { BookPlus, X, Check, DollarSign, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import { JournalTrade, SupportedPair, Timeframe, TradeSetup } from '@/lib/types';
import { soundAlert } from '@/lib/soundAlert';

interface AddTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTrade: (trade: Omit<JournalTrade, 'id' | 'createdAt'>) => void;
  defaultPair?: SupportedPair;
  lastAiSetup?: TradeSetup | null;
}

export default function AddTradeModal({
  isOpen,
  onClose,
  onAddTrade,
  defaultPair = 'XAU/USD',
  lastAiSetup,
}: AddTradeModalProps) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState(timeStr);
  const [pair, setPair] = useState<SupportedPair>(defaultPair);
  const [timeframe, setTimeframe] = useState<Timeframe>('1m');
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [tradeOutcome, setTradeOutcome] = useState<'WIN' | 'LOSS'>('WIN');
  const [lot, setLot] = useState<number>(0.05);
  const [entryPrice, setEntryPrice] = useState<number>(2650.0);
  const [exitPrice, setExitPrice] = useState<number>(2654.0);
  const [pnl, setPnl] = useState<number>(20.0);
  const [pips, setPips] = useState<number>(40);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (defaultPair) {
      setPair(defaultPair);
    }
  }, [defaultPair]);

  if (!isOpen) return null;

  // Auto-fill from last AI trade setup
  const handleAutoFillFromAI = () => {
    if (!lastAiSetup) return;
    soundAlert.playCopyTick();

    setPair(defaultPair);
    setTimeframe('1m');
    setDirection(lastAiSetup.direction);
    setLot(lastAiSetup.suggestedLot);
    setEntryPrice(lastAiSetup.entry);

    if (tradeOutcome === 'WIN') {
      setExitPrice(lastAiSetup.tp1);
      const estPnl = Number((lastAiSetup.tp1Pips * lastAiSetup.suggestedLot * 10).toFixed(2));
      setPnl(estPnl);
      setPips(lastAiSetup.tp1Pips);
    } else {
      setExitPrice(lastAiSetup.stopLoss);
      const estLoss = -Number((lastAiSetup.slPips * lastAiSetup.suggestedLot * 10).toFixed(2));
      setPnl(estLoss);
      setPips(-lastAiSetup.slPips);
    }

    setNotes(`Eksekusi sinyal AI Institusi ${lastAiSetup.direction} M1. Rasio R:R 1:${lastAiSetup.rrRatio}.`);
  };

  const handleOutcomeChange = (outcome: 'WIN' | 'LOSS') => {
    setTradeOutcome(outcome);
    if (lastAiSetup) {
      if (outcome === 'WIN') {
        setExitPrice(lastAiSetup.tp1);
        const estPnl = Math.abs(pnl) || Number((lastAiSetup.tp1Pips * lot * 10).toFixed(2));
        setPnl(estPnl);
        setPips(Math.abs(pips) || lastAiSetup.tp1Pips);
      } else {
        setExitPrice(lastAiSetup.stopLoss);
        const estLoss = -Math.abs(pnl) || -Number((lastAiSetup.slPips * lot * 10).toFixed(2));
        setPnl(estLoss);
        setPips(-Math.abs(pips) || -lastAiSetup.slPips);
      }
    } else {
      if (outcome === 'WIN' && pnl < 0) setPnl(Math.abs(pnl));
      if (outcome === 'LOSS' && pnl > 0) setPnl(-Math.abs(pnl));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundAlert.playChime();

    const finalPnl = tradeOutcome === 'WIN' ? Math.abs(pnl) : -Math.abs(pnl);
    const finalPips = tradeOutcome === 'WIN' ? Math.abs(pips) : -Math.abs(pips);

    onAddTrade({
      date,
      time,
      pair,
      timeframe,
      direction,
      lot,
      entryPrice,
      exitPrice,
      pnl: finalPnl,
      pips: finalPips,
      status: tradeOutcome,
      source: lastAiSetup ? 'AI_SIGNAL' : 'MANUAL',
      notes,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-surface border border-border-strong rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-trade-blue/15 border border-trade-blue/30 flex items-center justify-center">
              <BookPlus className="w-4 h-4 text-trade-blue" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Tambah Catatan Trading Manual
              </h3>
              <p className="text-xs text-gray-400">
                Catat hasil transaksi untuk memantau disiplin dan konsistensi akun
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-subtle"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Auto-Fill from Last AI Signal Button */}
        {lastAiSetup && (
          <div className="p-3 rounded-xl bg-trade-blue/10 border border-trade-blue/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <Sparkles className="w-4 h-4 text-trade-blue shrink-0" />
              <span className="text-gray-200">
                Tersedia sinyal AI: <strong className="text-white">{defaultPair} ({lastAiSetup.direction})</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={handleAutoFillFromAI}
              className="px-3 py-1.5 rounded-lg bg-trade-blue text-white text-xs font-bold hover:bg-blue-600 transition-all shadow-sm shrink-0"
            >
              Isi Otomatis dari Sinyal AI
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Hasil Transaksi (WIN / LOSS Selector) */}
          <div>
            <label className="text-[11px] font-semibold text-gray-300 block mb-1">
              Hasil Akhir Trade:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleOutcomeChange('WIN')}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  tradeOutcome === 'WIN'
                    ? 'bg-trade-buy text-white shadow-glow-buy'
                    : 'bg-surface-subtle text-gray-400 border border-border'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>WIN (Profit / TP)</span>
              </button>
              <button
                type="button"
                onClick={() => handleOutcomeChange('LOSS')}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  tradeOutcome === 'LOSS'
                    ? 'bg-trade-sell text-white shadow-glow-sell'
                    : 'bg-surface-subtle text-gray-400 border border-border'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                <span>LOSS (Kena SL)</span>
              </button>
            </div>
          </div>

          {/* Pair & Timeframe */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-300 block mb-1">Pair:</label>
              <select
                value={pair}
                onChange={(e) => setPair(e.target.value as SupportedPair)}
                className="w-full bg-surface-subtle border border-border-strong rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-trade-blue"
              >
                {['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'BTC/USD'].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                Timeframe:
              </label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as Timeframe)}
                className="w-full bg-surface-subtle border border-border-strong rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-trade-blue"
              >
                {['1m', '5m', '15m', '1h', '4h', '1d'].map((tf) => (
                  <option key={tf} value={tf}>
                    {tf}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Direction & Lot */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-300 block mb-1">Arah:</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDirection('BUY')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    direction === 'BUY'
                      ? 'bg-trade-buy text-white shadow-sm'
                      : 'bg-surface-subtle text-gray-400 border border-border'
                  }`}
                >
                  BUY
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('SELL')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    direction === 'SELL'
                      ? 'bg-trade-sell text-white shadow-sm'
                      : 'bg-surface-subtle text-gray-400 border border-border'
                  }`}
                >
                  SELL
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                Ukuran Lot:
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={lot}
                onChange={(e) => setLot(parseFloat(e.target.value) || 0.01)}
                className="w-full bg-surface-subtle border border-border-strong rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-trade-blue"
                required
              />
            </div>
          </div>

          {/* Entry & Exit Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                Harga Masuk (Entry):
              </label>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-subtle border border-border-strong rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-trade-blue"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                Harga Keluar (Exit):
              </label>
              <input
                type="number"
                step="any"
                value={exitPrice}
                onChange={(e) => setExitPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-subtle border border-border-strong rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-trade-blue"
              />
            </div>
          </div>

          {/* PnL ($) & Pips */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                Hasil Bersih PnL ($):
              </label>
              <input
                type="number"
                step="0.01"
                value={Math.abs(pnl)}
                onChange={(e) => setPnl(parseFloat(e.target.value) || 0)}
                placeholder="25.00"
                className={`w-full bg-surface-subtle border rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none ${
                  tradeOutcome === 'WIN'
                    ? 'border-trade-buy/40 text-trade-buy'
                    : 'border-trade-sell/40 text-trade-sell'
                }`}
                required
              />
              <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">
                {tradeOutcome === 'WIN' ? `+ Profit $${Math.abs(pnl).toFixed(2)}` : `- Loss $${Math.abs(pnl).toFixed(2)}`}
              </span>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                Perolehan Pips:
              </label>
              <input
                type="number"
                step="0.1"
                value={Math.abs(pips)}
                onChange={(e) => setPips(parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-subtle border border-border-strong rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-trade-blue"
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-300 block mb-1">Tanggal:</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-surface-subtle border border-border-strong rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-trade-blue"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                Waktu (WIB):
              </label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="14:30"
                className="w-full bg-surface-subtle border border-border-strong rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-trade-blue"
              />
            </div>
          </div>

          {/* Notes / Evaluasi Psikologi */}
          <div>
            <label className="text-[11px] font-semibold text-gray-300 block mb-1">
              Catatan Evaluasi Psikologi & Strategi:
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Entry disiplin sesuai Gate 4. Geser SL ke BE saat +1R sehingga psikologi sangat tenang."
              className="w-full bg-surface-subtle border border-border-strong rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-trade-blue"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-trade-blue text-white hover:bg-blue-600 transition-all shadow-glow-blue"
            >
              Simpan ke Jurnal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
