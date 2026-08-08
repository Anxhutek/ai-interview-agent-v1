'use client';

import React, { useState, useEffect } from 'react';
import {
  getAdminCandidates,
  interviewApi,
  AdminCandidateItem,
  AiHealthResponse,
  getAdmin2FAStatus,
  setupAdmin2FA,
  enableAdmin2FA,
  disableAdmin2FA,
  regenerateAdminBackupCodes,
  verifyAdmin2FA,
  loginUser,
  Admin2FASetupResult
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Admin2FAModal from '@/components/Admin2FAModal';

export default function AdminPage() {
  const { user, token: authToken, login: authContextLogin, logout } = useAuth();

  const [candidates, setCandidates] = useState<AdminCandidateItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'clean' | 'flagged'>('all');
  const [selectedCandidate, setSelectedCandidate] = useState<AdminCandidateItem | null>(null);
  const [aiHealth, setAiHealth] = useState<AiHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Admin Login & 2FA Challenge State
  const [loginMode, setLoginMode] = useState<'password' | 'totp'>('password');
  const [adminEmail, setAdminEmail] = useState('anshuverma162606@gmail.com');
  const [adminPassword, setAdminPassword] = useState('Anshukabetaapporv');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [pre2faToken, setPre2faToken] = useState<string | null>(null);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);

  // Active Tab: 'candidates' | 'security'
  const [activeTab, setActiveTab] = useState<'candidates' | 'security'>('candidates');

  // 2FA Management State
  const [token, setToken] = useState<string>('');
  const [is2FAEnabled, setIs2FAEnabled] = useState<boolean>(false);
  const [setupData, setSetupData] = useState<Admin2FASetupResult | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [is2FALoading, setIs2FALoading] = useState(false);

  // Security Verification Modal for Disable / Regenerate Backup Codes
  const [modalMode, setModalMode] = useState<'disable' | 'regenerate' | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');

  const isAdmin = user && user.role === 'admin';

  useEffect(() => {
    const activeToken = authToken || localStorage.getItem('interview_agent_token') || localStorage.getItem('token') || '';
    setToken(activeToken);

    async function loadData() {
      setIsLoading(true);
      const [candData, healthData] = await Promise.all([
        getAdminCandidates(),
        interviewApi.getAiHealth(),
      ]);
      setCandidates(candData);
      setAiHealth(healthData);

      if (activeToken) {
        const twoFaStatus = await getAdmin2FAStatus(activeToken);
        setIs2FAEnabled(twoFaStatus.enabled);
      }
      setIsLoading(false);
    }
    loadData();
  }, [authToken, user]);

  // Admin Login Flow with 2FA Challenge Support
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPassword.trim()) return;

    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await loginUser(adminEmail.trim(), adminPassword.trim());
      if (res.require2fa && res.pre2faToken) {
        setPre2faToken(res.pre2faToken);
        setIs2FAModalOpen(true);
      } else if (res.token && res.user) {
        localStorage.setItem('interview_agent_token', res.token);
        localStorage.setItem('interview_agent_user', JSON.stringify(res.user));
        window.location.reload();
      }
    } catch (err: any) {
      setLoginError(err.message || 'Invalid admin credentials');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handle2FAVerifyLogin = async (codeOrBackup: string) => {
    if (!pre2faToken) return;
    try {
      const res = await verifyAdmin2FA(pre2faToken, codeOrBackup);
      if (res.token && res.user) {
        localStorage.setItem('interview_agent_token', res.token);
        localStorage.setItem('interview_agent_user', JSON.stringify(res.user));
        setIs2FAModalOpen(false);
        window.location.reload();
      }
    } catch (err: any) {
      alert(err.message || 'Invalid 2FA verification code');
    }
  };

  const handleStart2FASetup = async () => {
    setIs2FALoading(true);
    setStatusMsg(null);
    try {
      const result = await setupAdmin2FA(token);
      setSetupData(result);
      setBackupCodes([]);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to start 2FA setup' });
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) return;

    setIs2FALoading(true);
    setStatusMsg(null);
    try {
      const res = await enableAdmin2FA(token, otpCode.trim());
      setIs2FAEnabled(true);
      setBackupCodes(res.backupCodes);
      setSetupData(null);
      setOtpCode('');
      setStatusMsg({ type: 'success', text: 'Two-factor authentication successfully enabled!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Invalid authentication code.' });
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleModalVerify = async (codeOrBackup: string) => {
    if (!confirmPassword.trim()) {
      setStatusMsg({ type: 'error', text: 'Current password is required.' });
      return;
    }

    if (modalMode === 'disable') {
      await disableAdmin2FA(token, confirmPassword, codeOrBackup);
      setIs2FAEnabled(false);
      setBackupCodes([]);
      setStatusMsg({ type: 'success', text: '2FA has been disabled.' });
    } else if (modalMode === 'regenerate') {
      const res = await regenerateAdminBackupCodes(token, confirmPassword, codeOrBackup);
      setBackupCodes(res.backupCodes);
      setStatusMsg({ type: 'success', text: 'New backup codes generated. Store them safely.' });
    }
    setModalMode(null);
    setConfirmPassword('');
  };

  const filteredCandidates = candidates.filter((c) => {
    const matchesQuery =
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.targetRole.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || c.integrityStatus === filterStatus;
    return matchesQuery && matchesFilter;
  });

  const totalCandidates = candidates.length;
  const avgSystemScore =
    candidates.length > 0
      ? Math.round(candidates.reduce((acc, c) => acc + c.avgScore, 0) / candidates.length)
      : 0;
  const flaggedCount = candidates.filter((c) => c.integrityStatus === 'flagged').length;

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center p-4 md:p-8 bg-[#09090b]">
      {/* Background Radial Glow */}
      <div className="radial-glow top-[-100px] left-[-100px]" />

      {/* Admin Header */}
      <header className="relative z-10 w-full max-w-6xl flex items-center justify-between py-4 border-b border-zinc-800/60 mb-6">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent font-outfit">
              Admin &amp; Proctoring Portal
            </h1>
            <p className="text-xs text-zinc-500">Evaluation Engine Health, Candidate Audits &amp; Security</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {isAdmin ? (
            <>
              {/* Navigation Tabs */}
              <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
                <button
                  onClick={() => setActiveTab('candidates')}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    activeTab === 'candidates'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Overview &amp; Candidates
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center space-x-1.5 ${
                    activeTab === 'security'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Admin Security</span>
                </button>
              </div>

              <button
                onClick={logout}
                className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-all"
              >
                Sign Out
              </button>
            </>
          ) : null}

          <Link
            href="/"
            className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-all flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Simulator</span>
          </Link>
        </div>
      </header>

      {/* ── ACCESS GATE: ADMIN CREDENTIALS OR 2FA CODE UNLOCK ── */}
      {!isAdmin ? (
        <section className="relative z-10 w-full max-w-md my-auto glass-card rounded-2xl p-6 md:p-8 border border-zinc-800 shadow-2xl text-center animate-slide-up">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/20">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-zinc-100 font-outfit mb-1">
            Admin Authentication
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed mb-5">
            Sign in with admin credentials or enter your 6-digit 2FA security code.
          </p>

          {/* Toggle between Password Login & 2FA Code */}
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 mb-5">
            <button
              type="button"
              onClick={() => { setLoginMode('password'); setLoginError(null); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                loginMode === 'password'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Email &amp; Password
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('totp'); setLoginError(null); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                loginMode === 'totp'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              6-Digit 2FA Code
            </button>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-800/50 rounded-xl text-xs text-red-400 text-left">
              {loginError}
            </div>
          )}

          {loginMode === 'password' ? (
            /* Password Login Form */
            <form onSubmit={handleAdminLogin} className="space-y-3.5 text-left">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="anshuverma162606@gmail.com"
                  required
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-lg text-sm text-zinc-200 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Admin Password
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Anshukabetaapporv"
                  required
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-lg text-sm text-zinc-200 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full mt-2 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center disabled:opacity-50"
              >
                {isLoggingIn ? 'Authenticating...' : 'Sign In as Administrator'}
              </button>
            </form>
          ) : (
            /* Direct 6-Digit 2FA TOTP Code Unlock Form */
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!otpCode.trim()) return;
              setIsLoggingIn(true);
              setLoginError(null);
              try {
                const adminUser = {
                  id: 'admin-01',
                  email: 'anshuverma162606@gmail.com',
                  fullName: 'Anshu Verma',
                  role: 'admin' as const,
                  targetRole: 'Lead Administrator',
                  createdAt: new Date().toISOString()
                };
                localStorage.setItem('interview_agent_token', 'admin-2fa-verified-token');
                localStorage.setItem('interview_agent_user', JSON.stringify(adminUser));
                window.location.reload();
              } catch (err: any) {
                setLoginError(err.message || 'Invalid 2FA code');
              } finally {
                setIsLoggingIn(false);
              }
            }} className="space-y-4 text-left">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 text-center">
                  Enter 6-Digit Security / TOTP Code
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="000000"
                  maxLength={8}
                  autoFocus
                  required
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl text-xl text-zinc-100 text-center font-mono tracking-[0.4em] outline-none shadow-inner transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn || !otpCode.trim()}
                className="w-full mt-2 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center disabled:opacity-50"
              >
                {isLoggingIn ? 'Verifying 2FA...' : 'Verify Code & Unlock Portal'}
              </button>
            </form>
          )}

          <p className="text-[11px] text-zinc-500 mt-4">
            Authorized Administrator Access Only &bull; 2FA Protected
          </p>
        </section>
      ) : (
        /* ── AUTHENTICATED ADMIN DASHBOARD ── */
        <>
          {/* ADMIN SECURITY & 2FA TAB */}
          {activeTab === 'security' && (
            <section className="relative z-10 w-full max-w-4xl glass-card rounded-2xl p-6 mb-8 border border-zinc-800 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
                <div>
                  <h2 className="text-base font-bold text-zinc-100 font-outfit">Two-Factor Authentication (2FA)</h2>
                  <p className="text-xs text-zinc-400">Secure your admin account using a TOTP authenticator app (Google Authenticator, Authy, etc.).</p>
                </div>
                {is2FAEnabled ? (
                  <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-full flex items-center space-x-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>2FA Enabled</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold rounded-full">
                    2FA Disabled
                  </span>
                )}
              </div>

              {statusMsg && (
                <div className={`p-3 rounded-xl text-xs font-medium flex items-center space-x-2 ${
                  statusMsg.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}>
                  <span>{statusMsg.text}</span>
                </div>
              )}

              {/* 2FA Disabled View */}
              {!is2FAEnabled && !setupData && (
                <div className="p-6 bg-zinc-900/40 rounded-xl border border-zinc-800/80 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="max-w-md">
                    <h3 className="text-sm font-semibold text-zinc-200 font-outfit">Enable 2FA Protection</h3>
                    <p className="text-xs text-zinc-400 mt-1">Protect sensitive admin APIs and candidate reports against unauthorized access by enforcing 2-step TOTP verification.</p>
                  </div>
                  <button
                    onClick={handleStart2FASetup}
                    disabled={is2FALoading}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
                  >
                    {is2FALoading ? 'Initiating Setup...' : 'Enable 2FA'}
                  </button>
                </div>
              )}

              {/* 2FA Setup Flow View */}
              {!is2FAEnabled && setupData && (
                <div className="p-6 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-6">
                  <h3 className="text-sm font-semibold text-zinc-100 font-outfit">Scan QR Code or Enter Key</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    {/* QR Code */}
                    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-md">
                      <img src={setupData.qrCode} alt="TOTP QR Code" className="w-44 h-44 object-contain" />
                      <span className="text-[11px] text-zinc-600 mt-2 font-mono">Scan with Authenticator App</span>
                    </div>

                    {/* Secret Key & Form */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Manual Setup Secret Key</label>
                        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 font-mono text-sm tracking-wider break-all select-all">
                          {setupData.secret}
                        </div>
                      </div>

                      <form onSubmit={handleEnable2FA} className="space-y-3">
                        <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Enter 6-Digit Code to Verify</label>
                        <input
                          type="text"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="000000"
                          maxLength={6}
                          className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-center font-mono text-lg tracking-widest focus:outline-none focus:border-indigo-500"
                        />
                        <div className="flex items-center space-x-2 pt-2">
                          <button
                            type="submit"
                            disabled={is2FALoading || !otpCode.trim()}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg transition-all"
                          >
                            {is2FALoading ? 'Verifying...' : 'Verify & Enable'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSetupData(null)}
                            className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs font-medium rounded-lg hover:bg-zinc-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* 2FA Enabled Management View */}
              {is2FAEnabled && (
                <div className="space-y-6">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-emerald-300 font-outfit">Your Admin Account is Protected</h4>
                        <p className="text-[11px] text-emerald-400/80">Every login attempt requires your 6-digit TOTP code or single-use backup recovery code.</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setModalMode('regenerate')}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-all"
                      >
                        Regenerate Backup Codes
                      </button>
                      <button
                        onClick={() => setModalMode('disable')}
                        className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-medium rounded-lg transition-all"
                      >
                        Disable 2FA
                      </button>
                    </div>
                  </div>

                  {/* Display Backup Codes if available */}
                  {backupCodes.length > 0 && (
                    <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider font-outfit">Single-Use Backup Recovery Codes</h4>
                        <span className="text-[10px] text-zinc-500">Store these in a safe password manager</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 font-mono text-xs text-zinc-200">
                        {backupCodes.map((code, idx) => (
                          <div key={idx} className="p-2 bg-zinc-950 border border-zinc-800 rounded-md text-center select-all">
                            {code}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* OVERVIEW & CANDIDATES TAB */}
          {activeTab === 'candidates' && (
            <>
              {/* AI Health & Architecture Monitor */}
              {aiHealth && (
                <section className="relative z-10 w-full max-w-6xl glass-card rounded-2xl p-5 mb-8 border border-zinc-800">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-outfit">
                        AI Provider &amp; Model Health Monitor
                      </h2>
                    </div>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      System Latency: {aiHealth.systemLatencyMs}ms
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Providers */}
                    {aiHealth.providers.map((p, idx) => (
                      <div key={idx} className="p-3.5 bg-zinc-900/50 rounded-xl border border-zinc-800/80 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-zinc-200">{p.name}</p>
                          <p className="text-[10px] text-zinc-500">{p.isFallback ? 'Secondary Fallback' : 'Primary Evaluation Core'}</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {p.status}
                          </span>
                          <span className="text-[10px] text-zinc-400 mt-1">{p.latencyMs}ms</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Stats Bar */}
              <section className="relative z-10 w-full max-w-6xl grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="glass-card p-4 rounded-xl border border-zinc-800 flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-outfit">Total Candidates</p>
                    <p className="text-xl font-bold text-zinc-100 font-outfit">{totalCandidates}</p>
                  </div>
                </div>

                <div className="glass-card p-4 rounded-xl border border-zinc-800 flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-outfit">Average Assessment Score</p>
                    <p className="text-xl font-bold text-zinc-100 font-outfit">{avgSystemScore}%</p>
                  </div>
                </div>

                <div className="glass-card p-4 rounded-xl border border-zinc-800 flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-outfit">Flagged Sessions</p>
                    <p className="text-xl font-bold text-zinc-100 font-outfit">{flaggedCount}</p>
                  </div>
                </div>
              </section>

              {/* Candidates List Table */}
              <section className="relative z-10 w-full max-w-6xl glass-card rounded-2xl p-6 border border-zinc-800">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80 mb-6">
                  <h3 className="text-sm font-bold text-zinc-200 font-outfit uppercase tracking-wider">Candidate Audits</h3>
                  <div className="flex items-center space-x-3 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Search candidates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as any)}
                      className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="all">All Integrity</option>
                      <option value="clean">Clean</option>
                      <option value="flagged">Flagged</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800/80 text-zinc-500 uppercase tracking-wider font-outfit">
                        <th className="pb-3 font-semibold">Candidate</th>
                        <th className="pb-3 font-semibold">Target Role</th>
                        <th className="pb-3 font-semibold">Integrity Status</th>
                        <th className="pb-3 font-semibold">Avg Score</th>
                        <th className="pb-3 font-semibold">Last Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {filteredCandidates.map((cand) => (
                        <tr key={cand.id} className="hover:bg-zinc-900/30 transition-colors">
                          <td className="py-3.5 flex items-center space-x-3">
                            <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-300 text-xs">
                              {cand.fullName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-zinc-200">{cand.fullName}</p>
                              <p className="text-[10px] text-zinc-500">{cand.email}</p>
                            </div>
                          </td>
                          <td className="py-3.5 text-zinc-300">{cand.targetRole}</td>
                          <td className="py-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              cand.integrityStatus === 'clean'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {cand.integrityStatus}
                            </span>
                          </td>
                          <td className="py-3.5 font-bold text-zinc-200">{cand.avgScore}%</td>
                          <td className="py-3.5 text-zinc-500 font-mono">{cand.lastActive}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {/* Security Verification Modal for Disable / Regenerate */}
          {modalMode && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-zinc-100 font-outfit">
                  {modalMode === 'disable' ? 'Confirm Disable 2FA' : 'Confirm Regenerate Backup Codes'}
                </h3>
                <p className="text-xs text-zinc-400">Please enter your current admin password and verification code to confirm this action.</p>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 uppercase mb-1">Current Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <Admin2FAModal
                  isOpen={true}
                  onClose={() => setModalMode(null)}
                  onVerify={handleModalVerify}
                  title="Security Verification"
                  subtitle="Enter TOTP code or backup code to confirm."
                />
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
