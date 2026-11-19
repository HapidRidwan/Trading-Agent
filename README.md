# 📈 Trading Agent — Pro Institutional M1 Scalping & Journal

Aplikasi web Full-Stack modern berbasis **Next.js (App Router) + Tailwind CSS** yang dirancang khusus dengan filosofi **Mobile-First (PWA Siap Instal di HP)**. Menggabungkan charting real-time interaktif sekelas TradingView, **AI Senior Institutional Trader** berbasis analisis teknikal + kalender berita ekonomi, **Notifikasi Peluang Real-Time (Auto-Radar Scanner)**, **Kalkulator Custom Lot & Leverage (1:1000)**, serta **Buku Catatan Trading Pribadi (Profit/Loss Journal & Equity Curve)**.

Desain mengusung estetika **Clean Financial Editorial Dark** (`#0D1117` background, `#161B22` surface cards, font `Plus Jakarta Sans` & `JetBrains Mono` untuk angka), anti-generic/anti-AI slop, dan sangat ramah bagi pemula (*beginner-friendly*).

---

## 🌟 Fitur Utama

### 1. 🛡️ Keamanan Server-Side, Smart Caching & Model Selector
- **Keamanan Ketat:** Seluruh API Key (`GEMINI_API_KEY`, `TWELVEDATA_API_KEY`, `APP_ACCESS_PIN`) tersimpan aman di server-side `.env.local` dan tidak pernah diekspos ke klien.
- **PIN Layar Kunci 6-Digit:** Melindungi kuota API pribadi Anda dari penggunaan tidak sah (Default PIN: `123456`).
- **Smart Caching:** Timeframe `1h` di-cache 10 menit, `15m` di-cache 3 menit untuk menghemat kuota TwelveData.
- **Realistic M1 Market Simulator:** Cadangan otomatis cerdas jika `TWELVEDATA_API_KEY` kosong atau limit harian habis. Mensimulasikan siklus pasar dinamis (*Trending Bull*, *Sideways Choppy*, *Trending Bear*, hingga *News Spike* berfrekuensi tinggi).
- **Pemilih Model Dinamis & Auto-Fallback:**
  - Dropdown preset: `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-3-flash-preview`.
  - Input teks bebas **"Custom Model ID"** (misal: `gemini-3.8-flash` dari Google AI Studio).
  - Mengaktifkan penalaran tinggi (*Thinking Level: HIGH* / *Budget: 24576*) dengan batas timeout 60 detik dan **Auto-Fallback** ke `gemini-2.5-flash` jika terjadi error 404.

### 2. 🏛️ 6-Gate Institutional AI Trader (M1 Scalping)
AI bertindak sebagai Senior Institutional Trader dengan disiplin ketat yang wajib meloloskan 6 gerbang pengaman sebelum mengeluarkan rekomendasi `BUY` atau `SELL`:
- **Gate 0 — News Spike Shield:** Memeriksa jadwal berita ekonomi *High Impact* (NFP, CPI, Suku Bunga). Jika berada dalam rentang **±15 menit**, AI wajib menahan entry dengan status **`NO TRADE — WASPADA BERITA HIGH IMPACT`**.
- **Gate 1 — Session & Spread Guard:** Menolak entry jika berada di jam *Bank Rollover* (03.30–05.30 WIB) atau nilai spread melebihi **25% dari ATR(14) M1**.
- **Gate 2 — Trend vs Sideways Filter:** Menolak entry jika `ADX(14) < 22` atau EMA 20 & EMA 50 saling menyilang rapat (*choppy*).
- **Gate 3 — Konfirmasi Multi-Timeframe:** Menolak entry jika momentum M1 melawan arah tren besar pada timeframe 15m/1h.
- **Gate 4 — Validasi Struktur Harga & ATR Risk Guard:** Memastikan RSI tidak *overextended* (>72 atau <28), Stop Loss diletakkan di balik Micro Swing + buffer `1.5 x ATR(14)`, dan Take Profit memiliki rasio **Risk-to-Reward minimal 1:2**.
- **Gate 5 — Tindakan Otonom & 1-Tap Copy:** Menggambar garis Entry (Biru), Stop Loss (Merah), TP 1 (Hijau), dan TP 2 (Hijau Tua) pada grafik dengan tombol **1-Tap Copy** ke MT4/MT5, panduan Break Even (BE / SL+), dan tombol cepat `[Catat Win]` / `[Catat Loss]`.

