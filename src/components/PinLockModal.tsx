'use client';

import React, { useState } from 'react';
import { Lock, Shield, CheckCircle2, Delete } from 'lucide-react';
import { soundAlert } from '@/lib/soundAlert';

interface PinLockModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

export default function PinLockModal({ isOpen, onSuccess }: PinLockModalProps) {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      soundAlert.playCopyTick();
      const newPin = pin + digit;
      setPin(newPin);
      setErrorMsg('');

      if (newPin.length === 6) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    soundAlert.playCopyTick();
    setPin(pin.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg('');
  };

  const verifyPin = async (inputPin: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: inputPin }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        soundAlert.playChime();
        onSuccess();
      } else {
        soundAlert.playWarningTone();
        setErrorMsg(data.message || 'PIN salah. Silakan coba lagi.');
        setPin('');
      }
    } catch (err) {
      setErrorMsg('Gagal memverifikasi PIN. Periksa koneksi.');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/95 backdrop-blur-xl animate-in fade-in">
      <div className="w-full max-w-sm bg-surface border border-border-strong rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
        {/* Security Shield Icon */}
        <div className="w-14 h-14 rounded-2xl bg-trade-blue/15 border border-trade-blue/30 flex items-center justify-center mb-3 shadow-glow-blue">
          <Shield className="w-7 h-7 text-trade-blue" />
        </div>

        <h2 className="text-lg font-bold text-white tracking-tight">Trading Agent Security</h2>
        <p className="text-xs text-gray-400 mt-1 max-w-[260px]">
          Masukkan PIN 6 Digit untuk membuka akses aplikasi dan melindungi kuota API pribadi Anda.
        </p>

        {/* PIN Dots Display */}
        <div className="flex items-center justify-center gap-3 my-6">
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const isFilled = idx < pin.length;
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-trade-blue scale-110 shadow-glow-blue'
                    : 'bg-surface-subtle border border-border-strong'
                }`}
              />
            );
          })}
        </div>

        {/* Error or Info message */}
        <div className="min-h-[22px] mb-3">
          {errorMsg ? (
            <p className="text-xs text-trade-sell font-medium animate-shake">{errorMsg}</p>
          ) : (
            <p className="text-[11px] text-gray-400 font-mono">
              Masukkan 6 digit PIN akses Anda
            </p>
          )}
        </div>

        {/* Virtual Numpad */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[280px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isLoading}
              onClick={() => handleDigit(digit)}
              className="h-12 rounded-xl bg-surface-subtle border border-border hover:bg-surface-hover hover:border-border-strong active:scale-95 text-lg font-mono font-semibold text-white transition-all flex items-center justify-center shadow-sm"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            disabled={isLoading || pin.length === 0}
            onClick={handleClear}
            className="h-12 rounded-xl bg-surface-subtle border border-border hover:bg-surface-hover text-xs font-medium text-gray-400 active:scale-95 transition-all flex items-center justify-center"
          >
            Reset
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleDigit('0')}
            className="h-12 rounded-xl bg-surface-subtle border border-border hover:bg-surface-hover hover:border-border-strong active:scale-95 text-lg font-mono font-semibold text-white transition-all flex items-center justify-center shadow-sm"
          >
            0
          </button>
          <button
            type="button"
            disabled={isLoading || pin.length === 0}
            onClick={handleDelete}
            className="h-12 rounded-xl bg-surface-subtle border border-border hover:bg-surface-hover text-gray-400 hover:text-white active:scale-95 transition-all flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 text-[11px] text-gray-400">
          Dikonfigurasi via variabel lingkungan <code className="text-gray-300">APP_ACCESS_PIN</code>
        </div>
      </div>
    </div>
  );
}
