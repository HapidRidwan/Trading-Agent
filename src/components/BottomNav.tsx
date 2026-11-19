'use client';

import React from 'react';
import {
  CandlestickChart,
  Newspaper,
  Calculator,
  BookOpen,
} from 'lucide-react';

export type ActiveTab = 'chart' | 'news' | 'calculator' | 'journal';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  newsSpikeCount: number;
}

export default function BottomNav({
  activeTab,
  onTabChange,
  newsSpikeCount,
}: BottomNavProps) {
  const tabs = [
    {
      id: 'chart' as ActiveTab,
      label: 'Chart & AI',
      icon: CandlestickChart,
    },
    {
      id: 'news' as ActiveTab,
      label: 'Berita',
      icon: Newspaper,
      badge: newsSpikeCount > 0 ? newsSpikeCount : undefined,
    },
    {
      id: 'calculator' as ActiveTab,
      label: 'Kalkulator',
      icon: Calculator,
    },
    {
      id: 'journal' as ActiveTab,
      label: 'Buku Catatan',
      icon: BookOpen,
    },
  ];

  return (
    <nav className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-md backdrop-blur-xl bg-[#0F131A]/85 border border-white/10 rounded-2xl shadow-2xl px-2 py-1.5 transition-all">
      <div className="grid grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
                isActive
                  ? 'text-white font-medium'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
              }`}
            >
              {/* Thin Luminous Top Accent Glow Indicator */}
              {isActive && (
                <span className="absolute -top-1 w-6 h-[2px] rounded-full bg-gradient-to-r from-blue-400 to-indigo-400 shadow-[0_0_8px_rgba(88,166,255,0.85)] animate-in fade-in" />
              )}

              <div className="relative mt-0.5">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-105 text-trade-blue' : 'text-gray-400'
                  }`}
                />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-2.5 w-4 h-4 rounded-full bg-trade-sell text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[#0F131A] animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-1 tracking-tight leading-none truncate max-w-full font-sans ${
                  isActive ? 'text-white font-semibold' : 'text-gray-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
