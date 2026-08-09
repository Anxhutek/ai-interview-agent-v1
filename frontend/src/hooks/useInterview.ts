'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  interviewApi,
  sendUnifiedInterviewMessage,
  buildBreethGraph,
  type FinalInterviewReport,
  type EvaluationStatusType,
  type BreethGraph,
} from '@/lib/api';

// ── Chat Bubble Type ──────────────────────────────

export interface ChatBubble {
  id: string;
  role: 'agent' | 'user';
  text: string;
  timestamp: Date;
  topic?: string;
  questionIndex?: number;
}

// ── Interview Stage ───────────────────────────────

export type InterviewStage = 'setup' | 'chat' | 'generating_report' | 'report' | 'failed';
export type SubmissionState = 'idle' | 'saving' | 'saved' | 'error';

// ── Hook Return ───────────────────────────────────

export interface UseInterviewReturn {
  stage: InterviewStage;
  sessionId: string | null;
  dialogue: ChatBubble[];
  isTyping: boolean;
  error: string | null;
  isFinished: boolean;
  questionIndex: number;
  totalQuestions: number;
  currentTopic: string;
  candidateName: string;
  submissionState: SubmissionState;
  evaluationState: EvaluationStatusType;
  draftText: string;
  finalReport: FinalInterviewReport | null;
  graph: BreethGraph | null;
  isPlayingAudio: boolean;
  setDraftText: (val: string) => void;
  beginInterview: (candidateId: string, candidateName: string) => Promise<void>;
  sendAnswer: (answer: string) => Promise<boolean>;
  requestReport: () => Promise<void>;
  retryEvaluation: () => Promise<void>;
  playQuestionAudio: (text: string) => void;
}

// ── Hook Implementation ───────────────────────────

