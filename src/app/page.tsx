'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/Header';
import BottomNav, { ActiveTab } from '@/components/BottomNav';
import PinLockModal from '@/components/PinLockModal';
import ToastNotification from '@/components/Common/ToastNotification';
import TradingChart from '@/components/ChartTab/TradingChart';
import AISignalCard from '@/components/ChartTab/AISignalCard';
import SixGateChecklist from '@/components/ChartTab/SixGateChecklist';
import ModelSettingsModal from '@/components/ChartTab/ModelSettingsModal';
import SessionStatus from '@/components/NewsTab/SessionStatus';
import NewsCalendar from '@/components/NewsTab/NewsCalendar';
import LotCalculator from '@/components/CalculatorTab/LotCalculator';
import EmergencyDrawdownGuard from '@/components/CalculatorTab/EmergencyDrawdownGuard';
import JournalDashboard from '@/components/JournalTab/JournalDashboard';
import EquityCurve from '@/components/JournalTab/EquityCurve';
import TradeLogList from '@/components/JournalTab/TradeLogList';
import AddTradeModal from '@/components/JournalTab/AddTradeModal';

import {
  AIAnalysisResult,
  Candle,
  EconomicNewsEvent,
  JournalSummary,
  JournalTrade,
  SupportedPair,
  Timeframe,
  AccountSettings,
} from '@/lib/types';
import {
  addJournalTrade,
  computeJournalSummary,
  deleteJournalTrade,
  getStoredAccountSettings,
  getStoredAIModelConfig,
  getStoredJournalTrades,
  isPinUnlocked,
  saveAccountSettings,
  saveJournalTrades,
  setPinUnlocked,
  AIModelConfig,
} from '@/lib/storage';
import { soundAlert } from '@/lib/soundAlert';
import { Sparkles, X, ChevronDown, CheckCircle2 } from 'lucide-react';

