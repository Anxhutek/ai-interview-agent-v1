'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useInterview } from '../hooks/useInterview';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import { ProfileModal } from '@/components/ProfileModal';
import { ProctoringCam } from '@/components/ProctoringCam';
import type { BreethGraphNeighbor } from '@/lib/api';
import Link from 'next/link';

export default function Home() {
  const { user, logout } = useAuth();
  const {
    stage,
    sessionId,
    dialogue,
    isTyping,
    error,
    isFinished,
    turnCount,
    candidateName,
    feedback,
    graph,
    beginInterview,
    sendAnswer,
    requestFeedback,
  } = useInterview();

  // Local state for modals & forms
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [formName, setFormName] = useState(user?.fullName || '');
  const [formId, setFormId] = useState(user?.email || '');
  const [isLoading, setIsLoading] = useState(false);
  const [proctoringWarnings, setProctoringWarnings] = useState(0);

  // Sync user profile data to form fields when user logs in
  useEffect(() => {
    if (user) {
      setFormName(user.fullName);
      setFormId(user.email);
    }
  }, [user]);

  // Input state for messaging
  const [inputText, setInputText] = useState('');

  // Scroll ref for chat
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Local state for graph detail modal / panel
  const [selectedNode, setSelectedNode] = useState<
    (BreethGraphNeighbor & { isRoot?: boolean }) | null
  >(null);

  const TOTAL_QUESTIONS = 8;

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [dialogue, isTyping]);

  useEffect(() => {
    if (graph) {
      setSelectedNode({
        peer: graph.entity.name,
        isRoot: true,
        direction: 'out',
        fact: graph.entity.summary,
        intent_meta: {
          edge_kind: 'Candidate Profile',
          cognitive_pattern: 'Synthesis of turns',
          why_connected: graph.entity.knot_narrative,
        },
      });
    }
  }, [graph]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await beginInterview(formId || 'candidate-1', formName || 'Candidate');
    setIsLoading(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const textToSend = inputText;
    setInputText('');
    await sendAnswer(textToSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const restart = () => {
    window.location.reload();
  };

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-between p-4 md:p-8 overflow-hidden bg-[#09090b]">
      {/* Background Glows */}
      <div className="radial-glow top-[-100px] left-[-100px]" />
      <div className="radial-glow-secondary bottom-[-100px] right-[-100px]" />

      {/* Auth & Profile Modals */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* Header */}
      <header className="relative z-10 w-full max-w-6xl flex items-center justify-between py-4 border-b border-zinc-800/60 mb-6">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent font-outfit">
              The Interview Agent
            </h1>
            <p className="text-xs text-zinc-500">Breeth Memory Layer &amp; Live Proctoring Protocol</p>
          </div>
        </div>

        {/* User Navigation Controls */}
        <div className="flex items-center space-x-3">
          <Link
            href="/admin"
            className="px-3.5 py-1.5 text-xs font-medium text-violet-400 hover:text-white bg-violet-950/40 hover:bg-violet-900/60 border border-violet-900/50 rounded-lg transition-all flex items-center space-x-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 00-2 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Admin Portal</span>
          </Link>

          {user ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 transition-all"
              >
                <div className="h-5 w-5 rounded-full bg-indigo-600 overflow-hidden flex items-center justify-center text-[10px] font-bold text-white">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    user.fullName.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="text-xs text-zinc-200 font-medium">{user.fullName}</span>
              </button>
              <button
                onClick={logout}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                title="Sign Out"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 rounded-lg transition-all shadow-md shadow-indigo-500/20"
            >
              Sign In / Profile
            </button>
          )}

          {stage !== 'setup' && (
            <button
              onClick={restart}
              className="px-3.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-all flex items-center space-x-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.213 6H16" />
              </svg>
              <span>Reset</span>
            </button>
          )}
        </div>
      </header>

      {/* STAGE 1: LANDING PAGE HERO + SETUP */}
      {stage === 'setup' && (
        <section className="relative z-10 w-full max-w-6xl my-auto animate-slide-up space-y-12 py-4">
          {/* Hero Header */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Value Proposition */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/50 text-indigo-400 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
                <span>AI-Driven Technical Interviewer v2.0</span>
              </div>

              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-100 font-outfit leading-tight">
                Master Technical Interviews with{' '}
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                  Memory Graph Distillation
                </span>
              </h1>

              <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
                Experience an 8-module adaptive interview simulator across System Architecture, Async Concurrency, Data Persistence, and Distributed Resilience — complete with live eye-tracking proctoring and Breeth cognitive profile synthesis.
              </p>

              {/* Highlight Badges */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                  <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs mb-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>8 Core Modules</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">Structured system design to leadership</p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                  <div className="flex items-center space-x-2 text-violet-400 font-semibold text-xs mb-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>AI Proctoring Guard</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">On-device webcam gaze tracking</p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 col-span-2 md:col-span-1">
                  <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs mb-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span>Memory Distillation</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">Breeth intent graph profiles</p>
                </div>
              </div>
            </div>

            {/* Right Column: Setup Card OR Sign-In Gate */}
            <div className="lg:col-span-5">
              {user ? (
                /* ── Authenticated: Show Interview Launch Form ── */
                <div className="glass-card rounded-2xl p-6 md:p-8 border border-zinc-800 shadow-2xl">
                  {/* Logged-in user badge */}
                  <div className="flex items-center space-x-3 mb-5 pb-4 border-b border-zinc-800/60">
                    <div className="h-10 w-10 rounded-full bg-indigo-600 overflow-hidden flex items-center justify-center text-sm font-bold text-white border-2 border-indigo-400 shadow-md shadow-indigo-500/20">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        user.fullName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">{user.fullName}</p>
                      <p className="text-[11px] text-zinc-500">{user.email} &bull; {user.targetRole}</p>
                    </div>
                  </div>

                  <div className="mb-5">
                    <h2 className="text-xl font-semibold tracking-tight text-zinc-100 font-outfit">
                      Launch Interview Session
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      Confirm your details and start your proctored evaluation.
                    </p>
                  </div>

                  {error && (
                    <div className="mb-5 p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-red-400 text-xs flex items-start space-x-2 animate-fade-in">
                      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleStart} className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Candidate Full Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. Sarah Connor"
                        required
                        disabled={isLoading}
                        className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-zinc-200 placeholder-zinc-600 transition-all text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="candidateId" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Candidate ID / Email
                      </label>
                      <input
                        type="text"
                        id="candidateId"
                        value={formId}
                        onChange={(e) => setFormId(e.target.value)}
                        placeholder="e.g. sarah.c@example.com"
                        required
                        disabled={isLoading}
                        className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-zinc-200 placeholder-zinc-600 transition-all text-sm"
                      />
                    </div>

                    <div className="p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-zinc-300 font-medium">
                          {user.resumeFileName ? `Resume: ${user.resumeFileName}` : 'No resume attached'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsProfileOpen(true)}
                        className="text-indigo-400 hover:text-indigo-300 font-medium"
                      >
                        Edit Profile
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full mt-4 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-medium text-sm transition-all flex items-center justify-center shadow-lg shadow-indigo-500/20 active:scale-[0.99] disabled:opacity-50 font-sans"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Initializing Session...</span>
                        </>
                      ) : (
                        <span>Start Proctored Interview</span>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                /* ── Not Authenticated: Show Sign-In Gate ── */
                <div className="glass-card rounded-2xl p-6 md:p-8 border border-zinc-800 shadow-2xl text-center">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-indigo-500/20">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>

                  <h2 className="text-xl font-bold tracking-tight text-zinc-100 font-outfit mb-2">
                    Sign In to Get Started
                  </h2>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                    Create your candidate profile to begin a proctored interview session. Upload your resume and set up your webcam for the AI proctoring guard.
                  </p>

                  <div className="space-y-3 text-left mb-6">
                    <div className="flex items-center space-x-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
                      <div className="h-8 w-8 rounded-lg bg-indigo-950/60 border border-indigo-900/50 flex items-center justify-center text-indigo-400 shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-200">Create Candidate Profile</p>
                        <p className="text-[11px] text-zinc-500">Name, target role, photo &amp; resume</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
                      <div className="h-8 w-8 rounded-lg bg-violet-950/60 border border-violet-900/50 flex items-center justify-center text-violet-400 shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-200">Enable AI Proctoring</p>
                        <p className="text-[11px] text-zinc-500">Webcam eye-tracking verification</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
                      <div className="h-8 w-8 rounded-lg bg-emerald-950/60 border border-emerald-900/50 flex items-center justify-center text-emerald-400 shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-200">Get Evaluated &amp; Scored</p>
                        <p className="text-[11px] text-zinc-500">Per-topic analysis with cognitive profiling</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsAuthOpen(true)}
                    className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-sm transition-all flex items-center justify-center shadow-lg shadow-indigo-500/20 active:scale-[0.99]"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Sign In / Create Account
                  </button>

                  <p className="text-[11px] text-zinc-600 mt-3">
                    Admin access? Sign in with an email containing &ldquo;admin&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* STAGE 2: ACTIVE CHAT */}
      {stage === 'chat' && (
        <section className="relative z-10 w-full max-w-6xl flex-grow grid grid-cols-1 lg:grid-cols-4 gap-6 animate-slide-up">
          {/* Live Proctoring Webcam */}
          <ProctoringCam
            sessionId={sessionId || 'session'}
            isActive={stage === 'chat'}
            onWarningTriggered={(count) => setProctoringWarnings(count)}
          />

          {/* Left panel: Info & Statistics */}
          <div className="lg:col-span-1 flex flex-col space-y-4">
            <div className="glass-card rounded-xl p-4 flex flex-col space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-outfit">Session Context</h3>
              <div>
                <p className="text-xs text-zinc-400">Candidate Name</p>
                <p className="text-sm font-semibold text-zinc-100">{candidateName}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">Session ID</p>
                <p className="text-xs font-mono text-zinc-300 break-all">{sessionId}</p>
              </div>
              <div className="pt-2 border-t border-zinc-800/60">
                <p className="text-xs text-zinc-400">Target Role</p>
                <span className="inline-block mt-1 px-2.5 py-1 text-xs font-medium text-indigo-400 bg-indigo-950/40 border border-indigo-900/50 rounded-full">
                  {user?.targetRole || 'Systems Architecture'}
                </span>
              </div>
            </div>

            <div className="glass-card rounded-xl p-4 flex flex-col space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-outfit">Live Metrics</h3>
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-zinc-400">Breeth Memory Layer</span>
                  <span className="text-green-400 font-medium animate-pulse flex items-center space-x-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    <span>Synced</span>
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(((turnCount + 1) / TOTAL_QUESTIONS) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Proctoring Warning Badge */}
              <div className="pt-2 border-t border-zinc-800/60">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Eye/Face Integrity</span>
                  {proctoringWarnings > 0 ? (
                    <span className="text-red-400 font-bold font-mono">
                      ⚠️ {proctoringWarnings} Warning{proctoringWarnings > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-medium">✓ Clean</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 text-center">
                <div className="p-2 bg-zinc-900/50 border border-zinc-800/40 rounded-lg">
                  <p className="text-xs text-zinc-400">Turns Completed</p>
                  <p className="text-lg font-bold text-zinc-200 mt-0.5">{turnCount}</p>
                </div>
                <div className="p-2 bg-zinc-900/50 border border-zinc-800/40 rounded-lg">
                  <p className="text-xs text-zinc-400">Total Modules</p>
                  <p className="text-lg font-bold text-zinc-200 mt-0.5">{TOTAL_QUESTIONS}</p>
                </div>
              </div>
            </div>

            {isFinished && (
              <button
                onClick={requestFeedback}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium text-sm transition-all flex items-center justify-center shadow-lg shadow-emerald-500/20 active:scale-[0.99] animate-fade-in"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>View Feedback &amp; Score</span>
              </button>
            )}
          </div>

          {/* Right panel: Chat Box */}
          <div className="lg:col-span-3 glass-card rounded-xl flex flex-col h-[65vh] md:h-[70vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800/60 bg-zinc-900/40 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${isFinished ? 'bg-emerald-500' : 'bg-indigo-500 animate-ping'}`} />
                <h3 className="font-semibold text-sm text-zinc-200">
                  {isFinished ? 'Interview Complete' : 'Interview Conversation Loop'}
                </h3>
              </div>
              <span className="text-xs text-zinc-500 font-sans">
                Turn {turnCount} of {TOTAL_QUESTIONS}
              </span>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar bg-zinc-950/20">
              {dialogue.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div className="flex items-start space-x-2.5 max-w-[85%] md:max-w-[75%]">
                    {msg.role === 'agent' && (
                      <div className="h-8 w-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex flex-col">
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-tr-none'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none font-medium'
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      </div>
                      <span className="text-[10px] text-zinc-500 mt-1 self-end px-1">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start animate-fade-in">
                  <div className="flex items-start space-x-2.5">
                    <div className="h-8 w-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-indigo-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-none px-4 py-3 flex space-x-1.5 items-center">
                      <span className="h-2 w-2 bg-zinc-500 rounded-full typing-dot" />
                      <span className="h-2 w-2 bg-zinc-500 rounded-full typing-dot" />
                      <span className="h-2 w-2 bg-zinc-500 rounded-full typing-dot" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-zinc-800/60 bg-zinc-900/30 flex items-end space-x-3">
              <div className="flex-grow relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isFinished ? 'Interview complete! Click "View Feedback" to see your results.' : 'Type your response... (Press Enter to send)'}
                  disabled={isTyping || isFinished}
                  rows={2}
                  className="w-full bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-lg py-2.5 px-4 text-sm text-zinc-200 placeholder-zinc-600 resize-none custom-scrollbar transition-all disabled:opacity-50"
                />
              </div>
              <button
                type="submit"
                disabled={!inputText.trim() || isTyping || isFinished}
                className="h-10 w-10 shrink-0 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-lg transition-all flex items-center justify-center shadow-lg shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              >
                <svg className="w-4.5 h-4.5 transform rotate-90 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </section>
      )}

      {/* STAGE 3: FEEDBACK / DASHBOARD */}
      {stage === 'feedback' && feedback && (
        <section className="relative z-10 w-full max-w-6xl flex-grow flex flex-col space-y-6 animate-slide-up">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center text-center">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4 font-outfit">Overall Score</h3>
              <div className="relative flex items-center justify-center">
                <div className="w-36 h-36 rounded-full border-4 border-zinc-800 flex items-center justify-center">
                  <div className="absolute inset-0.5 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin-slow" />
                  <div className="text-center">
                    <span className="text-4xl font-extrabold text-zinc-100">{feedback.score}</span>
                    <span className="text-zinc-500 text-sm">/100</span>
                  </div>
                </div>
              </div>
              <span className="inline-block mt-4 px-3 py-1 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 rounded-full">
                Evaluation Complete
              </span>
            </div>

            <div className="glass-card rounded-2xl p-6 md:col-span-2 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 font-outfit">Cognitive Profile Synthesis</h3>
                <h4 className="text-lg font-bold text-zinc-100 font-outfit mb-3">
                  {graph?.entity.summary || 'Candidate showing strong technical fundamentals.'}
                </h4>
                <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">{feedback.feedback}</p>
              </div>
              <div className="flex items-center space-x-2.5 pt-4 mt-4 border-t border-zinc-800/40 text-xs text-zinc-500">
                <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Distilled profile sourced from Breeth intent-aware memory graph.</span>
              </div>
            </div>
          </div>

          {/* Interactive Graph Details Section */}
          {graph && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass-card rounded-2xl p-6 flex flex-col">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4 font-outfit">Breeth Memory Graph</h3>

                <div className="relative flex-grow min-h-[300px] bg-zinc-950/40 border border-zinc-900 rounded-xl flex items-center justify-center p-4 overflow-hidden">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-10" />

                  <div className="relative w-full max-w-lg h-full flex flex-col items-center justify-center py-6">
                    {/* Root Node (Candidate) */}
                    <button
                      onClick={() =>
                        setSelectedNode({
                          peer: graph.entity.name,
                          isRoot: true,
                          direction: 'out',
                          fact: graph.entity.summary,
                          intent_meta: {
                            edge_kind: 'Profile Summary',
                            cognitive_pattern: 'Aggregated intent',
                            why_connected: graph.entity.knot_narrative,
                          },
                        })
                      }
                      className={`relative z-10 px-5 py-3 rounded-xl border flex flex-col items-center shadow-lg transition-all duration-300 ${
                        selectedNode?.isRoot
                          ? 'bg-indigo-900/60 border-indigo-500 shadow-indigo-500/10 scale-105'
                          : 'bg-zinc-900/90 border-zinc-800 hover:border-indigo-500/50'
                      }`}
                    >
                      <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20 mb-1.5">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <span className="text-xs font-semibold tracking-wide text-zinc-200">{graph.entity.name}</span>
                      <span className="text-[10px] text-zinc-500 mt-0.5 font-mono">Score: {graph.entity.knot_score}</span>
                    </button>

                    {/* Neighbor Nodes */}
                    <div className="relative w-full grid grid-cols-4 gap-2 mt-16 z-10">
                      {graph.neighbors.map((neighbor, index) => {
                        const isSelected = !selectedNode?.isRoot && selectedNode?.peer === neighbor.peer;
                        return (
                          <button
                            key={index}
                            onClick={() => setSelectedNode({ ...neighbor, isRoot: false })}
                            className={`flex flex-col items-center p-2 rounded-lg border text-center transition-all duration-300 ${
                              isSelected
                                ? 'bg-violet-950/60 border-violet-500 shadow-lg shadow-violet-500/15 scale-105'
                                : 'bg-zinc-900/70 border-zinc-800/80 hover:border-violet-500/40'
                            }`}
                          >
                            <div className="h-5 w-5 rounded-md bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-zinc-400 mb-1">
                              <span className="text-[10px] font-bold">{index + 1}</span>
                            </div>
                            <span className="text-[10px] font-medium text-zinc-200 line-clamp-2">{neighbor.peer}</span>
                            <span className="text-[8px] text-zinc-500 uppercase mt-0.5 tracking-wider">{neighbor.intent_meta.edge_kind}</span>
                          </button>
                        );
                      })}
                    </div>

                    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" xmlns="http://www.w3.org/2000/svg">
                      {graph.neighbors.map((_, i) => {
                        const total = graph.neighbors.length;
                        const xPct = ((i + 0.5) / total) * 100;
                        return <line key={i} x1="50%" y1="35%" x2={`${xPct}%`} y2="70%" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 4" />;
                      })}
                    </svg>
                  </div>
                </div>
              </div>

              {/* Inspector Card */}
              <div className="lg:col-span-1 flex flex-col">
                <div className="glass-card rounded-2xl p-6 flex-grow flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2 pb-3 border-b border-zinc-800/60 mb-4">
                      <div className="h-6 w-6 rounded-md bg-indigo-950/40 border border-indigo-900/50 flex items-center justify-center text-indigo-400">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-sm text-zinc-300 font-outfit">Memory Node Inspector</h3>
                    </div>

                    {selectedNode ? (
                      <div className="space-y-4 animate-fade-in">
                        <div>
                          <p className="text-xs text-zinc-500 uppercase tracking-wide">Target Element / Node</p>
                          <p className="text-base font-bold text-indigo-400 mt-0.5">{selectedNode.peer}</p>
                        </div>

                        <div>
                          <p className="text-xs text-zinc-500 uppercase tracking-wide">Extracted Fact / Observation</p>
                          <p className="text-sm text-zinc-300 mt-1 leading-relaxed bg-zinc-900/30 border border-zinc-850 p-2.5 rounded-lg max-h-32 overflow-y-auto custom-scrollbar">
                            {selectedNode.fact}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-zinc-500 uppercase tracking-wide">Cognitive Pattern</p>
                          <span className="inline-block mt-1.5 px-2.5 py-1 text-xs font-medium text-violet-400 bg-violet-950/30 border border-violet-900/40 rounded-md font-mono">
                            {selectedNode.intent_meta.cognitive_pattern}
                          </span>
                        </div>

                        <div>
                          <p className="text-xs text-zinc-500 uppercase tracking-wide">Detailed Logical Inference</p>
                          <p className="text-sm text-zinc-400 mt-1 leading-relaxed italic">
                            &ldquo;{selectedNode.intent_meta.why_connected}&rdquo;
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <svg className="w-10 h-10 text-zinc-700 animate-pulse mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                        </svg>
                        <p className="text-xs text-zinc-500">Select a memory node from the graph to inspect distilled traits.</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={restart}
                    className="w-full mt-6 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-medium text-xs transition-all flex items-center justify-center space-x-2"
                  >
                    <span>Restart Simulation</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-6xl text-center py-4 border-t border-zinc-900/60 mt-8">
        <p className="text-[10px] text-zinc-600">
          The Interview Agent v2.0.0 &bull; Powered by Breeth API Intent-Aware Memory Distillation Graph.
        </p>
      </footer>
    </main>
  );
}
