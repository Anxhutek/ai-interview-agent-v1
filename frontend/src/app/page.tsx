'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useInterview, Message } from '../hooks/useInterview';

export default function Home() {
  const {
    step,
    candidateName,
    candidateId,
    curriculum,
    sessionId,
    messages,
    isTyping,
    isLoading,
    error,
    results,
    graph,
    turnsCount,
    totalQuestions,
    start,
    send,
    restart,
  } = useInterview();

  // Local state for setup form
  const [formName, setFormName] = useState('');
  const [formId, setFormId] = useState('');
  const [formCurriculum, setFormCurriculum] = useState('Frontend Engineer');

  // Input state for messaging
  const [inputText, setInputText] = useState('');

  // Scroll ref for chat
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Local state for graph detail modal / panel
  const [selectedNode, setSelectedNode] = useState<any>(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Set default selected node for graph details
  useEffect(() => {
    if (graph) {
      setSelectedNode({
        peer: graph.entity.name,
        isRoot: true,
        fact: graph.entity.summary,
        intent_meta: {
          edge_kind: "Candidate Profile",
          cognitive_pattern: "Synthesis of turns",
          why_connected: graph.entity.knot_narrative
        }
      });
    }
  }, [graph]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    await start(formName, formId, formCurriculum);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const textToSend = inputText;
    setInputText('');
    await send(textToSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-between p-4 md:p-8 overflow-hidden bg-[#09090b]">
      {/* Background Radial Glow Effects */}
      <div className="radial-glow top-[-100px] left-[-100px]"></div>
      <div className="radial-glow-secondary bottom-[-100px] right-[-100px]"></div>

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
            <p className="text-xs text-zinc-500">Gemini & Breeth Memory Layer Protocol</p>
          </div>
        </div>

        {step !== 'setup' && (
          <button
            onClick={restart}
            className="px-3.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-all flex items-center space-x-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.213 6H16" />
            </svg>
            <span>Reset Session</span>
          </button>
        )}
      </header>

      {/* STAGE 1: SETUP */}
      {step === 'setup' && (
        <section className="relative z-10 w-full max-w-xl my-auto animate-slide-up">
          <div className="glass-card rounded-2xl p-6 md:p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-100 font-outfit">Setup Interview Session</h2>
              <p className="text-sm text-zinc-400 mt-1">Configure candidate parameters to initialize memory episodes.</p>
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
                  placeholder="e.g. John Doe"
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
                  placeholder="e.g. john.doe@example.com"
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-zinc-200 placeholder-zinc-600 transition-all text-sm"
                />
              </div>

              <div>
                <label htmlFor="curriculum" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Target Evaluation Curriculum
                </label>
                <div className="relative">
                  <select
                    id="curriculum"
                    value={formCurriculum}
                    onChange={(e) => setFormCurriculum(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-zinc-200 appearance-none transition-all text-sm cursor-pointer"
                  >
                    <option value="Frontend Engineer">Frontend Engineer (React 19, Next.js, CSS v4)</option>
                    <option value="Backend Engineer">Backend Engineer (FastAPI, Python, SQL, Redis)</option>
                    <option value="Fullstack Engineer">Fullstack Engineer (TypeScript, DB design, API scaling)</option>
                    <option value="DevOps & Cloud Engineer">DevOps & Cloud Engineer (Docker, CI/CD, Terraform)</option>
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-zinc-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-6 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-medium text-sm transition-all flex items-center justify-center shadow-lg shadow-indigo-500/20 active:scale-[0.99] disabled:opacity-50 font-sans"
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
                  <span>Start Interview Simulation</span>
                )}
              </button>
            </form>
          </div>
        </section>
      )}

      {/* STAGE 2: ACTIVE CHAT */}
      {step === 'chat' && (
        <section className="relative z-10 w-full max-w-6xl flex-grow grid grid-cols-1 lg:grid-cols-4 gap-6 animate-slide-up">
          {/* Left panel: Info & Statistics */}
          <div className="lg:col-span-1 flex flex-col space-y-4">
            {/* Active Candidate Details */}
            <div className="glass-card rounded-xl p-4 flex flex-col space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-outfit">Session Context</h3>
              <div>
                <p className="text-xs text-zinc-400">Candidate Name</p>
                <p className="text-sm font-semibold text-zinc-100">{candidateName}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">ID / Email</p>
                <p className="text-xs font-mono text-zinc-300 break-all">{candidateId}</p>
              </div>
              <div className="pt-2 border-t border-zinc-800/60">
                <p className="text-xs text-zinc-400">Evaluation Core</p>
                <span className="inline-block mt-1 px-2.5 py-1 text-xs font-medium text-indigo-400 bg-indigo-950/40 border border-indigo-900/50 rounded-full">
                  {curriculum}
                </span>
              </div>
            </div>

            {/* Session Stats */}
            <div className="glass-card rounded-xl p-4 flex flex-col space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-outfit">Metrics</h3>
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-zinc-400">Breeth Memory Layer</span>
                  <span className="text-green-400 font-medium animate-pulse flex items-center space-x-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400"></span>
                    <span>Synced</span>
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(((turnsCount + 1) / totalQuestions) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 pt-2 text-center">
                <div className="p-2 bg-zinc-900/50 border border-zinc-800/40 rounded-lg">
                  <p className="text-xs text-zinc-400">Active Question</p>
                  <p className="text-lg font-bold text-zinc-200 mt-0.5">{turnsCount + 1}</p>
                </div>
                <div className="p-2 bg-zinc-900/50 border border-zinc-800/40 rounded-lg">
                  <p className="text-xs text-zinc-400">Total Questions</p>
                  <p className="text-lg font-bold text-zinc-200 mt-0.5">{totalQuestions}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: Chat Box */}
          <div className="lg:col-span-3 glass-card rounded-xl flex flex-col h-[65vh] md:h-[70vh] overflow-hidden">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-zinc-800/60 bg-zinc-900/40 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-indigo-500 animate-ping"></div>
                <h3 className="font-semibold text-sm text-zinc-200">Interview Conversation Loop</h3>
              </div>
              <span className="text-xs text-zinc-500 font-sans">
                Question {turnsCount + 1} of {totalQuestions}
              </span>
            </div>

            {/* Chat Scrollbox */}
            <div className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar bg-zinc-950/20">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'candidate' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div className={`flex items-start space-x-2.5 max-w-[85%] md:max-w-[75%]`}>
                    {msg.sender === 'agent' && (
                      <div className="h-8 w-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex flex-col">
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm ${
                          msg.sender === 'candidate'
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
                      <span className="h-2 w-2 bg-zinc-500 rounded-full typing-dot"></span>
                      <span className="h-2 w-2 bg-zinc-500 rounded-full typing-dot"></span>
                      <span className="h-2 w-2 bg-zinc-500 rounded-full typing-dot"></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-zinc-800/60 bg-zinc-900/30 flex items-end space-x-3">
              <div className="flex-grow relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your response... (Press Enter to send)"
                  disabled={isTyping || isLoading}
                  rows={2}
                  className="w-full bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-lg py-2.5 px-4 text-sm text-zinc-200 placeholder-zinc-600 resize-none custom-scrollbar transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={!inputText.trim() || isTyping || isLoading}
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
      {step === 'feedback' && results && (
        <section className="relative z-10 w-full max-w-6xl flex-grow flex flex-col space-y-6 animate-slide-up">
          {/* Top Level: Score and Summary Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Score circle card */}
            <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center text-center">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4 font-outfit">Overall Score</h3>
              <div className="relative flex items-center justify-center">
                {/* Visual Radial Ring */}
                <div className="w-36 h-36 rounded-full border-4 border-zinc-800 flex items-center justify-center">
                  <div className="absolute inset-0.5 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin-slow"></div>
                  <div className="text-center">
                    <span className="text-4xl font-extrabold text-zinc-100">{Math.round(results.overall_score)}</span>
                    <span className="text-zinc-500 text-sm">/100</span>
                  </div>
                </div>
              </div>
              <span className="inline-block mt-4 px-3 py-1 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 rounded-full">
                Evaluation Complete
              </span>
            </div>

            {/* Narrative synthesis */}
            <div className="glass-card rounded-2xl p-6 md:col-span-2 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 font-outfit">Cognitive Profile Synthesis</h3>
                <h4 className="text-lg font-bold text-zinc-100 font-outfit mb-3">
                  {graph?.entity.summary || "Candidate showing backend leaning with focus on performance."}
                </h4>
                <p className="text-sm text-zinc-400 leading-relaxed">{results.summary}</p>
              </div>
              <div className="flex items-center space-x-2.5 pt-4 mt-4 border-t border-zinc-800/40 text-xs text-zinc-500">
                <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Interactive network elements are distilled from candidate memory traces.</span>
              </div>
            </div>
          </div>

          {/* Interactive Graph Details Section */}
          {graph && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Interactive Network Map Visualizer */}
              <div className="lg:col-span-2 glass-card rounded-2xl p-6 flex flex-col">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4 font-outfit">Breeth Memory Graph</h3>
                
                {/* Visual Graph Area */}
                <div className="relative flex-grow min-h-[300px] bg-zinc-950/40 border border-zinc-900 rounded-xl flex items-center justify-center p-4 overflow-hidden">
                  
                  {/* Grid overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-10"></div>
                  
                  {/* Nodes diagram */}
                  <div className="relative w-full max-w-md h-full flex flex-col items-center justify-center py-6">
                    {/* Root Node (Candidate) */}
                    <button
                      onClick={() => setSelectedNode({
                        peer: graph.entity.name,
                        isRoot: true,
                        fact: graph.entity.summary,
                        intent_meta: {
                          edge_kind: "Profile Summary",
                          cognitive_pattern: "Aggregated intent",
                          why_connected: graph.entity.knot_narrative
                        }
                      })}
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
                      <span className="text-[10px] text-zinc-500 mt-0.5 font-mono">Candidate ID</span>
                    </button>

                    {/* Connection lines using simple relative styles */}
                    <div className="relative w-full grid grid-cols-5 gap-2 mt-16 z-10">
                      {graph.neighbors.map((neighbor, index) => {
                        const isSelected = selectedNode?.peer === neighbor.peer;
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
                            <span className="text-[10px] font-medium text-zinc-200 line-clamp-1">{neighbor.peer}</span>
                            <span className="text-[8px] text-zinc-500 uppercase mt-0.5 tracking-wider">{neighbor.intent_meta.edge_kind}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Background SVG paths linking nodes */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" xmlns="http://www.w3.org/2000/svg">
                      <line x1="50%" y1="35%" x2="10%" y2="70%" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 4" />
                      <line x1="50%" y1="35%" x2="30%" y2="70%" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 4" />
                      <line x1="50%" y1="35%" x2="50%" y2="70%" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 4" />
                      <line x1="50%" y1="35%" x2="70%" y2="70%" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 4" />
                      <line x1="50%" y1="35%" x2="90%" y2="70%" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 4" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Edge/Node Inspector Detail Card */}
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
                          <p className="text-xs text-zinc-500 uppercase tracking-wide">Extracted Fact / Answer Feedback</p>
                          <p className="text-sm text-zinc-300 mt-1 leading-relaxed bg-zinc-900/30 border border-zinc-850 p-2.5 rounded-lg max-h-32 overflow-y-auto custom-scrollbar">
                            {selectedNode.fact}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-zinc-500 uppercase tracking-wide">Status / Metric</p>
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
          The Interview Agent v1.0.0 &bull; Powered by Google Gemini 2.0 Flash &amp; Breeth API Distillation Graph.
        </p>
      </footer>
    </main>
  );
}
