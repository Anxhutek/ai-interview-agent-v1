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
    questionIndex,
    totalQuestions,
    currentTopic,
    candidateName,
    submissionState,
    evaluationState,
    draftText,
    finalReport,
    graph,
    isPlayingAudio,
    setDraftText,
    beginInterview,
    sendAnswer,
    requestReport,
    retryEvaluation,
    playQuestionAudio,
  } = useInterview();

  // Local state for modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [formName, setFormName] = useState(user?.fullName || '');
  const [formId, setFormId] = useState(user?.email || '');
  const [isLoading, setIsLoading] = useState(false);
  const [proctoringWarnings, setProctoringWarnings] = useState(0);
  const [showGraphTab, setShowGraphTab] = useState(false);

  // Sync user profile data to form fields when user logs in
  useEffect(() => {
    if (user) {
      setFormName(user.fullName);
      setFormId(user.email);
    }
  }, [user]);

  // Scroll ref for chat
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Local state for graph detail modal / panel
  const [selectedNode, setSelectedNode] = useState<
    (BreethGraphNeighbor & { isRoot?: boolean }) | null
  >(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [dialogue, isTyping, submissionState]);

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

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!draftText.trim() || isTyping || submissionState === 'saving') return;
    await sendAnswer(draftText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
            <p className="text-xs text-zinc-500">Autonomous AI Technical Interviewer &amp; Proctor</p>
          </div>
        </div>

        {/* User Navigation Controls */}
        <div className="flex items-center space-x-3">
          <Link
            href="/admin"
            className="px-3.5 py-1.5 text-xs font-medium text-violet-400 hover:text-white bg-violet-950/40 hover:bg-violet-900/60 border border-violet-900/50 rounded-lg transition-all flex items-center space-x-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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

      {/* STAGE 1: LANDING PAGE HERO + AUTH GATE */}
      {stage === 'setup' && (
        <section className="relative z-10 w-full max-w-6xl my-auto animate-slide-up space-y-12 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Value Proposition */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/50 text-indigo-400 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
                <span>AI Technical Interview Platform v2.5</span>
              </div>

              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-100 font-outfit leading-tight">
                Master Technical Interviews with{' '}
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                  Intelligent AI Evaluation
                </span>
              </h1>

              <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
                Experience a rigorous 8-question conversational deep dive across System Architecture, Async Concurrency, Data Persistence, and Distributed Resilience — complete with on-device proctoring and comprehensive final reporting.
              </p>

              {/* Feature Badges */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                  <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs mb-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>8 Core Modules</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">Curated software design topics</p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                  <div className="flex items-center space-x-2 text-violet-400 font-semibold text-xs mb-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>AI Proctoring Guard</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">Live webcam gaze tracking</p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 col-span-2 md:col-span-1">
                  <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs mb-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>Structured Reports</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">Multi-factor score breakdowns</p>
                </div>
              </div>
            </div>

            {/* Right Column: Setup Card OR Sign-In Gate */}
            <div className="lg:col-span-5">
              {user ? (
                /* Authenticated */
                <div className="glass-card rounded-2xl p-6 md:p-8 border border-zinc-800 shadow-2xl">
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
                      Ready to begin? Your answers will be safely preserved and evaluated.
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
                /* Unauthenticated Sign-In Gate */
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
                        <p className="text-[11px] text-zinc-500">Multi-dimensional assessment report</p>
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
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* STAGE 2: ACTIVE CONVERSATIONAL CHAT */}
      {stage === 'chat' && (
        <section className="relative z-10 w-full max-w-6xl flex-grow grid grid-cols-1 lg:grid-cols-4 gap-6 animate-slide-up">
          {/* Live Proctoring Webcam */}
          <ProctoringCam
            sessionId={sessionId || 'session'}
            isActive={stage === 'chat'}
            onWarningTriggered={(count) => setProctoringWarnings(count)}
          />

          {/* Left panel: Context & Progress */}
          <div className="lg:col-span-1 flex flex-col space-y-4">
            <div className="glass-card rounded-xl p-4 flex flex-col space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-outfit">Session Context</h3>
              <div>
                <p className="text-xs text-zinc-400">Candidate Name</p>
                <p className="text-sm font-semibold text-zinc-100">{candidateName}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">Current Topic</p>
                <span className="inline-block mt-1 px-2.5 py-1 text-xs font-medium text-indigo-400 bg-indigo-950/40 border border-indigo-900/50 rounded-full font-outfit">
                  {currentTopic}
                </span>
              </div>
              <div className="pt-2 border-t border-zinc-800/60">
                <p className="text-xs text-zinc-400">Target Role</p>
                <p className="text-xs font-medium text-zinc-300 mt-0.5">{user?.targetRole || 'Backend Engineer'}</p>
              </div>
            </div>

            {/* Live Progress & Status */}
            <div className="glass-card rounded-xl p-4 flex flex-col space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-outfit">Progress</h3>
                <span className="text-xs font-mono font-semibold text-indigo-400">
                  Question {Math.min(questionIndex, totalQuestions)} of {totalQuestions}
                </span>
              </div>

              {/* Dot-stepper Progress Indicator */}
              <div className="flex items-center justify-between py-2 px-1">
                {Array.from({ length: totalQuestions }).map((_, idx) => {
                  const isPassed = idx < questionIndex - 1;
                  const isCurrent = idx === questionIndex - 1;
                  return (
                    <React.Fragment key={idx}>
                      <div
                        className={`h-3 w-3 rounded-full flex items-center justify-center transition-all ${
                          isPassed
                            ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                            : isCurrent
                            ? 'bg-indigo-500 ring-4 ring-indigo-500/20 shadow-[0_0_8px_#6366f1] animate-pulse'
                            : 'bg-zinc-800 border border-zinc-700'
                        }`}
                        title={`Question ${idx + 1}`}
                      />
                      {idx < totalQuestions - 1 && (
                        <div
                          className={`h-0.5 flex-1 mx-1 transition-colors ${
                            idx < questionIndex - 1 ? 'bg-emerald-500' : 'bg-zinc-800'
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Subtle Evaluation Status Badge */}
              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                <span className="text-zinc-400">AI Background Guard</span>
                {evaluationState === 'processing' ? (
                  <span className="text-violet-400 font-medium flex items-center space-x-1.5 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                    <span>AI Evaluation ●</span>
                  </span>
                ) : (
                  <span className="text-emerald-400 font-medium flex items-center space-x-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>Evaluation Ready</span>
                  </span>
                )}
              </div>

              {/* Proctoring Warning Badge */}
              <div className="pt-2 border-t border-zinc-800/60 flex justify-between items-center text-xs">
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

            {/* Complete Interview Button */}
            {isFinished && (
              <button
                onClick={requestReport}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-sm transition-all flex items-center justify-center shadow-lg shadow-emerald-500/20 active:scale-[0.99] animate-fade-in"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>View Final Evaluation Report</span>
              </button>
            )}
          </div>

          {/* Right panel: Chat Box */}
          <div className="lg:col-span-3 glass-card rounded-xl flex flex-col h-[65vh] md:h-[70vh] overflow-hidden">
            {/* Chat Header */}
            <div className="px-6 py-3.5 border-b border-zinc-800/60 bg-zinc-900/40 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className={`h-2 w-2 rounded-full ${isFinished ? 'bg-emerald-500' : 'bg-indigo-500 animate-ping'}`} />
                <h3 className="font-semibold text-sm text-zinc-200 font-outfit">
                  {isFinished ? 'Interview Complete' : 'Active Interview Conversation'}
                </h3>
              </div>

              {/* Submission State Banner */}
              {submissionState === 'saving' && (
                <span className="text-xs text-indigo-400 font-medium flex items-center space-x-1 animate-pulse">
                  <svg className="animate-spin h-3 w-3 text-indigo-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Saving answer...</span>
                </span>
              )}

              {submissionState === 'saved' && (
                <span className="text-xs text-emerald-400 font-medium flex items-center space-x-1 animate-fade-in">
                  <span>✓ Answer saved</span>
                </span>
              )}
            </div>

            {/* Chat Dialogue Stream */}
            <div className="flex-grow overflow-y-auto p-6 space-y-5 custom-scrollbar bg-zinc-950/20">
              {dialogue.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div className="flex items-start space-x-2.5 max-w-[88%] md:max-w-[78%]">
                    {msg.role === 'agent' && (
                      <div className="h-8 w-8 rounded-full bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-indigo-500/10">
                        <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex flex-col">
                      {msg.role === 'agent' && (
                        <div className="flex items-center space-x-2 mb-1.5 px-1">
                          <span className="text-xs font-semibold text-zinc-300 font-outfit">
                            AI Interviewer
                          </span>
                          <span className="text-[10px] text-zinc-500">&bull; Senior Technical Interviewer</span>
                          <button
                            type="button"
                            onClick={() => playQuestionAudio(msg.text)}
                            className="ml-2 text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 px-1.5 py-0.5 rounded bg-indigo-950/40 border border-indigo-900/50"
                            title="Play Question Audio"
                          >
                            <span>{isPlayingAudio ? '⏹ Stop' : '🔊 Play Question'}</span>
                          </button>
                        </div>
                      )}

                      <div
                        className={`rounded-2xl px-4 py-3 text-sm ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-tr-none shadow-md shadow-indigo-500/10'
                            : 'bg-zinc-900/90 border border-zinc-800 text-zinc-200 rounded-tl-none font-medium'
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

            {/* Error banner with retry */}
            {error && (
              <div className="px-6 py-2 bg-red-950/80 border-t border-red-800/50 flex items-center justify-between text-xs text-red-300">
                <span>{error}</span>
                <button
                  onClick={() => handleSend()}
                  className="px-2.5 py-1 text-[11px] font-semibold text-white bg-red-800 hover:bg-red-700 rounded-md transition-all"
                >
                  Retry Submission
                </button>
              </div>
            )}

            {/* Answer Composer with Mic & Enter behavior */}
            <form onSubmit={handleSend} className="p-4 border-t border-zinc-800/60 bg-zinc-900/30 flex items-end space-x-3">
              <div className="flex-grow relative">
                <textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isFinished
                      ? 'Interview complete! Click "View Final Evaluation Report" to review your assessment.'
                      : 'Type your response... (Press Enter to submit, Shift+Enter for newline)'
                  }
                  disabled={isTyping || isFinished || submissionState === 'saving'}
                  rows={2}
                  className="w-full bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-lg py-2.5 pl-4 pr-10 text-sm text-zinc-200 placeholder-zinc-600 resize-none custom-scrollbar transition-all disabled:opacity-50"
                />

                {/* Voice Input icon button */}
                <button
                  type="button"
                  aria-label="Voice input"
                  onClick={() => alert("Microphone active. Speak your answer or type directly.")}
                  className="absolute right-3 top-3 text-zinc-500 hover:text-indigo-400 transition-colors"
                  title="Voice Input"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
              </div>

              <button
                type="submit"
                disabled={!draftText.trim() || isTyping || isFinished || submissionState === 'saving'}
                aria-label="Submit answer"
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

      {/* STAGE 3: GENERATING REPORT TRANSITION */}
      {stage === 'generating_report' && (
        <section className="relative z-10 w-full max-w-xl my-auto glass-card rounded-2xl p-8 border border-zinc-800 shadow-2xl text-center animate-slide-up">
          <div className="w-16 h-16 rounded-full bg-indigo-950/60 border-2 border-indigo-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/20">
            <svg className="animate-spin h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-zinc-100 font-outfit mb-2">
            Generating Your Interview Report...
          </h2>
          <p className="text-xs text-zinc-400 mb-8">
            Analyzing multi-turn technical responses and synthesizing evaluation dimensions.
          </p>

          <div className="space-y-3 max-w-sm mx-auto text-left text-sm">
            <div className="flex items-center space-x-3 text-emerald-400 font-medium">
              <span>✓</span>
              <span>Interview completed</span>
            </div>
            <div className="flex items-center space-x-3 text-emerald-400 font-medium">
              <span>✓</span>
              <span>Answers analyzed</span>
            </div>
            <div className="flex items-center space-x-3 text-indigo-400 font-medium animate-pulse">
              <span>●</span>
              <span>Preparing final assessment report</span>
            </div>
          </div>
        </section>
      )}

      {/* STAGE 4: FINAL REPORT DASHBOARD */}
      {stage === 'report' && finalReport && (
        <section className="relative z-10 w-full max-w-6xl flex-grow flex flex-col space-y-6 animate-slide-up">
          {/* Top Bar: Tabs & Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowGraphTab(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold font-outfit transition-all ${
                  !showGraphTab
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                Comprehensive Evaluation Report
              </button>
              <button
                onClick={() => setShowGraphTab(true)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold font-outfit transition-all ${
                  showGraphTab
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                Memory Graph Inspector
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all flex items-center space-x-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print / Save PDF</span>
              </button>
              <button
                onClick={restart}
                className="px-3.5 py-2 text-xs font-medium text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 rounded-xl transition-all shadow-md shadow-indigo-500/20"
              >
                Restart Simulation
              </button>
            </div>
          </div>

          {!showGraphTab ? (
            /* Structured Report View */
            <div className="space-y-6">
              {/* Overall Score & Assessment Banner */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-4 glass-card rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4 font-outfit">OVERALL SCORE</h3>
                  <div className="relative flex items-center justify-center mb-3">
                    <div className="w-32 h-32 rounded-full border-4 border-zinc-800 flex items-center justify-center">
                      <div className="text-center">
                        <span className="text-4xl font-extrabold text-zinc-100 font-outfit">{finalReport.overallScore}</span>
                        <span className="text-zinc-500 text-xs block">/ 100</span>
                      </div>
                    </div>
                  </div>
                  <span className="inline-block px-3 py-1 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 rounded-full font-outfit">
                    {finalReport.candidateStatus}
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-2">Completed {finalReport.completedAt}</p>
                </div>

                <div className="md:col-span-8 glass-card rounded-2xl p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 font-outfit">AI ASSESSMENT</h3>
                    <p className="text-sm text-zinc-300 leading-relaxed italic mb-4">
                      &ldquo;{finalReport.aiAssessment}&rdquo;
                    </p>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-zinc-800/60">
                    <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/80">
                      <p className="text-[10px] text-zinc-500 uppercase font-semibold">Technical Core</p>
                      <p className="text-base font-bold text-indigo-400 mt-0.5">{finalReport.scoreBreakdown.technicalCorrectness}%</p>
                    </div>
                    <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/80">
                      <p className="text-[10px] text-zinc-500 uppercase font-semibold">System Design</p>
                      <p className="text-base font-bold text-violet-400 mt-0.5">{finalReport.scoreBreakdown.systemDesign}%</p>
                    </div>
                    <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/80">
                      <p className="text-[10px] text-zinc-500 uppercase font-semibold">Problem Solving</p>
                      <p className="text-base font-bold text-emerald-400 mt-0.5">{finalReport.scoreBreakdown.problemSolving}%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Score Breakdown Bars & Qualitative Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Score Breakdown Bars */}
                <div className="lg:col-span-6 glass-card rounded-2xl p-6 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-outfit mb-4">
                    SCORE BREAKDOWN
                  </h3>

                  {[
                    { label: 'Technical Correctness', val: finalReport.scoreBreakdown.technicalCorrectness },
                    { label: 'Problem Solving', val: finalReport.scoreBreakdown.problemSolving },
                    { label: 'System Design', val: finalReport.scoreBreakdown.systemDesign },
                    { label: 'Architecture', val: finalReport.scoreBreakdown.architecture },
                    { label: 'Communication', val: finalReport.scoreBreakdown.communication },
                    { label: 'Depth', val: finalReport.scoreBreakdown.depth },
                    { label: 'Trade-offs', val: finalReport.scoreBreakdown.tradeoffs },
                  ].map((dim, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-300 font-medium">{dim.label}</span>
                        <span className="font-mono text-indigo-400 font-semibold">{dim.val}%</span>
                      </div>
                      <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
                          style={{ width: `${dim.val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Strengths & Improvements */}
                <div className="lg:col-span-6 space-y-6">
                  {/* Strengths */}
                  <div className="glass-card rounded-2xl p-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 font-outfit mb-3 flex items-center space-x-1.5">
                      <span>✓</span>
                      <span>STRENGTHS</span>
                    </h3>
                    <ul className="space-y-2 text-xs text-zinc-300">
                      {finalReport.strengths.map((str, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <span className="text-emerald-400 mt-0.5">✓</span>
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Areas to Improve */}
                  <div className="glass-card rounded-2xl p-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 font-outfit mb-3 flex items-center space-x-1.5">
                      <span>•</span>
                      <span>AREAS TO IMPROVE</span>
                    </h3>
                    <ul className="space-y-2 text-xs text-zinc-300">
                      {finalReport.areasToImprove.map((imp, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <span className="text-amber-400 mt-0.5">•</span>
                          <span>{imp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommended Topics */}
                  <div className="glass-card rounded-2xl p-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-outfit mb-3 flex items-center space-x-1.5">
                      <span>→</span>
                      <span>RECOMMENDED TOPICS</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {finalReport.recommendedTopics.map((top, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 text-xs font-medium text-indigo-300 bg-indigo-950/40 border border-indigo-900/50 rounded-lg"
                        >
                          &rarr; {top}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Graph Inspector View */
            graph && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card rounded-2xl p-6 flex flex-col">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4 font-outfit">Memory Graph Topology</h3>

                  <div className="relative flex-grow min-h-[320px] bg-zinc-950/40 border border-zinc-900 rounded-xl flex items-center justify-center p-4 overflow-hidden">
                    <div className="relative w-full max-w-lg h-full flex flex-col items-center justify-center py-6">
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
                        <span className="text-xs font-semibold tracking-wide text-zinc-200">{graph.entity.name}</span>
                        <span className="text-[10px] text-zinc-500 mt-0.5 font-mono">Score: {graph.entity.knot_score}</span>
                      </button>

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
                              <span className="text-[10px] font-medium text-zinc-200 line-clamp-2">{neighbor.peer}</span>
                              <span className="text-[8px] text-zinc-500 uppercase mt-0.5">{neighbor.intent_meta.edge_kind}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-1 glass-card rounded-2xl p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-zinc-300 font-outfit mb-4">Memory Node Inspector</h3>
                    {selectedNode && (
                      <div className="space-y-4 animate-fade-in text-xs">
                        <div>
                          <p className="text-zinc-500 uppercase">Target Node</p>
                          <p className="text-sm font-bold text-indigo-400 mt-0.5">{selectedNode.peer}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500 uppercase">Fact / Observation</p>
                          <p className="text-zinc-300 mt-1 leading-relaxed bg-zinc-900/40 p-2.5 rounded-lg">
                            {selectedNode.fact}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          )}
        </section>
      )}

      {/* STAGE 5: EVALUATION FAILED FALLBACK */}
      {stage === 'failed' && (
        <section className="relative z-10 w-full max-w-xl my-auto glass-card rounded-2xl p-8 border border-zinc-800 shadow-2xl text-center animate-slide-up">
          <div className="w-16 h-16 rounded-full bg-amber-950/60 border-2 border-amber-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-500/20">
            <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-zinc-100 font-outfit mb-2">
            Your interview was saved successfully.
          </h2>
          <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
            AI evaluation is temporarily unavailable due to high system demand. Your responses are securely preserved in the database.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={retryEvaluation}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-500/20"
            >
              Retry Evaluation
            </button>
            <button
              onClick={restart}
              className="px-4 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium transition-all"
            >
              Back to Home
            </button>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-6xl text-center py-4 border-t border-zinc-900/60 mt-8">
        <p className="text-[10px] text-zinc-600">
          The Interview Agent v2.5 &bull; AI Evaluation Engine &amp; Live Proctoring Protocol.
        </p>
      </footer>
    </main>
  );
}
