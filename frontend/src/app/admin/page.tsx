'use client';

import React, { useState, useEffect } from 'react';
import { getAdminCandidates, interviewApi, AdminCandidateItem, AiHealthResponse } from '@/lib/api';
import Link from 'next/link';

export default function AdminPage() {
  const [candidates, setCandidates] = useState<AdminCandidateItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'clean' | 'flagged'>('all');
  const [selectedCandidate, setSelectedCandidate] = useState<AdminCandidateItem | null>(null);
  const [aiHealth, setAiHealth] = useState<AiHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const [candData, healthData] = await Promise.all([
        getAdminCandidates(),
        interviewApi.getAiHealth(),
      ]);
      setCandidates(candData);
      setAiHealth(healthData);
      setIsLoading(false);
    }
    loadData();
  }, []);

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
      <header className="relative z-10 w-full max-w-6xl flex items-center justify-between py-4 border-b border-zinc-800/60 mb-8">
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
            <p className="text-xs text-zinc-500">Evaluation Engine Health &amp; Candidate Audits</p>
          </div>
        </div>

        <Link
          href="/"
          className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-all flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Simulator</span>
        </Link>
      </header>

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
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-900/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>Healthy</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono mt-1">{p.latencyMs}ms</span>
                </div>
              </div>
            ))}

            {/* Models */}
            {aiHealth.models.slice(0, 2).map((m, idx) => (
              <div key={idx} className="p-3.5 bg-zinc-900/50 rounded-xl border border-zinc-800/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-indigo-300 font-mono">{m.modelId}</p>
                  <p className="text-[10px] text-zinc-500">{m.provider}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-900/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>Active</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono mt-1">{m.latencyMs}ms</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Metrics Cards Grid */}
      <section className="relative z-10 w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider font-outfit">Total Candidates</p>
            <h2 className="text-3xl font-extrabold text-zinc-100 mt-1 font-outfit">{totalCandidates}</h2>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-950/50 border border-indigo-900/50 flex items-center justify-center text-indigo-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider font-outfit">Average System Score</p>
            <h2 className="text-3xl font-extrabold text-indigo-400 mt-1 font-outfit">{avgSystemScore}/100</h2>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-950/50 border border-emerald-900/50 flex items-center justify-center text-emerald-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider font-outfit">Flagged Proctoring Sessions</p>
            <h2 className="text-3xl font-extrabold text-red-400 mt-1 font-outfit">{flaggedCount}</h2>
          </div>
          <div className="h-12 w-12 rounded-xl bg-red-950/50 border border-red-900/50 flex items-center justify-center text-red-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
      </section>

      {/* Candidate Table Controls */}
      <section className="relative z-10 w-full max-w-6xl glass-card rounded-2xl p-6 border border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate by name, email, or role..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-200 text-sm focus:border-indigo-500 outline-none"
            />
            <svg className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterStatus === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              All Statuses
            </button>
            <button
              onClick={() => setFilterStatus('clean')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterStatus === 'clean'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              Clean Integrity
            </button>
            <button
              onClick={() => setFilterStatus('flagged')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterStatus === 'flagged'
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              Flagged Warning
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                <th className="py-3 px-4">Candidate</th>
                <th className="py-3 px-4">Target Role</th>
                <th className="py-3 px-4 text-center">Sessions</th>
                <th className="py-3 px-4 text-center">Avg Score</th>
                <th className="py-3 px-4 text-center">Proctoring Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-sm">
              {filteredCandidates.map((candidate) => (
                <tr key={candidate.id} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="py-3.5 px-4 flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-full bg-zinc-900 border border-zinc-700 overflow-hidden flex items-center justify-center shrink-0">
                      {candidate.avatarUrl ? (
                        <img src={candidate.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-indigo-400">{candidate.fullName.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-200">{candidate.fullName}</p>
                      <p className="text-xs text-zinc-500">{candidate.email}</p>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300 text-xs font-medium">{candidate.targetRole}</td>
                  <td className="py-3.5 px-4 text-center text-zinc-300 font-mono text-xs">{candidate.totalSessions}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-block px-2.5 py-1 text-xs font-bold text-indigo-400 bg-indigo-950/40 border border-indigo-900/50 rounded-md">
                      {candidate.avgScore}/100
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {candidate.integrityStatus === 'flagged' ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-semibold text-red-400 bg-red-950/40 border border-red-900/50 rounded-full">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                        <span>Flagged ({candidate.warningCount} Warnings)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 rounded-full">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span>Clean Pass</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedCandidate(candidate)}
                      className="px-3 py-1.5 text-xs font-medium text-indigo-400 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-900/50 rounded-lg transition-all"
                    >
                      View Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Candidate Inspector Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl glass-card rounded-2xl p-6 md:p-8 border border-zinc-800 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setSelectedCandidate(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center space-x-4 mb-6 pb-4 border-b border-zinc-800">
              <div className="h-14 w-14 rounded-full bg-zinc-900 border-2 border-indigo-500 overflow-hidden flex items-center justify-center">
                {selectedCandidate.avatarUrl ? (
                  <img src={selectedCandidate.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-indigo-400">{selectedCandidate.fullName.charAt(0)}</span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-100 font-outfit">{selectedCandidate.fullName}</h2>
                <p className="text-xs text-zinc-400">{selectedCandidate.email} &bull; {selectedCandidate.targetRole}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                  <p className="text-xs text-zinc-500">Overall Assessment Score</p>
                  <p className="text-2xl font-bold text-indigo-400 mt-1">{selectedCandidate.avgScore}/100</p>
                </div>
                <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                  <p className="text-xs text-zinc-500">Proctoring Integrity</p>
                  <p className={`text-lg font-bold mt-1 ${selectedCandidate.integrityStatus === 'flagged' ? 'text-red-400' : 'text-emerald-400'}`}>
                    {selectedCandidate.integrityStatus.toUpperCase()} ({selectedCandidate.warningCount} Warnings)
                  </p>
                </div>
              </div>

              {/* Proctoring Timeline Event Log */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Proctoring Warning Timeline</h3>
                <div className="space-y-2">
                  {selectedCandidate.warningCount > 0 ? (
                    <div className="p-3 bg-red-950/30 border border-red-900/40 rounded-xl text-xs text-red-300 flex items-start space-x-2">
                      <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="font-semibold">Off-Screen Eye Movement Detected (Turn 3)</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Candidate looked away from screen for &gt; 3 seconds.</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 italic">No proctoring anomalies detected during the interview session.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