export function useInterview(): UseInterviewReturn {
  const [stage, setStage] = useState<InterviewStage>('setup');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [dialogue, setDialogue] = useState<ChatBubble[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(8);
  const [currentTopic, setCurrentTopic] = useState('System & Architecture Fundamentals');
  const [candidateName, setCandidateName] = useState('');
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
  const [evaluationState, setEvaluationState] = useState<EvaluationStatusType>('pending');
  const [draftText, setDraftText] = useState('');
  const [finalReport, setFinalReport] = useState<FinalInterviewReport | null>(null);
  const [graph, setGraph] = useState<BreethGraph | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up speech synthesis & polling on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const addBubble = (
    role: 'agent' | 'user',
    text: string,
    topic?: string,
    qIdx?: number
  ) => {
    setDialogue(prev => [
      ...prev,
      {
        id: `${role}-${Date.now()}-${Math.random()}`,
        role,
        text,
        timestamp: new Date(),
        topic,
        questionIndex: qIdx,
      },
    ]);
  };

  // ── Start Interview ─────────────────────────────

  const beginInterview = useCallback(async (candidateId: string, name: string) => {
    setError(null);
    setCandidateName(name);
    setIsTyping(true);
    try {
      // Generate a new sessionId and store candidateId for later answers
      const newSessionId = crypto.randomUUID ? crypto.randomUUID() : 'session-' + Date.now();
      setSessionId(newSessionId);
      (window as any).__candidateId = candidateId;

      // POST with no message — backend returns greeting + first question
      const res = await sendUnifiedInterviewMessage(newSessionId, candidateId, '');

      setTotalQuestions(8);
      setCurrentTopic('System & Architecture Fundamentals');
      setQuestionIndex(1);
      setStage('chat');
      addBubble('agent', res.reply, 'System & Architecture Fundamentals', 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to initialize interview');
    } finally {
      setIsTyping(false);
    }
  }, []);

  // ── Poll Evaluation Status in Background ────────

  const startEvaluationPolling = useCallback((sid: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    let attempts = 0;
    pollingRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await interviewApi.getEvaluationStatus(sid);
        setEvaluationState(res.status);
        if (res.status === 'completed' || res.status === 'failed' || attempts > 15) {
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      } catch {
        if (attempts > 5 && pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      }
    }, 4000);
  }, []);

  // ── Send Answer (Safety Flow) ───────────────────

  const sendAnswer = useCallback(
    async (answer: string): Promise<boolean> => {
      if (!sessionId || !answer.trim()) return false;
      setError(null);
      setSubmissionState('saving');

      // Show user bubble immediately
      addBubble('user', answer);
      setIsTyping(true);

      try {
        const candidateId = (window as any).__candidateId || 'c1';
        const res = await sendUnifiedInterviewMessage(sessionId, candidateId, answer);

        setSubmissionState('saved');
        setDraftText('');

        const nextQ = questionIndex + 1;
        setQuestionIndex(Math.min(nextQ, totalQuestions));

        await new Promise(r => setTimeout(r, 500));

        if (res.done && res.feedback) {
          // Interview finished — build report from unified feedback
          const fb = res.feedback as any;
          const score = typeof fb.score === 'number' ? fb.score : 70;
          const status = fb.status || (score >= 75 ? 'Strong Candidate' : score >= 55 ? 'Proficient Candidate' : score >= 40 ? 'Developing Candidate' : 'Needs Improvement');
          addBubble('agent', res.reply, currentTopic, nextQ);
          setIsFinished(true);
          setFinalReport({
            sessionId,
            candidateName,
            overallScore: score,
            candidateStatus: status,
            scoreBreakdown: {
              technicalCorrectness: score,
              problemSolving: Math.max(0, score - 5),
              systemDesign: Math.max(0, score - 3),
              architecture: Math.max(0, score - 7),
              communication: Math.max(0, score + 2),
              depth: Math.max(0, score - 4),
              tradeoffs: Math.max(0, score - 6),
            },
            strengths: fb.strengths || [],
            areasToImprove: fb.gaps || [],
            recommendedTopics: fb.next || [],
            aiAssessment: fb.summary || 'Interview completed.',
            completedAt: new Date().toISOString(),
          });
          setGraph(buildBreethGraph(
            { sessionId, candidateName, overallScore: score, candidateStatus: status, scoreBreakdown: { technicalCorrectness: score, problemSolving: score, systemDesign: score, architecture: score, communication: score, depth: score, tradeoffs: score }, strengths: fb.strengths || [], areasToImprove: fb.gaps || [], recommendedTopics: fb.next || [], aiAssessment: fb.summary || '', completedAt: new Date().toISOString() },
            candidateName,
            totalQuestions
          ));
          await new Promise(r => setTimeout(r, 1200));
          setStage('report');
        } else {
          addBubble('agent', res.reply, currentTopic, nextQ);
        }

        setTimeout(() => setSubmissionState('idle'), 2000);
        return true;
      } catch (e) {
        setSubmissionState('error');
        setError(e instanceof Error ? e.message : 'Network error. Your answer is preserved, please try again.');
        return false;
      } finally {
        setIsTyping(false);
      }
    },
    [sessionId, questionIndex, totalQuestions, currentTopic, candidateName]
  );

  // ── Request Final Report ────────────────────────

  const requestReport = useCallback(async () => {
    if (!sessionId) return;
    setError(null);
    setStage('generating_report');

    try {
      // 1. Complete interview on backend
      await interviewApi.completeInterview(sessionId);

      // 2. Fetch structured final evaluation report
      const report = await interviewApi.getFinalReport(sessionId, candidateName);
      setFinalReport(report);
      setGraph(buildBreethGraph(report, candidateName, totalQuestions));
      
      // Delay slightly for smooth generation transition
      await new Promise(r => setTimeout(r, 1800));
      setStage('report');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI evaluation is temporarily unavailable.');
      setStage('failed');
    }
  }, [sessionId, candidateName, totalQuestions]);

  // ── Retry Evaluation ────────────────────────────

  const retryEvaluation = useCallback(async () => {
    if (!sessionId) return;
    setError(null);
    setStage('generating_report');
    try {
      await interviewApi.retryEvaluation(sessionId);
      const report = await interviewApi.getFinalReport(sessionId, candidateName);
      setFinalReport(report);
      setGraph(buildBreethGraph(report, candidateName, totalQuestions));
      setStage('report');
    } catch {
      setError('AI evaluation is temporarily unavailable. Please try again in a few moments.');
      setStage('failed');
    }
  }, [sessionId, candidateName, totalQuestions]);

  // ── Audio Question Reader (Web Speech API) ───────

  const playQuestionAudio = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    const cleanText = text.replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
  }, [isPlayingAudio]);

  return {
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
  };
}
