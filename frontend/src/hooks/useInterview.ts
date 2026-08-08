'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  interviewApi,
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
      const res = await interviewApi.startInterview({ candidateId, candidateName: name });
      setSessionId(res.sessionId);
      setTotalQuestions(res.totalQuestions || 8);
      setCurrentTopic(res.currentTopic || 'System & Architecture Fundamentals');
      setQuestionIndex(1);
      setStage('chat');
      addBubble('agent', res.firstQuestion, res.currentTopic || 'System Architecture', 1);
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

      // Add user's answer immediately to dialogue
      addBubble('user', answer);
      setIsTyping(true);

      try {
        const res = await interviewApi.submitAnswer(sessionId, answer, questionIndex - 1);
        
        // Confirm answer is saved
        setSubmissionState('saved');
        setDraftText(''); // Clear draft safely only after successful save

        // Trigger background evaluation polling
        startEvaluationPolling(sessionId);

        // Advance question progress
        const nextQ = questionIndex + 1;
        setQuestionIndex(Math.min(nextQ, totalQuestions));
        if (res.currentTopic) setCurrentTopic(res.currentTopic);

        // Add subtle delay before agent speaks
        await new Promise(r => setTimeout(r, 650));
        addBubble('agent', res.reply, res.currentTopic, nextQ);

        if (res.isFinished || nextQ > totalQuestions) {
          setIsFinished(true);
        }

        setTimeout(() => setSubmissionState('idle'), 3000);
        return true;
      } catch (e) {
        setSubmissionState('error');
        setError(e instanceof Error ? e.message : 'AI service is temporarily busy. Your answer draft is preserved.');
        return false;
      } finally {
        setIsTyping(false);
      }
    },
    [sessionId, questionIndex, totalQuestions, startEvaluationPolling]
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
