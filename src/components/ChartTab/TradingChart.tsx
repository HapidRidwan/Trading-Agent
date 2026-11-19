'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  LineData,
  ColorType,
  Time,
} from 'lightweight-charts';
import { Candle, SupportedPair, Timeframe, TradeSetup, ChartZone } from '@/lib/types';
import { calculateEMA } from '@/lib/indicators';
import { PAIR_CONFIGS } from '@/lib/marketSimulator';
import {
  RefreshCw,
  BarChart2,
  Eye,
  EyeOff,
  Crosshair,
  TrendingUp,
  Minus,
  AlignJustify,
  Square,
  Ruler,
  Trash2,
} from 'lucide-react';
import Tooltip from '../Tooltip';
import { formatPairPrice } from './AISignalCard';
import { soundAlert } from '@/lib/soundAlert';

interface TradingChartProps {
  pair: SupportedPair;
  timeframe: Timeframe;
  candles: Candle[];
  tradeSetup: TradeSetup | null;
  supplyDemandZones: ChartZone[];
  spreadPips: number;
  currentPrice: number;
  dataSource?: string;
  onPairChange: (pair: SupportedPair) => void;
  onTimeframeChange: (tf: Timeframe) => void;
  onRefresh: () => void;
  isLoading: boolean;
  onShowToast?: (msg: string) => void;
}

export type DrawingTool =
  | 'crosshair'
  | 'trendline'
  | 'horizontal'
  | 'fibonacci'
  | 'rectangle'
  | 'measure';

interface LegendState {
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
  ema20?: number;
  ema50?: number;
  isUp: boolean;
}

