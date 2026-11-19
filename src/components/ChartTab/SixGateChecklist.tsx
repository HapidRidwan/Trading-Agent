'use client';

import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { GateResult } from '@/lib/types';
import Tooltip from '../Tooltip';

interface SixGateChecklistProps {
  gates: GateResult[];
}

export default function SixGateChecklist({ gates }: SixGateChecklistProps) {
  if (!gates || gates.length === 0) return null;

  return (
    <div className="w-full bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-panel flex flex-col gap-3">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-trade-blue" />
            6-Gate Institutional Risk Checklist
          </h4>
          <p className="text-xs text-gray-400 mt-0.5">
            Seluruh 6 gerbang wajib lolos sebelum AI diizinkan mengeluarkan rekomendasi Entry.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {gates.map((gate) => {
          const isPassed = gate.status === 'PASSED';
          const isFailed = gate.status === 'FAILED';

          return (
            <div
              key={gate.gateIndex}
              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                isPassed
                  ? 'bg-surface-subtle/50 border-border hover:border-trade-buy/30'
                  : 'bg-trade-sell/5 border-trade-sell/30 shadow-sm'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      isPassed
                        ? 'bg-trade-buy/15 text-trade-buy'
                        : 'bg-trade-sell/15 text-trade-sell'
                    }`}
                  >
                    {isPassed ? (
                      <CheckCircle className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-white tracking-tight">
                    {gate.name}
                  </span>
                </div>

                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    isPassed
                      ? 'bg-trade-buy/15 text-trade-buy border border-trade-buy/30'
                      : 'bg-trade-sell/15 text-trade-sell border border-trade-sell/30'
                  }`}
                >
                  {gate.status}
                </span>
              </div>

              {/* Reason / Market Condition */}
              <p className="text-xs text-gray-300 font-medium mb-2 leading-relaxed">
                {gate.reason}
              </p>

              {/* Beginner Education Note */}
              <div className="p-2 rounded-lg bg-surface/80 border border-border/60 text-[11px] text-gray-400 flex items-start gap-1.5 leading-snug">
                <Info className="w-3.5 h-3.5 text-trade-blue shrink-0 mt-0.5" />
                <span>{gate.educationNote}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
