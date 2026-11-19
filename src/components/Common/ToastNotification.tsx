'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Bell, X, ExternalLink } from 'lucide-react';
import { TradeSetup } from '@/lib/types';

interface ToastNotificationProps {
  notification: {
    id: string;
    pair: string;
    direction: 'BUY' | 'SELL';
    headline: string;
    score: number;
    rrRatio: number;
    setup: TradeSetup;
  } | null;
  onClose: () => void;
  onOpenSetup: () => void;
}

export default function ToastNotification({
  notification,
  onClose,
  onOpenSetup,
}: ToastNotificationProps) {
  if (!notification) return null;

  const isBuy = notification.direction === 'BUY';

  return (
    <div className="fixed top-16 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-in slide-in-from-top-4 duration-300">
      <div
        onClick={onOpenSetup}
        className="cursor-pointer bg-surface/95 backdrop-blur-xl border border-border-strong rounded-2xl p-4 shadow-2xl hover:border-trade-blue transition-all group"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isBuy
                  ? 'bg-trade-buy/15 text-trade-buy border border-trade-buy/30'
                  : 'bg-trade-sell/15 text-trade-sell border border-trade-sell/30'
              }`}
            >
              {isBuy ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Radar Alert: {notification.pair}
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                    isBuy ? 'bg-trade-buy/20 text-trade-buy' : 'bg-trade-sell/20 text-trade-sell'
                  }`}
                >
                  {notification.direction}
                </span>
                <span className="text-[10px] font-mono text-gray-400">
                  Skor: {notification.score}%
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-0.5 line-clamp-1 font-medium">
                {notification.headline}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-surface-subtle"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick parameters bar */}
        <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-[11px] font-mono text-gray-400">
          <div>
            Entry: <span className="text-trade-blue font-semibold">{notification.setup.entry}</span>
          </div>
          <div>
            SL: <span className="text-trade-sell font-semibold">{notification.setup.stopLoss}</span>
          </div>
          <div>
            TP 1: <span className="text-trade-buy font-semibold">{notification.setup.tp1}</span>
          </div>
          <div className="flex items-center gap-1 text-trade-gold font-semibold">
            <span>R:R 1:{notification.rrRatio}</span>
            <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}
