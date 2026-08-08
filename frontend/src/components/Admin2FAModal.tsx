'use client';

import React, { useState } from 'react';

interface Admin2FAModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (code: string) => Promise<void>;
  title?: string;
  subtitle?: string;
}

export default function Admin2FAModal({
  isOpen,
  onClose,
  onVerify,
  title = "Two-Factor Authentication Required",
  subtitle = "Enter the 6-digit verification code from your authenticator app or a single-use backup code."
}: Admin2FAModalProps) {
  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onVerify(code.trim());
      setCode('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid authentication code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 text-zinc-100 font-sans">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 font-outfit">{title}</h2>
              <p className="text-xs text-zinc-400">{subtitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/80 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center space-x-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 uppercase tracking-wider font-outfit">
              {useBackupCode ? "8-Character Backup Code" : "6-Digit Authenticator Code"}
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={useBackupCode ? "e.g. a8f9-4b2c" : "000000"}
              maxLength={useBackupCode ? 12 : 8}
              autoFocus
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 text-center text-lg font-mono tracking-widest focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                setUseBackupCode(!useBackupCode);
                setCode('');
                setErrorMsg('');
              }}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {useBackupCode ? "Use Authenticator Code" : "Use backup code instead"}
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !code.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Verify &amp; Continue</span>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