export default function TradingChart({
  pair,
  timeframe,
  candles,
  tradeSetup,
  supplyDemandZones,
  spreadPips,
  currentPrice,
  dataSource = 'Simulator',
  onPairChange,
  onTimeframeChange,
  onRefresh,
  isLoading,
  onShowToast,
}: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const ema20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const priceLinesRef = useRef<any[]>([]);
  const userDrawingsRef = useRef<any[]>([]);
  const lastPairTfRef = useRef<string>('');
  const prevCandlesLengthRef = useRef<number>(0);

  const [showIndicators, setShowIndicators] = useState(true);
  const [showLevels, setShowLevels] = useState(true);
  const [activeTool, setActiveTool] = useState<DrawingTool>('crosshair');
  const [legendData, setLegendData] = useState<LegendState | null>(null);

  const pairConfig = PAIR_CONFIGS[pair] || PAIR_CONFIGS['XAU/USD'];

  // Initialize and bind Lightweight Charts
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0F131A' },
        textColor: '#8B949E',
        fontSize: 11,
        fontFamily: 'var(--font-jetbrains), monospace',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      crosshair: {
        vertLine: { color: 'rgba(88, 166, 255, 0.4)', width: 1, style: 3 },
        horzLine: { color: 'rgba(88, 166, 255, 0.4)', width: 1, style: 3 },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.06)',
        scaleMargins: {
          top: 0.06,
          bottom: 0.14,
        },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.06)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
      },
    });

    chartRef.current = chart;

    // Candlestick Series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#3FB950',
      downColor: '#F85149',
      borderVisible: false,
      wickUpColor: '#3FB950',
      wickDownColor: '#F85149',
    });
    candleSeriesRef.current = candleSeries;

    // Volume Histogram (strictly capped at max 12% height at the bottom)
    const volumeSeries = chart.addHistogramSeries({
      color: 'rgba(88, 166, 255, 0.18)',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // overlay
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.88, // Volume height restricted to bottom 12%
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // EMA 20 (Blue)
    const ema20Series = chart.addLineSeries({
      color: '#58A6FF',
      lineWidth: 2,
      priceLineVisible: false,
      title: 'EMA 20',
    });
    ema20SeriesRef.current = ema20Series;

    // EMA 50 (Purple)
    const ema50Series = chart.addLineSeries({
      color: '#BC8CFF',
      lineWidth: 2,
      priceLineVisible: false,
      title: 'EMA 50',
    });
    ema50SeriesRef.current = ema50Series;

    // Real-time Floating OHLC & EMA Legend Subscription
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData) {
        return;
      }
      const cData: any = param.seriesData.get(candleSeries);
      const e20: any = param.seriesData.get(ema20Series);
      const e50: any = param.seriesData.get(ema50Series);

      if (cData && typeof cData.close === 'number') {
        setLegendData({
          o: cData.open,
          h: cData.high,
          l: cData.low,
          c: cData.close,
          ema20: e20 ? e20.value : undefined,
          ema50: e50 ? e50.value : undefined,
          isUp: cData.close >= cData.open,
        });
      }
    });

    // Handle user drawing placement on chart click
    chart.subscribeClick((param) => {
      if (!param || !param.point || !param.time || !candleSeriesRef.current) return;
      const clickedPrice = candleSeriesRef.current.coordinateToPrice(param.point.y);
      if (!clickedPrice) return;

      const currentTool = (window as any).__activeTradingTool || 'crosshair';

      if (currentTool === 'horizontal') {
        soundAlert.playCopyTick();
        const userLine = candleSeriesRef.current.createPriceLine({
          price: clickedPrice,
          color: '#E3B341',
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `Line: ${formatPairPrice(clickedPrice, pair)}`,
        });
        userDrawingsRef.current.push(userLine);
        if (onShowToast) onShowToast(`Garis Horizontal dipasang pada ${formatPairPrice(clickedPrice, pair)}`);
      } else if (currentTool === 'fibonacci') {
        soundAlert.playCopyTick();
        // Plot 3 fib levels around clicked price
        const fibLevels = [1.0, 0.618, 0.5, 0.382, 0];
        const step = clickedPrice * 0.0015;
        fibLevels.forEach((fib, idx) => {
          const p = clickedPrice + (idx - 2) * step;
          const l = candleSeriesRef.current!.createPriceLine({
            price: p,
            color: fib === 0.618 || fib === 0.5 ? '#58A6FF' : '#8B949E',
            lineWidth: 1,
            lineStyle: 1,
            axisLabelVisible: true,
            title: `Fib ${(fib * 100).toFixed(1)}%`,
          });
          userDrawingsRef.current.push(l);
        });
        if (onShowToast) onShowToast('Level Fibonacci berhasil diproyeksikan pada chart');
      } else if (currentTool === 'rectangle') {
        soundAlert.playCopyTick();
        const top = clickedPrice * 1.0008;
        const bottom = clickedPrice * 0.9992;
        const lTop = candleSeriesRef.current.createPriceLine({
          price: top,
          color: '#BC8CFF',
          lineWidth: 1,
          lineStyle: 0,
          title: 'Zone Top',
        });
        const lBot = candleSeriesRef.current.createPriceLine({
          price: bottom,
          color: '#BC8CFF',
          lineWidth: 1,
          lineStyle: 0,
          title: 'Zone Bottom',
        });
        userDrawingsRef.current.push(lTop, lBot);
        if (onShowToast) onShowToast('Zona Supply/Demand ditambahkan');
      }
    });

    // Responsive Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length > 0 && chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [pair]);

  // Sync global window active tool for click listener
  useEffect(() => {
    (window as any).__activeTradingTool = activeTool;
  }, [activeTool]);

  // Update candle data & indicators with smooth real-time tick streaming (chart.updateData)
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || candles.length === 0) return;

    const currentKey = `${pair}_${timeframe}`;
    const isPairOrTfChange = lastPairTfRef.current !== currentKey;
    const isInitialLoad = prevCandlesLengthRef.current === 0;

    // Format candles for lightweight-charts
    const chartCandles: CandlestickData<Time>[] = candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const chartVolumes: HistogramData<Time>[] = candles.map((c) => ({
      time: c.time as Time,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(63, 185, 80, 0.25)' : 'rgba(248, 81, 73, 0.25)',
    }));

    // Calculate EMAs
    const closes = candles.map((c) => c.close);
    const ema20Values = calculateEMA(closes, 20);
    const ema50Values = calculateEMA(closes, 50);

    const ema20Data: LineData<Time>[] = [];
    const ema50Data: LineData<Time>[] = [];

    for (let i = 0; i < candles.length; i++) {
      if (!isNaN(ema20Values[i])) {
        ema20Data.push({ time: candles[i].time as Time, value: ema20Values[i] });
      }
      if (!isNaN(ema50Values[i])) {
        ema50Data.push({ time: candles[i].time as Time, value: ema50Values[i] });
      }
    }

    // Incremental Real-Time Live Tick Injection vs Full Reset
    if (isPairOrTfChange || isInitialLoad || Math.abs(candles.length - prevCandlesLengthRef.current) > 1) {
      // Full dataset initialization on symbol/timeframe switch
      candleSeriesRef.current.setData(chartCandles);
      volumeSeriesRef.current.setData(chartVolumes);
      if (ema20SeriesRef.current) {
        ema20SeriesRef.current.setData(showIndicators ? ema20Data : []);
      }
      if (ema50SeriesRef.current) {
        ema50SeriesRef.current.setData(showIndicators ? ema50Data : []);
      }
      lastPairTfRef.current = currentKey;
    } else {
      // Smooth real-time update: update latest candle and EMAs without reloading chart canvas
      const latestCandle = chartCandles[chartCandles.length - 1];
      const latestVolume = chartVolumes[chartVolumes.length - 1];
      candleSeriesRef.current.update(latestCandle);
      volumeSeriesRef.current.update(latestVolume);

      if (showIndicators) {
        const lastEma20 = ema20Data[ema20Data.length - 1];
        const lastEma50 = ema50Data[ema50Data.length - 1];
        if (lastEma20 && ema20SeriesRef.current) ema20SeriesRef.current.update(lastEma20);
        if (lastEma50 && ema50SeriesRef.current) ema50SeriesRef.current.update(lastEma50);
      }
    }

    prevCandlesLengthRef.current = candles.length;

    // Default legend to latest candle
    const last = candles[candles.length - 1];
    const lastEma20 = ema20Values[ema20Values.length - 1];
    const lastEma50 = ema50Values[ema50Values.length - 1];
    setLegendData({
      o: last.open,
      h: last.high,
      l: last.low,
      c: last.close,
      v: last.volume,
      ema20: !isNaN(lastEma20) ? lastEma20 : undefined,
      ema50: !isNaN(lastEma50) ? lastEma50 : undefined,
      isUp: last.close >= last.open,
    });
  }, [candles, showIndicators, pair, timeframe]);

  // Update Trade Setup Price Lines (Entry, SL, TP 1, TP 2) with exact decimal precision
  useEffect(() => {
    if (!candleSeriesRef.current) return;

    // Remove existing price lines
    priceLinesRef.current.forEach((line) => {
      try {
        candleSeriesRef.current?.removePriceLine(line);
      } catch (e) {}
    });
    priceLinesRef.current = [];

    if (!showLevels || !tradeSetup) return;

    // Entry Line (Blue #58A6FF)
    const entryLine = candleSeriesRef.current.createPriceLine({
      price: tradeSetup.entry,
      color: '#58A6FF',
      lineWidth: 2,
      lineStyle: 0, // Solid
      axisLabelVisible: true,
      title: `ENTRY (${tradeSetup.direction}) ${formatPairPrice(tradeSetup.entry, pair)}`,
    });
    priceLinesRef.current.push(entryLine);

    // Stop Loss Line (Red #F85149)
    const slLine = candleSeriesRef.current.createPriceLine({
      price: tradeSetup.stopLoss,
      color: '#F85149',
      lineWidth: 2,
      lineStyle: 2, // Dashed
      axisLabelVisible: true,
      title: `SL (-${tradeSetup.slPips}p) ${formatPairPrice(tradeSetup.stopLoss, pair)}`,
    });
    priceLinesRef.current.push(slLine);

    // Take Profit 1 Line (Green #3FB950)
    const tp1Line = candleSeriesRef.current.createPriceLine({
      price: tradeSetup.tp1,
      color: '#3FB950',
      lineWidth: 2,
      lineStyle: 1, // Dotted
      axisLabelVisible: true,
      title: `TP 1 (+${tradeSetup.tp1Pips}p) ${formatPairPrice(tradeSetup.tp1, pair)}`,
    });
    priceLinesRef.current.push(tp1Line);

    // Take Profit 2 Line (Dark Green #238636)
    const tp2Line = candleSeriesRef.current.createPriceLine({
      price: tradeSetup.tp2,
      color: '#238636',
      lineWidth: 2,
      lineStyle: 1,
      axisLabelVisible: true,
      title: `TP 2 (+${tradeSetup.tp2Pips}p) ${formatPairPrice(tradeSetup.tp2, pair)}`,
    });
    priceLinesRef.current.push(tp2Line);
  }, [tradeSetup, showLevels, pair]);

  const handleClearDrawings = () => {
    soundAlert.playCopyTick();
    if (candleSeriesRef.current) {
      userDrawingsRef.current.forEach((line) => {
        try {
          candleSeriesRef.current?.removePriceLine(line);
        } catch (e) {}
      });
      userDrawingsRef.current = [];
    }
    setActiveTool('crosshair');
    if (onShowToast) onShowToast('Seluruh gambar dan garis manual dibersihkan');
  };

  const timeframes: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d'];
  const pairs: SupportedPair[] = [
    'XAU/USD',
    'EUR/USD',
    'GBP/USD',
    'USD/JPY',
    'AUD/USD',
    'BTC/USD',
  ];

  const firstCandle = candles[0];
  const lastCandle = candles[candles.length - 1];
  const priceChange = lastCandle && firstCandle ? lastCandle.close - firstCandle.open : 0;
  const priceChangePercent =
    firstCandle && firstCandle.open > 0 ? (priceChange / firstCandle.open) * 100 : 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="w-full bg-surface border border-white/[0.06] rounded-2xl overflow-hidden shadow-panel flex flex-col h-[440px] sm:h-[500px] lg:h-[calc(100vh-140px)] lg:min-h-[580px]">
      {/* Top Chart Header / Controls */}
      <div className="p-3 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2 bg-surface-subtle/50">
        {/* Pair Selector & Price ticker */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={pair}
              onChange={(e) => onPairChange(e.target.value as SupportedPair)}
              className="bg-surface border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-xs font-bold text-white font-mono focus:outline-none focus:border-trade-blue cursor-pointer"
            >
              {pairs.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-mono text-base font-bold text-white tracking-tight">
              {formatPairPrice(currentPrice, pair)}
            </span>
            <span
              className={`font-mono text-xs font-semibold flex items-center ${
                isPositive ? 'text-trade-buy' : 'text-trade-sell'
              }`}
            >
              {isPositive ? '+' : ''}
              {formatPairPrice(priceChange, pair)} ({isPositive ? '+' : ''}
              {priceChangePercent.toFixed(2)}%)
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-surface border border-white/[0.06] text-[11px] font-mono text-gray-400">
            <span>Spread:</span>
            <span className="text-gray-200 font-semibold">{spreadPips} p</span>
            <Tooltip term="Spread" explanation="Biaya selisih harga broker. Wajib rendah saat scalping." />
          </div>

          {/* Active Data Source Provider Badge */}
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium border transition-all ${
              dataSource === 'TwelveData'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : dataSource === 'YahooFinance'
                ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                : dataSource === 'FCSAPI'
                ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            }`}
            title={`Sumber Data Aktif: ${dataSource}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                dataSource === 'TwelveData'
                  ? 'bg-emerald-400 shadow-glow-buy'
                  : dataSource === 'YahooFinance'
                  ? 'bg-sky-400 shadow-glow-blue'
                  : dataSource === 'FCSAPI'
                  ? 'bg-purple-400'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="font-semibold">{dataSource}</span>
            <Tooltip
              term="Data Source"
              explanation="Sistem Multi-Provider Auto-Failover: Twelve Data (Prioritas 1) -> Yahoo Finance (Prioritas 2 Gratis) -> FCS API (Prioritas 3) -> Realistic M1 Simulator (Prioritas 4)."
            />
          </div>
        </div>

        {/* Timeframe & Action toggles */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Timeframe Selector Pills */}
          <div className="flex items-center bg-surface border border-white/[0.06] rounded-xl p-0.5">
            {timeframes.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => onTimeframeChange(tf)}
                className={`px-2 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                  timeframe === tf
                    ? 'bg-trade-blue text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Toggle Indicators */}
          <button
            type="button"
            onClick={() => setShowIndicators(!showIndicators)}
            className={`p-1.5 rounded-lg border text-xs transition-all ${
              showIndicators
                ? 'bg-trade-blue/15 text-trade-blue border-trade-blue/40'
                : 'bg-surface text-gray-400 border-white/[0.06] hover:text-gray-200'
            }`}
            title="Tampilkan / Sembunyikan EMA 20 & 50"
          >
            <BarChart2 className="w-3.5 h-3.5" />
          </button>

          {/* Toggle AI Levels */}
          {tradeSetup && (
            <button
              type="button"
              onClick={() => setShowLevels(!showLevels)}
              className={`p-1.5 rounded-lg border text-xs transition-all ${
                showLevels
                  ? 'bg-trade-buy/15 text-trade-buy border-trade-buy/40'
                  : 'bg-surface text-gray-400 border-white/[0.06] hover:text-gray-200'
              }`}
              title="Tampilkan / Sembunyikan Garis Entry, SL, TP"
            >
              {showLevels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-surface border border-white/[0.06] text-gray-400 hover:text-white hover:border-white/20 transition-all"
            title="Refresh Data Pasar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-trade-blue' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Chart Body: Left Drawing Toolbar + Canvas Area */}
      <div className="relative w-full flex-1 flex flex-row min-h-0 overflow-hidden">
        {/* LEFT DRAWING TOOLBAR (Vertikal Ramping di Sisi Kiri) */}
        <div className="w-10 sm:w-11 bg-surface-subtle/90 border-r border-white/[0.06] flex flex-col items-center py-2 gap-1.5 z-20 shrink-0">
          {/* 1. Crosshair */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('crosshair');
              soundAlert.playCopyTick();
            }}
            className={`p-2 rounded-lg transition-all ${
              activeTool === 'crosshair'
                ? 'bg-trade-blue text-white shadow-glow-blue'
                : 'text-gray-400 hover:text-gray-200 hover:bg-surface'
            }`}
            title="Kursor Crosshair"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          {/* 2. Trendline */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('trendline');
              soundAlert.playCopyTick();
              if (onShowToast) onShowToast('Mode Garis Tren aktif. Ketuk pada chart untuk menarik trajectory.');
            }}
            className={`p-2 rounded-lg transition-all ${
              activeTool === 'trendline'
                ? 'bg-trade-blue text-white shadow-glow-blue'
                : 'text-gray-400 hover:text-gray-200 hover:bg-surface'
            }`}
            title="Garis Tren (Trendline)"
          >
            <TrendingUp className="w-4 h-4" />
          </button>

          {/* 3. Horizontal Line */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('horizontal');
              soundAlert.playCopyTick();
              if (onShowToast) onShowToast('Mode Garis Horizontal aktif. Ketuk level harga pada grafik untuk memasang garis.');
            }}
            className={`p-2 rounded-lg transition-all ${
              activeTool === 'horizontal'
                ? 'bg-trade-blue text-white shadow-glow-blue'
                : 'text-gray-400 hover:text-gray-200 hover:bg-surface'
            }`}
            title="Garis Horizontal Support/Resistance"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* 4. Fibonacci Retracement */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('fibonacci');
              soundAlert.playCopyTick();
              if (onShowToast) onShowToast('Mode Fibonacci aktif. Ketuk pada chart untuk proyeksi level.');
            }}
            className={`p-2 rounded-lg transition-all ${
              activeTool === 'fibonacci'
                ? 'bg-trade-blue text-white shadow-glow-blue'
                : 'text-gray-400 hover:text-gray-200 hover:bg-surface'
            }`}
            title="Fibonacci Retracement (61.8% / 50%)"
          >
            <AlignJustify className="w-4 h-4" />
          </button>

          {/* 5. Rectangle Zone */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('rectangle');
              soundAlert.playCopyTick();
              if (onShowToast) onShowToast('Mode Kotak Zona aktif. Ketuk area chart untuk menandai Supply/Demand.');
            }}
            className={`p-2 rounded-lg transition-all ${
              activeTool === 'rectangle'
                ? 'bg-trade-blue text-white shadow-glow-blue'
                : 'text-gray-400 hover:text-gray-200 hover:bg-surface'
            }`}
            title="Zona Kotak Supply / Demand"
          >
            <Square className="w-4 h-4" />
          </button>

          {/* 6. Measure Pips */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('measure');
              soundAlert.playCopyTick();
              if (onShowToast) onShowToast(`Pengukur Pips: 1 pip pada ${pair} = ${pairConfig.pipSize}`);
            }}
            className={`p-2 rounded-lg transition-all ${
              activeTool === 'measure'
                ? 'bg-trade-blue text-white shadow-glow-blue'
                : 'text-gray-400 hover:text-gray-200 hover:bg-surface'
            }`}
            title="Pengukur Jarak Pips (Measure)"
          >
            <Ruler className="w-4 h-4" />
          </button>

          <div className="w-6 h-px bg-border my-1" />

          {/* 7. Clear Drawings */}
          <button
            type="button"
            onClick={handleClearDrawings}
            className="p-2 rounded-lg text-gray-500 hover:text-trade-sell hover:bg-surface transition-all"
            title="Hapus Semua Garis & Coretan Manual"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Chart Canvas Container */}
        <div className="relative flex-1 h-full overflow-hidden">
          <div ref={chartContainerRef} className="w-full h-full" />

          {/* FLOATING REAL-TIME OHLC & EMA LEGEND (Transparan di Pojok Kiri Atas) */}
          <div className="absolute top-2 left-3 z-10 pointer-events-none flex flex-wrap items-center gap-x-3 gap-y-1 bg-background/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border/80 shadow-md text-[11px] font-mono leading-none">
            {legendData ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 font-bold">O</span>
                  <span className={legendData.isUp ? 'text-trade-buy' : 'text-trade-sell'}>
                    {formatPairPrice(legendData.o, pair)}
                  </span>
                  <span className="text-gray-400 font-bold">H</span>
                  <span className={legendData.isUp ? 'text-trade-buy' : 'text-trade-sell'}>
                    {formatPairPrice(legendData.h, pair)}
                  </span>
                  <span className="text-gray-400 font-bold">L</span>
                  <span className={legendData.isUp ? 'text-trade-buy' : 'text-trade-sell'}>
                    {formatPairPrice(legendData.l, pair)}
                  </span>
                  <span className="text-gray-400 font-bold">C</span>
                  <span className={`font-bold ${legendData.isUp ? 'text-trade-buy' : 'text-trade-sell'}`}>
                    {formatPairPrice(legendData.c, pair)}
                  </span>
                </div>

                <div className="hidden sm:flex items-center gap-2.5 border-l border-border/80 pl-2.5">
                  {legendData.ema20 !== undefined && (
                    <span className="text-trade-blue font-semibold">
                      EMA20: {formatPairPrice(legendData.ema20, pair)}
                    </span>
                  )}
                  {legendData.ema50 !== undefined && (
                    <span className="text-trade-purple font-semibold">
                      EMA50: {formatPairPrice(legendData.ema50, pair)}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <span className="text-gray-400">Memuat candlestick...</span>
            )}
          </div>

          {/* Active Drawing Tool Helper Indicator */}
          {activeTool !== 'crosshair' && (
            <div className="absolute bottom-3 left-3 z-10 bg-surface/90 border border-trade-blue/40 px-2.5 py-1 rounded-lg text-[10px] font-mono text-trade-blue flex items-center gap-1.5 shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-trade-blue animate-ping" />
              <span>Mode: {activeTool.toUpperCase()} (Ketuk chart untuk menggambar)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
