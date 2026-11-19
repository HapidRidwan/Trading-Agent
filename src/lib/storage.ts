// Client-side LocalStorage Persistence, Journal Store & CSV Export/Import
import { AccountSettings, JournalSummary, JournalTrade } from './types';

const STORAGE_KEYS = {
  JOURNAL_TRADES: 'trading_agent_journal_trades_v1',
  ACCOUNT_SETTINGS: 'trading_agent_account_settings_v1',
  AI_MODEL_CONFIG: 'trading_agent_ai_model_config_v1',
  PIN_UNLOCKED: 'trading_agent_pin_unlocked_v1',
  RADAR_ACTIVE: 'trading_agent_radar_active_v1',
};

export const DEFAULT_ACCOUNT_SETTINGS: AccountSettings = {
  balance: 1000,
  accountType: 'standard',
  leverage: 1000, // 1:1000 default
  riskPercent: 1.0, // 1% per trade
  dailyDrawdownLimitPercent: 3.0, // 3% max daily loss
  maxConsecutiveSl: 2, // max 2 consecutive stop losses
};

export interface AIModelConfig {
  selectedPreset: string;
  customModelId: string;
}

export const DEFAULT_AI_MODEL_CONFIG: AIModelConfig = {
  selectedPreset: 'gemini-2.5-flash',
  customModelId: '',
};

// --- Journal Storage ---

export function getStoredJournalTrades(): JournalTrade[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.JOURNAL_TRADES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read journal from localStorage:', e);
    return [];
  }
}

export function saveJournalTrades(trades: JournalTrade[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.JOURNAL_TRADES, JSON.stringify(trades));
  } catch (e) {
    console.error('Failed to save journal to localStorage:', e);
  }
}

export function addJournalTrade(trade: Omit<JournalTrade, 'id' | 'createdAt'>): JournalTrade {
  const trades = getStoredJournalTrades();
  const newTrade: JournalTrade = {
    ...trade,
    id: 'tr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    createdAt: new Date().toISOString(),
  };

  trades.unshift(newTrade);
  saveJournalTrades(trades);

  // Update account balance
  const settings = getStoredAccountSettings();
  settings.balance = Number((settings.balance + newTrade.pnl).toFixed(2));
  saveAccountSettings(settings);

  return newTrade;
}

export function deleteJournalTrade(id: string): void {
  const trades = getStoredJournalTrades();
  const tradeToDelete = trades.find((t) => t.id === id);
  const filtered = trades.filter((t) => t.id !== id);
  saveJournalTrades(filtered);

  // Rollback balance if deleting
  if (tradeToDelete) {
    const settings = getStoredAccountSettings();
    settings.balance = Number((settings.balance - tradeToDelete.pnl).toFixed(2));
    saveAccountSettings(settings);
  }
}

