'use client';

import React, { useState } from 'react';
import { TrendingUp, LineChart, Info } from 'lucide-react';
import { JournalTrade } from '@/lib/types';

interface EquityCurveProps {
  trades: JournalTrade[];
  startingBalance: number;
}

export default function EquityCurve({ trades, startingBalance }: EquityCurveProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number;
    balance: number;
    pnl: number;
    pair: string;
    date: string;
  } | null>(null);

  // Trades are stored newest first in storage, reverse for chronological equity progression
  const chronoTrades = [...trades].reverse();

  // Build equity points
  const points: Array<{ index: number; balance: number; pnl: number; pair: string; date: string }> = [
    { index: 0, balance: startingBalance, pnl: 0, pair: 'Deposit Awal', date: 'Mulai' },
  ];

  let currentBal = startingBalance;
  chronoTrades.forEach((t, i) => {
    currentBal = Number((currentBal + t.pnl).toFixed(2));
    points.push({
      index: i + 1,
      balance: currentBal,
      pnl: t.pnl,
      pair: t.pair,
      date: t.date,
    });
  });

  if (points.length <= 1) {
    return (
      <div className="w-full bg-surface border border-border rounded-2xl p-6 shadow-panel text-center">
        <LineChart className="w-8 h-8 text-gray-500 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-white">Kurva Pertumbuhan Saldo (Equity Curve)</h4>
        <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
          Belum ada catatan transaksi. Catat transaksi pertama Anda lewat kartu rekomendasi AI atau tombol "+ Tambah Catatan Manual" untuk melihat kurva pertumbuhan saldo.
        </p>
      </div>
    );
  }

  // Calculate SVG dimensions
  const width = 600;
  const height = 200;
  const paddingX = 40;
  const paddingY = 25;

  const minBalance = Math.min(...points.map((p) => p.balance));
  const maxBalance = Math.max(...points.map((p) => p.balance));
  const balanceRange = Math.max(1, maxBalance - minBalance);

  const getX = (index: number) => {
    return paddingX + (index / (points.length - 1)) * (width - paddingX * 2);
  };

  const getY = (bal: number) => {
    return height - paddingY - ((bal - minBalance) / balanceRange) * (height - paddingY * 2);
  };

  // Generate SVG path string
  const pathD = points.reduce((acc, p, i) => {
    const x = getX(i);
    const y = getY(p.balance);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  // Generate Area under curve
  const areaD = `${pathD} L ${getX(points.length - 1)} ${height - paddingY} L ${getX(0)} ${height - paddingY} Z`;

  const isNetGrowing = currentBal >= startingBalance;

  return (
    <div className="w-full bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-panel flex flex-col gap-3">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <LineChart className="w-4 h-4 text-trade-blue" />
          <h4 className="text-sm font-bold text-white tracking-tight">
            Grafik Kurva Pertumbuhan Saldo (Equity Curve)
          </h4>
        </div>
        <span
          className={`font-mono text-xs font-bold ${
            isNetGrowing ? 'text-trade-buy' : 'text-trade-sell'
          }`}
        >
          {isNetGrowing ? '↗ Upward Trending' : '↘ Drawdown Phase'}
        </span>
      </div>

      {/* SVG Canvas Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 sm:h-52 overflow-visible"
        >
          <defs>
            <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={isNetGrowing ? '#3FB950' : '#F85149'}
                stopOpacity="0.35"
              />
              <stop
                offset="100%"
                stopColor={isNetGrowing ? '#3FB950' : '#F85149'}
                stopOpacity="0.0"
              />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 3"
          />
          <line
            x1={paddingX}
            y1={height / 2}
            x2={width - paddingX}
            y2={height / 2}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 3"
          />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="rgba(255,255,255,0.06)"
          />

          {/* Labels Min & Max */}
          <text
            x={paddingX}
            y={paddingY - 8}
            fill="#8B949E"
            fontSize="10"
            fontFamily="monospace"
          >
            Max: ${maxBalance.toFixed(0)}
          </text>
          <text
            x={paddingX}
            y={height - 6}
            fill="#8B949E"
            fontSize="10"
            fontFamily="monospace"
          >
            Min: ${minBalance.toFixed(0)}
          </text>

          {/* Fill Area */}
          <path d={areaD} fill="url(#equityGrad)" />

          {/* Main Line */}
          <path
            d={pathD}
            fill="none"
            stroke={isNetGrowing ? '#3FB950' : '#F85149'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Circle Points */}
          {points.map((p, i) => {
            const cx = getX(i);
            const cy = getY(p.balance);
            const isHovered = hoveredPoint?.index === p.index;

            return (
              <circle
                key={p.index}
                cx={cx}
                cy={cy}
                r={isHovered ? 6 : 3.5}
                fill={p.pnl >= 0 ? '#3FB950' : '#F85149'}
                stroke="#0D1117"
                strokeWidth="2"
                className="cursor-pointer transition-all hover:scale-125"
                onMouseEnter={() => setHoveredPoint(p)}
                onClick={() => setHoveredPoint(p)}
              />
            );
          })}
        </svg>

        {/* Hover Tooltip display */}
        {hoveredPoint && (
          <div className="absolute top-2 right-2 bg-surface-subtle/95 border border-border-strong rounded-xl p-2.5 text-xs font-mono shadow-panel animate-in fade-in">
            <div className="text-gray-400 text-[10px]">Trade #{hoveredPoint.index}</div>
            <div className="font-bold text-white text-sm">
              ${hoveredPoint.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px]">
              <span className="text-gray-300">{hoveredPoint.pair}</span>
              {hoveredPoint.index > 0 && (
                <span
                  className={`font-bold ${
                    hoveredPoint.pnl >= 0 ? 'text-trade-buy' : 'text-trade-sell'
                  }`}
                >
                  {hoveredPoint.pnl >= 0 ? '+' : ''}${hoveredPoint.pnl.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="text-[11px] text-gray-500 font-mono flex items-center justify-between pt-1 border-t border-border/40">
        <span>Awal: ${startingBalance.toFixed(2)}</span>
        <span>Trade Ke-{points.length - 1} Terkini: ${currentBal.toFixed(2)}</span>
      </div>
    </div>
  );
}