export default function Home() {
  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<ActiveTab>('chart');
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [isModelSettingsOpen, setIsModelSettingsOpen] = useState<boolean>(false);
  const [isAddTradeModalOpen, setIsAddTradeModalOpen] = useState<boolean>(false);
  const [isMobileTicketOpen, setIsMobileTicketOpen] = useState<boolean>(false);

  // Quick Top Toast Notification
  const [quickToast, setQuickToast] = useState<string | null>(null);

  const showQuickToast = (msg: string) => {
    setQuickToast(msg);
    setTimeout(() => {
      setQuickToast((prev) => (prev === msg ? null : prev));
    }, 2200);
  };

  // Market & Pair State
  const [pair, setPair] = useState<SupportedPair>('XAU/USD');
  const [timeframe, setTimeframe] = useState<Timeframe>('1m');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(2650.0);
  const [spreadPips, setSpreadPips] = useState<number>(2.0);
  const [marketPhase, setMarketPhase] = useState<string>('TRENDING_BULL');
  const [dataSource, setDataSource] = useState<string>('Simulator');
  const [isLoadingMarket, setIsLoadingMarket] = useState<boolean>(false);

  // Economic News & Sessions State
  const [newsEvents, setNewsEvents] = useState<EconomicNewsEvent[]>([]);
  const [hasNewsSpikeRisk, setHasNewsSpikeRisk] = useState<boolean>(false);
  const [activeSpikeRiskEvents, setActiveSpikeRiskEvents] = useState<EconomicNewsEvent[]>([]);
  const [isRollover, setIsRollover] = useState<boolean>(false);
  const [wibTime, setWibTime] = useState<string>('');
  const [sessions, setSessions] = useState({
    sydney: false,
    tokyo: false,
    london: false,
    newYork: false,
  });

  // AI & Analysis State
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [modelConfig, setModelConfig] = useState<AIModelConfig>({
    selectedPreset: 'gemini-2.5-flash',
    customModelId: '',
  });

  // Radar Scanner State
  const [radarActive, setRadarActive] = useState<boolean>(false);
  const [radarNotification, setRadarNotification] = useState<any | null>(null);
  const radarScanTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Account Settings & Journal State
  const [accountSettings, setAccountSettings] = useState<AccountSettings>(getStoredAccountSettings());
  const [journalTrades, setJournalTrades] = useState<JournalTrade[]>([]);
  const [journalSummary, setJournalSummary] = useState<JournalSummary>(() =>
    computeJournalSummary([], getStoredAccountSettings())
  );

  // Register PWA Service Worker & Load Initial Storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check PIN session
      if (isPinUnlocked()) {
        setIsLocked(false);
      }

      // Load models and account settings
      const cfg = getStoredAIModelConfig();
      setModelConfig(cfg);

      const st = getStoredAccountSettings();
      setAccountSettings(st);

      const tr = getStoredJournalTrades();
      setJournalTrades(tr);
      setJournalSummary(computeJournalSummary(tr, st));

      // Register SW
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.warn('SW registration warning:', err);
        });
      }

      // Check Notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Fetch Market Data with optional AbortSignal
  const fetchMarketData = useCallback(
    async (p: SupportedPair = pair, tf: Timeframe = timeframe, signal?: AbortSignal) => {
      setIsLoadingMarket(true);
      try {
        const res = await fetch(`/api/market?pair=${encodeURIComponent(p)}&timeframe=${tf}&count=120`, {
          signal,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.candles && Array.isArray(data.candles)) {
            setCandles(data.candles);
            setCurrentPrice(data.currentPrice);
            setSpreadPips(data.spreadPips);
            setMarketPhase(data.marketPhase);
            if (data.source) {
              setDataSource(data.source);
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Fetch market error:', err);
        }
      } finally {
        setIsLoadingMarket(false);
      }
    },
    [pair, timeframe]
  );

  // Fetch Economic News Data
  const fetchNewsData = useCallback(async () => {
    try {
      const res = await fetch('/api/news');
      if (res.ok) {
        const data = await res.json();
        setNewsEvents(data.events || []);
        setHasNewsSpikeRisk(data.hasActiveHighImpactRisk);
        setActiveSpikeRiskEvents(data.activeSpikeRiskEvents || []);
        setIsRollover(data.isRolloverHour);
        setWibTime(data.wibTime);
        if (data.sessions) {
          setSessions(data.sessions);
        }
      }
    } catch (err) {
      console.error('Fetch news error:', err);
    }
  }, []);

  // Initial fetch and auto-refresh intervals with 10-second polling & clean AbortController
  useEffect(() => {
    const controller = new AbortController();
    fetchMarketData(pair, timeframe, controller.signal);
    fetchNewsData();

    // Refresh active candle tick every 10 seconds (preserves API quotas)
    const marketInterval = setInterval(() => {
      fetchMarketData(pair, timeframe, controller.signal);
    }, 10000);

    // Refresh news every 30 seconds
    const newsInterval = setInterval(() => {
      fetchNewsData();
    }, 30000);

    return () => {
      controller.abort();
      clearInterval(marketInterval);
      clearInterval(newsInterval);
    };
  }, [fetchMarketData, fetchNewsData, pair, timeframe]);

  // Execute AI Analysis
  const runAIAnalysis = async (autoTriggered = false) => {
    if (journalSummary.isDrawdownLocked) {
      soundAlert.playWarningTone();
      return;
    }

    if (candles.length < 20) return;

    setIsAnalyzing(true);
    try {
      const payload = {
        pair,
        m1Candles: candles,
        newsEvents,
        spreadPips,
        balance: accountSettings.balance,
        riskPercent: accountSettings.riskPercent,
        modelConfig,
      };

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result: AIAnalysisResult = await res.json();
        setAnalysis(result);

        // Open mobile ticket sheet if signal found on mobile
        if (result.tradeSetup) {
          setIsMobileTicketOpen(true);
        }

        // If auto-triggered by Radar and passes all 6 gates with high score >= 80%
        if (autoTriggered && result.tradeSetup && result.confidenceScore >= 80) {
          soundAlert.playChime();

          const toastData = {
            id: 'alert_' + Date.now(),
            pair,
            direction: result.tradeSetup.direction,
            headline: result.headline,
            score: result.confidenceScore,
            rrRatio: result.tradeSetup.rrRatio,
            setup: result.tradeSetup,
          };
          setRadarNotification(toastData);

          // Trigger Web Push Notification if allowed
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`Peluang Valid: ${result.tradeSetup.direction} ${pair} M1`, {
                body: `${result.headline} (R:R 1:${result.tradeSetup.rrRatio})`,
                icon: '/icons/icon-192.png',
              });
            } catch (notifErr) {
              console.warn('Web notification trigger warning:', notifErr);
            }
          }
        } else if (!autoTriggered) {
          if (result.verdict === 'BUY' || result.verdict === 'SELL') {
            soundAlert.playChime();
          } else {
            soundAlert.playCopyTick();
          }
        }
      }
    } catch (err) {
      console.error('Run analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Toggle Live Radar
  const handleToggleRadar = () => {
    if (journalSummary.isDrawdownLocked) return;

    soundAlert.playCopyTick();
    const nextState = !radarActive;
    setRadarActive(nextState);

    if (nextState) {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      runAIAnalysis(true);
    }
  };

  // Radar background scan interval (every 60s for M1 scalper)
  useEffect(() => {
    if (!radarActive || journalSummary.isDrawdownLocked) {
      if (radarScanTimerRef.current) {
        clearInterval(radarScanTimerRef.current);
        radarScanTimerRef.current = null;
      }
      return;
    }

    radarScanTimerRef.current = setInterval(() => {
      if (!hasNewsSpikeRisk && !isRollover) {
        runAIAnalysis(true);
      }
    }, 60000);

    return () => {
      if (radarScanTimerRef.current) {
        clearInterval(radarScanTimerRef.current);
      }
    };
  }, [radarActive, hasNewsSpikeRisk, isRollover, journalSummary.isDrawdownLocked]);

  // Log Trade into Journal from AI Signal Card
  const handleLogTradeFromSignal = (result: 'WIN' | 'LOSS') => {
    if (!analysis || !analysis.tradeSetup) return;
    const setup = analysis.tradeSetup;
    const now = new Date();

    const pnlAmount =
      result === 'WIN'
        ? setup.tp1Pips * (setup.suggestedLot * 10)
        : -(setup.slPips * (setup.suggestedLot * 10));

    addJournalTrade({
      date: now.toISOString().slice(0, 10),
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      pair,
      timeframe,
      direction: setup.direction,
      lot: setup.suggestedLot,
      entryPrice: setup.entry,
      exitPrice: result === 'WIN' ? setup.tp1 : setup.stopLoss,
      pnl: Number(pnlAmount.toFixed(2)),
      pips: result === 'WIN' ? setup.tp1Pips : -setup.slPips,
      status: result,
      source: 'AI_SIGNAL',
      notes: `Sinyal AI ${setup.direction} M1 (${result === 'WIN' ? 'Hit TP 1' : 'Hit SL'}). Rasio R:R 1:${setup.rrRatio}.`,
    });

    const updatedTrades = getStoredJournalTrades();
    const updatedSettings = getStoredAccountSettings();
    setJournalTrades(updatedTrades);
    setAccountSettings(updatedSettings);
    setJournalSummary(computeJournalSummary(updatedTrades, updatedSettings));

    soundAlert.playChime();
    showQuickToast(`Trade ${result} berhasil dicatat ke Jurnal!`);
    setActiveTab('journal');
  };

  // Add Manual Trade
  const handleAddManualTrade = (tradeData: Omit<JournalTrade, 'id' | 'createdAt'>) => {
    addJournalTrade(tradeData);
    const updatedTrades = getStoredJournalTrades();
    const updatedSettings = getStoredAccountSettings();
    setJournalTrades(updatedTrades);
    setAccountSettings(updatedSettings);
    setJournalSummary(computeJournalSummary(updatedTrades, updatedSettings));
    showQuickToast('Catatan transaksi berhasil disimpan ke Jurnal!');
  };

  // Delete Trade
  const handleDeleteTrade = (id: string) => {
    deleteJournalTrade(id);
    const updatedTrades = getStoredJournalTrades();
    const updatedSettings = getStoredAccountSettings();
    setJournalTrades(updatedTrades);
    setAccountSettings(updatedSettings);
    setJournalSummary(computeJournalSummary(updatedTrades, updatedSettings));
    showQuickToast('Catatan transaksi dihapus & saldo disesuaikan.');
  };

  // Import Trades
  const handleImportTrades = (imported: JournalTrade[]) => {
    saveJournalTrades(imported);
    const updatedSettings = getStoredAccountSettings();
    setJournalTrades(imported);
    setJournalSummary(computeJournalSummary(imported, updatedSettings));
    showQuickToast('Data Jurnal berhasil diimpor!');
  };

  // Update Settings from Calculator
  const handleUpdateSettings = (newSettings: AccountSettings) => {
    saveAccountSettings(newSettings);
    setAccountSettings(newSettings);
    setJournalSummary(computeJournalSummary(journalTrades, newSettings));
  };

  const activeModelDisplay =
    modelConfig.customModelId && modelConfig.customModelId.trim() !== ''
      ? modelConfig.customModelId.trim()
      : modelConfig.selectedPreset;

  return (
    <div className="min-h-screen bg-background text-gray-100 flex flex-col font-sans pb-safe">
      {/* PIN Lock Screen Modal */}
      <PinLockModal
        isOpen={isLocked}
        onSuccess={() => {
          setIsLocked(false);
          setPinUnlocked(true);
        }}
      />

      {/* Floating Quick Toast Notification */}
      {quickToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="bg-surface/95 backdrop-blur-md border border-trade-buy/50 text-white px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-mono">
            <CheckCircle2 className="w-4 h-4 text-trade-buy shrink-0" />
            <span>{quickToast}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        marketPhase={marketPhase}
        hasActiveNewsSpike={hasNewsSpikeRisk}
        isRollover={isRollover}
        radarActive={radarActive}
        onToggleRadar={handleToggleRadar}
        onOpenModelSettings={() => setIsModelSettingsOpen(true)}
        onLockApp={() => {
          setPinUnlocked(false);
          setIsLocked(true);
        }}
        activeModelName={activeModelDisplay}
        isDrawdownLocked={journalSummary.isDrawdownLocked}
      />

      {/* Floating Radar Opportunity Toast Notification */}
      <ToastNotification
        notification={radarNotification}
        onClose={() => setRadarNotification(null)}
        onOpenSetup={() => {
          setActiveTab('chart');
          setRadarNotification(null);
        }}
      />

      {/* Model Configuration Modal */}
      <ModelSettingsModal
        isOpen={isModelSettingsOpen}
        onClose={() => setIsModelSettingsOpen(false)}
        onConfigSaved={(cfg) => setModelConfig(cfg)}
      />

      {/* Add Trade Manual Modal */}
      <AddTradeModal
        isOpen={isAddTradeModalOpen}
        onClose={() => setIsAddTradeModalOpen(false)}
        onAddTrade={handleAddManualTrade}
        defaultPair={pair}
        lastAiSetup={analysis?.tradeSetup || null}
      />

      {/* Main Tab Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-5 pb-28 sm:pb-32">
        {/* TAB 1: CHART & AI */}
        {activeTab === 'chart' && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            {/* DESKTOP SPLIT-SCREEN WORKSPACE (lg:grid-cols-12: 8 Kolom Kiri Chart + 4 Kolom Kanan Full-Height Co-Pilot Sidebar) */}
            <div className="hidden lg:grid lg:grid-cols-12 lg:gap-4 items-stretch">
              {/* 8 Kolom Kiri: Real-Time Candlestick Chart */}
              <div className="lg:col-span-8 flex flex-col">
                <TradingChart
                  pair={pair}
                  timeframe={timeframe}
                  candles={candles}
                  tradeSetup={analysis?.tradeSetup || null}
                  supplyDemandZones={analysis?.chartAnnotations?.supplyDemandZones || []}
                  spreadPips={spreadPips}
                  currentPrice={currentPrice}
                  dataSource={dataSource}
                  onPairChange={(newPair) => {
                    setPair(newPair);
                    fetchMarketData(newPair, timeframe);
                  }}
                  onTimeframeChange={(newTf) => {
                    setTimeframe(newTf);
                    fetchMarketData(pair, newTf);
                  }}
                  onRefresh={() => fetchMarketData(pair, timeframe)}
                  isLoading={isLoadingMarket}
                  onShowToast={showQuickToast}
                />
              </div>

              {/* 4 Kolom Kanan: Full-Height Co-Pilot Sidebar (AI Pro Analyst + MT4/MT5 Execution Ticket + Sesi & Volatilitas) */}
              <div className="lg:col-span-4 flex flex-col">
                <AISignalCard
                  pair={pair}
                  timeframe={timeframe}
                  analysis={analysis}
                  onAnalyze={() => runAIAnalysis(false)}
                  isAnalyzing={isAnalyzing}
                  onLogTradeToJournal={handleLogTradeFromSignal}
                  isDrawdownLocked={journalSummary.isDrawdownLocked}
                  onShowToast={showQuickToast}
                  sessions={sessions}
                  isRollover={isRollover}
                  wibTime={wibTime}
                  spreadPips={spreadPips}
                  marketPhase={marketPhase}
                />
              </div>
            </div>

            {/* 6-Gate Detailed Breakdown (Desktop: Di Bawah Workspace jika ingin diperiksa secara komprehensif) */}
            {analysis && (
              <div className="hidden lg:block mt-1">
                <SixGateChecklist gates={analysis.gates} />
              </div>
            )}

            {/* MOBILE LAYOUT (HP Screen: lg:hidden) */}
            <div className="flex flex-col gap-4 lg:hidden">
              <TradingChart
                pair={pair}
                timeframe={timeframe}
                candles={candles}
                tradeSetup={analysis?.tradeSetup || null}
                supplyDemandZones={analysis?.chartAnnotations?.supplyDemandZones || []}
                spreadPips={spreadPips}
                currentPrice={currentPrice}
                dataSource={dataSource}
                onPairChange={(newPair) => {
                  setPair(newPair);
                  fetchMarketData(newPair, timeframe);
                }}
                onTimeframeChange={(newTf) => {
                  setTimeframe(newTf);
                  fetchMarketData(pair, newTf);
                }}
                onRefresh={() => fetchMarketData(pair, timeframe)}
                isLoading={isLoadingMarket}
                onShowToast={showQuickToast}
              />

              {/* AI Signal Card */}
              <AISignalCard
                pair={pair}
                timeframe={timeframe}
                analysis={analysis}
                onAnalyze={() => runAIAnalysis(false)}
                isAnalyzing={isAnalyzing}
                onLogTradeToJournal={handleLogTradeFromSignal}
                isDrawdownLocked={journalSummary.isDrawdownLocked}
                onShowToast={showQuickToast}
                sessions={sessions}
                isRollover={isRollover}
                wibTime={wibTime}
                spreadPips={spreadPips}
                marketPhase={marketPhase}
              />

              {/* 6-Gate Checklist */}
              {analysis && <SixGateChecklist gates={analysis.gates} />}
            </div>

            {/* MOBILE FLOATING ACTION BAR (HP Screen: Tepat di Atas Bottom Dock) */}
            <div className="fixed bottom-20 left-4 right-4 z-30 lg:hidden">
              <button
                type="button"
                onClick={() => {
                  runAIAnalysis(false);
                  setIsMobileTicketOpen(true);
                }}
                disabled={isAnalyzing || journalSummary.isDrawdownLocked}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-trade-blue via-blue-600 to-indigo-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-glow-blue flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                <span>{isAnalyzing ? 'Menganalisis 6-Gate...' : '⚡ Analisa AI Sekarang & Tiket MT5'}</span>
              </button>
            </div>

            {/* MOBILE SLIDE-UP BOTTOM SHEET (Jika Sinyal Siap atau Drawer Dibuka) */}
            {isMobileTicketOpen && analysis?.tradeSetup && (
              <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in">
                <div className="bg-surface border-t border-white/[0.08] rounded-t-3xl p-5 shadow-2xl flex flex-col gap-3 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-5">
                  {/* Drawer Handle */}
                  <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-1" />
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      MT5 Quick Execution Sheet ({pair})
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsMobileTicketOpen(false)}
                      className="p-1 rounded-lg text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <AISignalCard
                    pair={pair}
                    timeframe={timeframe}
                    analysis={analysis}
                    onAnalyze={() => runAIAnalysis(false)}
                    isAnalyzing={isAnalyzing}
                    onLogTradeToJournal={(outcome) => {
                      handleLogTradeFromSignal(outcome);
                      setIsMobileTicketOpen(false);
                    }}
                    isDrawdownLocked={journalSummary.isDrawdownLocked}
                    onShowToast={showQuickToast}
                    sessions={sessions}
                    isRollover={isRollover}
                    wibTime={wibTime}
                    spreadPips={spreadPips}
                    marketPhase={marketPhase}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BERITA & SENTIMEN */}
        {activeTab === 'news' && (
          <div className="flex flex-col gap-5 animate-in fade-in duration-200">
            {/* Global Market Session Status */}
            <SessionStatus
              sessions={sessions}
              isRollover={isRollover}
              wibTime={wibTime}
            />

            {/* Daily Economic News Calendar with ACTIVE PAIR GUARD BANNER */}
            <NewsCalendar
              events={newsEvents}
              hasActiveNewsSpike={hasNewsSpikeRisk}
              activeSpikeRiskEvents={activeSpikeRiskEvents}
              activePair={pair}
            />
          </div>
        )}

        {/* TAB 3: KALKULATOR & LEVERAGE */}
        {activeTab === 'calculator' && (
          <div className="flex flex-col gap-5 animate-in fade-in duration-200">
            {/* Lot & Leverage Calculator */}
            <LotCalculator
              settings={accountSettings}
              onUpdateSettings={handleUpdateSettings}
              activePair={pair}
              aiSlPips={analysis?.tradeSetup?.slPips}
              onShowToast={showQuickToast}
            />

            {/* Daily Drawdown Rem Darurat Guard */}
            <EmergencyDrawdownGuard
              settings={accountSettings}
              summary={journalSummary}
              onUpdateSettings={handleUpdateSettings}
            />
          </div>
        )}

        {/* TAB 4: BUKU CATATAN (JOURNAL & EQUITY CURVE) */}
        {activeTab === 'journal' && (
          <div className="flex flex-col gap-5 animate-in fade-in duration-200">
            {/* Summary KPI Cards */}
            <JournalDashboard summary={journalSummary} />

            {/* Growth Equity Curve */}
            <EquityCurve
              trades={journalTrades}
              startingBalance={journalSummary.startingBalance}
            />

            {/* Historical Trade Logs */}
            <TradeLogList
              trades={journalTrades}
              settings={accountSettings}
              onDeleteTrade={handleDeleteTrade}
              onImportTrades={handleImportTrades}
              onOpenAddModal={() => setIsAddTradeModalOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Mobile-First Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          soundAlert.playCopyTick();
          setActiveTab(tab);
        }}
        newsSpikeCount={activeSpikeRiskEvents.length}
      />
    </div>
  );
}
