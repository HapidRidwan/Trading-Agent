'use client';

import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface TooltipProps {
  term: string;
  explanation: string;
  className?: string;
}

export const GLOSSARY: Record<string, string> = {
  ATR: 'Average True Range: Indikator pengukur rata-rata rentang volatilitas lilin (candle). Digunakan untuk menghitung jarak Stop Loss yang realistis agar tidak tersenggol noise pasar.',
  ADX: 'Average Directional Index: Pengukur kekuatan tren pasar (skala 0-100). Nilai di atas 22 menandakan pasar sedang trending kuat. Di bawah 22 berarti pasar sideways/choppy.',
  RSI: 'Relative Strength Index: Momentum harga (0-100). Di atas 70 (Overbought) rawan aksi ambil untung; di bawah 30 (Oversold) rawan pantulan balik.',
  Spread: 'Selisih harga beli (Ask) dan harga jual (Bid) yang menjadi biaya broker. Pada scalping M1, spread wajib rendah agar profit tidak tergerus.',
  Leverage: 'Daya ungkit pinjaman modal dari broker (misal 1:1000). Memperkecil jaminan margin per lot, namun memperbesar risiko jika tidak dibatasi lot aman.',
  Rollover: 'Jeda penutupan harian perbankan global (03.30–05.30 WIB). Pada jam ini likuiditas sangat tipis dan broker melebarkan spread secara ekstrem.',
  'Risk:Reward': 'Perbandingan antara potensi risiko rugi (Stop Loss) dan potensi keuntungan (Take Profit). Minimal 1:2 agar profit konsisten.',
  'Break Even': 'Tindakan menggeser Stop Loss persis ke harga masuk (Entry) atau sedikit di atasnya (SL+) setelah profit awal tercapai untuk mengunci risiko nol.',
  'Used Margin': 'Jumlah modal yang dikunci broker sebagai jaminan atas posisi trading yang sedang aktif.',
  'Free Margin': 'Sisa saldo modal yang bebas dan masih bisa digunakan untuk membuka posisi baru atau menahan floating minus.',
  'Ketahanan Pips': 'Jarak penurunan pips yang mampu ditahan oleh akun sebelum modal habis terkena Stop Out / Margin Call.',
  'Cent Account': 'Akun trading berskala 1/100, di mana $1 USD setara dengan 100 USC (US Cents). Sangat ideal bagi pemula melatih psikologi.',
};

export default function Tooltip({ term, explanation, className = '' }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className={`inline-flex items-center align-middle relative ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="text-gray-400 hover:text-trade-blue focus:outline-none transition-colors p-0.5 ml-1"
        aria-label={`Penjelasan istilah ${term}`}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed md:absolute bottom-4 left-4 right-4 md:bottom-full md:left-1/2 md:-translate-x-1/2 md:right-auto md:w-72 p-3.5 bg-surface-subtle border border-border-strong rounded-xl shadow-panel text-left z-50 text-xs text-gray-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border">
              <span className="font-semibold text-trade-blue flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-trade-blue" />
                {term}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="leading-relaxed text-gray-300">
              {explanation || GLOSSARY[term] || 'Penjelasan teknis belum tersedia.'}
            </p>
          </div>
        </>
      )}
    </span>
  );
}