// Compute Journal Summary & Daily Drawdown Guard status
export function computeJournalSummary(
  trades: JournalTrade[],
  settings: AccountSettings
): JournalSummary {
  const totalTrades = trades.length;
  let totalPnl = 0;
  let winCount = 0;
  let lossCount = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let bestTrade = 0;
  let worstTrade = 0;

  // Today trades evaluation (using local YYYY-MM-DD)
  const todayStr = new Date().toISOString().slice(0, 10);
  let todayLossAmount = 0;
  let todayConsecutiveLosses = 0;
  let currentStreakIsLoss = true;

  // Trades are sorted newest first
  for (let i = 0; i < trades.length; i++) {
    const t = trades[i];
    totalPnl += t.pnl;

    if (t.pnl > 0) {
      winCount++;
      grossProfit += t.pnl;
      if (t.pnl > bestTrade) bestTrade = t.pnl;
    } else if (t.pnl < 0) {
      lossCount++;
      grossLoss += Math.abs(t.pnl);
      if (t.pnl < worstTrade) worstTrade = t.pnl;
    }

    if (t.date === todayStr) {
      if (t.pnl < 0) {
        todayLossAmount += Math.abs(t.pnl);
        if (currentStreakIsLoss) {
          todayConsecutiveLosses++;
        }
      } else {
        currentStreakIsLoss = false;
      }
    }
  }

  const startingBalance = Number((settings.balance - totalPnl).toFixed(2));
  const currentBalance = settings.balance;
  const pnlPercent =
    startingBalance > 0 ? Number(((totalPnl / startingBalance) * 100).toFixed(2)) : 0;
  const winRate = totalTrades > 0 ? Number(((winCount / totalTrades) * 100).toFixed(1)) : 0;
  const profitFactor =
    grossLoss > 0
      ? Number((grossProfit / grossLoss).toFixed(2))
      : grossProfit > 0
      ? 99.9
      : 0;

  // Rem Darurat Harian (Daily Drawdown Guard)
  const dailyLossLimitDollars = (settings.balance * settings.dailyDrawdownLimitPercent) / 100;
  let isDrawdownLocked = false;
  let drawdownLockReason = '';

  if (todayLossAmount >= dailyLossLimitDollars && dailyLossLimitDollars > 0) {
    isDrawdownLocked = true;
    drawdownLockReason = `Batas rugi harian (${settings.dailyDrawdownLimitPercent}% / $${dailyLossLimitDollars.toFixed(
      2
    )}) telah tercapai. Total loss hari ini: -$${todayLossAmount.toFixed(2)}.`;
  } else if (todayConsecutiveLosses >= settings.maxConsecutiveSl) {
    isDrawdownLocked = true;
    drawdownLockReason = `Batas ${settings.maxConsecutiveSl}x Stop Loss beruntun hari ini tercapai. Waktu untuk istirahat dan evaluasi.`;
  }

  return {
    startingBalance,
    currentBalance,
    totalPnl: Number(totalPnl.toFixed(2)),
    pnlPercent,
    totalTrades,
    winCount,
    lossCount,
    winRate,
    profitFactor,
    bestTrade: Number(bestTrade.toFixed(2)),
    worstTrade: Number(worstTrade.toFixed(2)),
    todayLossAmount: Number(todayLossAmount.toFixed(2)),
    todayConsecutiveLosses,
    isDrawdownLocked,
    drawdownLockReason,
  };
}

// Export Trades to CSV
export function exportTradesToCSV(trades: JournalTrade[]): void {
  if (trades.length === 0) return;
  const headers = ['ID', 'Date', 'Time', 'Pair', 'Timeframe', 'Direction', 'Lot', 'Entry Price', 'Exit Price', 'PnL ($)', 'Pips', 'Status', 'Notes'];
  const rows = trades.map((t) => [
    t.id,
    t.date,
    t.time,
    t.pair,
    t.timeframe,
    t.direction,
    t.lot,
    t.entryPrice,
    t.exitPrice || '',
    t.pnl,
    t.pips || '',
    t.status,
    `"${(t.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `trading_journal_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export Trades to JSON
export function exportTradesToJSON(trades: JournalTrade[], settings: AccountSettings): void {
  const data = {
    exportedAt: new Date().toISOString(),
    accountSettings: settings,
    trades,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `trading_journal_backup_${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

// --- Account Settings Storage ---

export function getStoredAccountSettings(): AccountSettings {
  if (typeof window === 'undefined') return DEFAULT_ACCOUNT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACCOUNT_SETTINGS);
    if (!raw) return DEFAULT_ACCOUNT_SETTINGS;
    return { ...DEFAULT_ACCOUNT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_ACCOUNT_SETTINGS;
  }
}

export function saveAccountSettings(settings: AccountSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.ACCOUNT_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save account settings:', e);
  }
}

// --- AI Model Config Storage ---

export function getStoredAIModelConfig(): AIModelConfig {
  if (typeof window === 'undefined') return DEFAULT_AI_MODEL_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AI_MODEL_CONFIG);
    if (!raw) return DEFAULT_AI_MODEL_CONFIG;
    return { ...DEFAULT_AI_MODEL_CONFIG, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_AI_MODEL_CONFIG;
  }
}

export function saveAIModelConfig(config: AIModelConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.AI_MODEL_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save model config:', e);
  }
}

// --- PIN State ---

export function isPinUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(STORAGE_KEYS.PIN_UNLOCKED) === 'true';
}

export function setPinUnlocked(unlocked: boolean): void {
  if (typeof window === 'undefined') return;
  if (unlocked) {
    sessionStorage.setItem(STORAGE_KEYS.PIN_UNLOCKED, 'true');
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.PIN_UNLOCKED);
  }
}