### 3. 📡 Notifikasi Peluang Real-Time (Auto-Radar Scanner)
- Toggle tombol **"Live Radar Alert"** di header aplikasi.
- Pemindaian otomatis latar belakang dengan pre-filter lokal (hemat kuota API) saat pergantian candle.
- Jika terdeteksi setup probabilitas tinggi (skor `>= 80%`) yang lolos 6 gerbang:
  1. **Browser Web Push Notification** di layar HP/Desktop (Service Worker PWA).
  2. **Efek Suara Chime Lembut** (Web Audio API Dual-Tone Chime tanpa file eksternal).
  3. **Banner Notifikasi Mengambang** yang dapat diketuk untuk langsung membuka grafik & setup.

### 4. 🧮 Kalkulator Custom Lot, Leverage (1:1000) & Rem Darurat Harian
- **Mode Dua Arah:**
  - **Tab "Auto Lot (Aman)":** Menghitung ukuran lot otomatis berdasarkan batas risiko (0.5%, 1%, 2% modal).
  - **Tab "Custom Lot (Manual)":** Ketik lot sendiri untuk melihat simulasi *Used Margin*, *Free Margin*, *Ketahanan Pips*, dan *Floating Loss ($)* saat kena SL.
  - **Over-Leverage Warning:** Peringatan bahaya jika rugi SL melebihi 5% modal atau ketahanan pips < 50 pips, dilengkapi tombol 1-klik **"Sesuaikan ke Lot Aman"**.
  - Rumus nilai pip akurat untuk **Major Forex** (0.0001), **JPY Pairs** (0.01), dan **Gold XAU/USD** (0.10, 100 oz contract).
- **Rem Darurat Harian (Daily Drawdown Guard):** Batas rugi maksimal harian (default 3%) atau maksimal 2x SL beruntun. Jika tercapai, tombol entry/scan dikunci otomatis untuk mencegah *revenge trading*.

### 5. 📓 Buku Catatan Trading Pribadi (Profit/Loss Journal & Equity Curve)
- Tersimpan permanen di `localStorage` klien dengan fitur **Export CSV** (Excel) serta **Export & Import JSON** (Backup).
- Catat otomatis dari rekomendasi AI (`+ Catat Win` / `+ Catat Loss`) atau tombol `+ Tambah Catatan Manual`.
- **Dashboard Ringkasan KPI:** Saldo Terkini, Modal Awal, Net PnL (+$ / -$ dan %), **Winrate (%)**, **Profit Factor**, Trade Terbaik & Terburuk.
- **Grafik Kurva Pertumbuhan Saldo (Equity Curve):** Grafik garis SVG interaktif yang memperlihatkan perkembangan saldo dari transaksi awal hingga terkini.

---

## 🚀 Panduan Instalasi & Menjalankan Aplikasi

### 1. Prasyarat
- Node.js versi 18+ atau 20+ (Direkomendasikan Node 20+).
- npm, pnpm, atau yarn.

### 2. Konfigurasi Variabel Lingkungan (`.env.local`)
Salin file `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```

Buka `.env.local` dan sesuaikan nilainya:
```env
# 1. Google Gemini AI API Key (Dapatkan gratis di https://aistudio.google.com/)
GEMINI_API_KEY=your_gemini_api_key_here

# 2. Model Gemini Default (Fallback stabil)
GEMINI_DEFAULT_MODEL=gemini-2.5-flash

# 3. TwelveData API Key (Opsional - data pasar real-time)
# Biarkan KOSONG untuk menggunakan Realistic M1 Market Simulator bawaan
TWELVEDATA_API_KEY=

# 4. PIN Keamanan 6 Digit (Melindungi kuota API pribadi Anda)
APP_ACCESS_PIN=123456
```

> **Catatan:** Jika `GEMINI_API_KEY` belum diisi, aplikasi tetap dapat langsung diuji dan dijalankan secara penuh menggunakan **Deterministic Institutional Rule Engine** bawaan yang menerapkan seluruh rumus 6-Gate secara presisi.

