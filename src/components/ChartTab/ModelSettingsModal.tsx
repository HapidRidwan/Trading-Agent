'use client';

import React, { useState, useEffect } from 'react';
import { Cpu, X, Check, Sparkles, Shield, Info } from 'lucide-react';
import { AIModelConfig, getStoredAIModelConfig, saveAIModelConfig } from '@/lib/storage';
import { soundAlert } from '@/lib/soundAlert';

interface ModelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: (config: AIModelConfig) => void;
}

export default function ModelSettingsModal({
  isOpen,
  onClose,
  onConfigSaved,
}: ModelSettingsModalProps) {
  const [preset, setPreset] = useState('gemini-2.5-flash');
  const [customModelId, setCustomModelId] = useState('');

  useEffect(() => {
    if (isOpen) {
      const cfg = getStoredAIModelConfig();
      setPreset(cfg.selectedPreset || 'gemini-2.5-flash');
      setCustomModelId(cfg.customModelId || '');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const presets = [
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash (Rekomendasi Cepat & Hemat)',
      description: 'Latensi ultra rendah, reasoning stabil dengan thinking budget 24576.',
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro (Penalaran Mendalam)',
      description: 'Kemampuan analisis konteks teknikal kompleks untuk konfirmasi multi-timeframe.',
    },
    {
      id: 'gemini-3-flash-preview',
      name: 'Gemini 3 Flash Preview (Generasi Terbaru)',
      description: 'Arsitektur penalaran frontier Google AI dengan thinking level High.',
    },
  ];

  const handleSave = () => {
    soundAlert.playCopyTick();
    const newConfig: AIModelConfig = {
      selectedPreset: preset,
      customModelId: customModelId.trim(),
    };
    saveAIModelConfig(newConfig);
    onConfigSaved(newConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-surface border border-border-strong rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-trade-blue/15 border border-trade-blue/30 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-trade-blue" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                AI Model Configuration
              </h3>
              <p className="text-xs text-gray-400">Pilih preset atau ketik Custom Model ID</p>
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

        {/* Quick Presets */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-gray-300">Preset Model Resmi:</label>
          <div className="grid grid-cols-1 gap-2">
            {presets.map((p) => {
              const isSelected = preset === p.id && !customModelId.trim();
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setPreset(p.id);
                    setCustomModelId('');
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-trade-blue/10 border-trade-blue text-white shadow-sm'
                      : 'bg-surface-subtle/60 border-border hover:border-border-strong text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-white">{p.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-trade-blue" />}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">{p.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Model ID Free-Text */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-trade-gold" />
              Custom Model ID (Google AI Studio)
            </label>
            <span className="text-[10px] text-gray-500 font-mono">Opsional</span>
          </div>
          <input
            type="text"
            value={customModelId}
            onChange={(e) => setCustomModelId(e.target.value)}
            placeholder="Contoh: gemini-3.8-flash atau gemini-exp-1206"
            className="w-full bg-surface-subtle border border-border-strong rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-trade-blue"
          />
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Jika diisi, model ini akan diprioritaskan. Jika mengembalikan error 404 (tidak ditemukan), backend otomatis melakukan <strong>Auto-Fallback</strong> ke model default.
          </p>
        </div>

        {/* High Reasoning & Timeout Info */}
        <div className="p-3 rounded-xl bg-surface-subtle border border-border text-[11px] text-gray-300 flex items-start gap-2 leading-relaxed">
          <Shield className="w-4 h-4 text-trade-blue shrink-0 mt-0.5" />
          <span>
            Setiap permintaan AI dikonfigurasi dengan <strong>High Reasoning</strong> (Thinking Level: High / Budget 24576) dengan batas timeout 60 detik untuk analisis teknikal multi-dimensi.
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-surface-subtle"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-trade-blue text-white hover:bg-blue-600 transition-all shadow-glow-blue"
          >
            Simpan Konfigurasi
          </button>
        </div>
      </div>
    </div>
  );
}