### 3. Menjalankan Server Pengembangan
```bash
npm run dev
```
Buka browser di [http://localhost:3000](http://localhost:3000).

### 4. Membangun untuk Produksi (Production Build)
```bash
npm run build
npm run start
```

---

## 📱 Panduan PWA (Instal di HP Android & iOS)

Aplikasi ini sudah dilengkapi dengan Web App Manifest (`manifest.json`), Service Worker (`sw.js`), dan viewport mobile-first:
1. **Android (Chrome):** Buka alamat aplikasi di Chrome, ketuk menu titik tiga (⋮) di kanan atas, lalu pilih **"Tambahkan ke Layar Utama" (Install App)**.
2. **iOS (Safari):** Buka di Safari, ketuk tombol **Share (Bagikan)** di bagian bawah, lalu pilih **"Add to Home Screen" (Tambah ke Layar Utama)**.

---

## 📂 Struktur Direktori Proyek

```
Trading Agent/
├── .env.example               # Contoh variabel lingkungan
├── .env.local                 # Konfigurasi rahasia server-side
├── public/
│   ├── manifest.json          # Web App Manifest PWA
│   ├── sw.js                  # Service Worker PWA (Push & Caching)
│   └── icons/                 # Ikon PWA (192x192 & 512x512)
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout + Fonts + PWA meta tags
│   │   ├── page.tsx           # Main App Coordinator & State Engine
│   │   ├── globals.css        # Tailwind directives, financial dark theme
│   │   └── api/
│   │       ├── auth/verify-pin/route.ts  # Verifikasi PIN 6-digit
│   │       ├── market/route.ts           # Market data + Smart Caching + M1 Simulator
│   │       ├── news/route.ts             # Kalender ekonomi harian + Session status
│   │       └── analyze/route.ts          # 6-Gate AI Scalper + Gemini High Reasoning
│   ├── components/
│   │   ├── Header.tsx                    # Header, Market Weather Badge, Radar Toggle
│   │   ├── BottomNav.tsx                 # 4 Tab Navigasi Bawah Mobile
│   │   ├── PinLockModal.tsx              # Layar Pembuka PIN 6-Digit
│   │   ├── Tooltip.tsx                   # Tooltip Edukasi Instan (?) istilah teknis
│   │   ├── ChartTab/
│   │   │   ├── TradingChart.tsx          # Lightweight-Charts Canvas + Annotations
│   │   │   ├── AISignalCard.tsx          # Kartu Sinyal AI + 1-Tap Copy + 1-Click Journal
│   │   │   ├── SixGateChecklist.tsx      # Checklist 6 Gerbang Risiko Institusional
│   │   │   └── ModelSettingsModal.tsx    # Pengaturan Model AI & Custom Model ID
│   │   ├── NewsTab/
│   │   │   ├── SessionStatus.tsx         # Sesi Pasar Global (Sydney, Tokyo, London, NY)
│   │   │   └── NewsCalendar.tsx          # Kalender Berita Ekonomi + Countdown
│   │   ├── CalculatorTab/
│   │   │   ├── LotCalculator.tsx         # Auto/Custom Lot + Leverage 1:1000 Simulator
│   │   │   └── EmergencyDrawdownGuard.tsx # Rem Darurat Harian
│   │   ├── JournalTab/
│   │   │   ├── JournalDashboard.tsx      # Dashboard KPI (Winrate, Profit Factor)
│   │   │   ├── EquityCurve.tsx           # Kurva Pertumbuhan Saldo Interaktif
│   │   │   ├── TradeLogList.tsx          # Riwayat Trade, Filter, CSV & JSON Export/Import
│   │   │   └── AddTradeModal.tsx         # Modal Tambah Catatan Manual
│   │   └── Common/
│   │       └── ToastNotification.tsx     # Floating Toast Peluang Radar
│   └── lib/
│       ├── types.ts                      # Tipe data TypeScript komprehensif
│       ├── indicators.ts                 # Algoritma EMA, ATR, ADX, RSI, Bollinger Bands
│       ├── marketSimulator.ts            # Realistic M1 Market Generator
│       ├── soundAlert.ts                 # Web Audio API Synthesizer (Chime & Buzzer)
│       └── storage.ts                    # LocalStorage Engine, CSV Export & JSON Backup
```

---

## 🔒 Kebijakan Keamanan & Disiplin
- Aplikasi ini dibangun dengan standar disiplin trading institusional: **Modal preservation is rule #1**.
- Jika Anda mengalami masalah atau membutuhkan kustomisasi lebih lanjut, periksa berkas konfigurasi di `.env.local` atau hubungi tim pengembang.
