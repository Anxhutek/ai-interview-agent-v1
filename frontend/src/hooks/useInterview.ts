'use client';

import { useState, useCallback } from 'react';
import {
  startInterview,
  sendMessage,
  getFeedback,
  buildBreethGraph,
  type InterviewFeedbackResponse,
  type BreethGraph,
} from '@/lib/api';

// ── Chat Bubble Type ──────────────────────────────

export interface ChatBubble {
  id: string;
  role: 'agent' | 'user';
  text: string;
  timestamp: Date;
}

// ── Interview Stage ───────────────────────────────

export type InterviewStage = 'setup' | 'chat' | 'feedback';

// ── Hook Return ───────────────────────────────────

export interface UseInterviewReturn {
  stage: InterviewStage;
  sessionId: string | null;
  dialogue: ChatBubble[];
  isTyping: boolean;
  error: string | null;
  isFinished: boolean;
  turnCount: number;
  candidateName: string;
  feedback: InterviewFeedbackResponse | null;
  graph: BreethGraph | null;
  beginInterview: (candidateId: string, candidateName: string) => Promise<void>;
  sendAnswer: (message: string) => Promise<void>;
  requestFeedback: () => Promise<void>;
}

// ── Hook Implementation ───────────────────────────

export function useInterview(): UseInterviewReturn {
  const [stage, setStage] = useState<InterviewStage>('setup');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [dialogue, setDialogue] = useState<ChatBubble[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [candidateName, setCandidateName] = useState('');
  const [feedback, setFeedback] = useState<InterviewFeedbackResponse | null>(null);
  const [graph, setGraph] = useState<BreethGraph | null>(null);

  const addBubble = (role: 'agent' | 'user', text: string) => {
    setDialogue(prev => [
      ...prev,
      { id: `${role}-${Date.now()}-${Math.random()}`, role, text, timestamp: new Date() },
    ]);
  };

  // ── Start Interview ─────────────────────────────

  const beginInterview = useCallback(async (candidateId: string, name: string) => {
    setError(null);
    setCandidateName(name);
    setIsTyping(true);
    try {
      const res = await startInterview({ candidateId, candidateName: name });
      setSessionId(res.sessionId);
      setStage('chat');
      addBubble('agent', res.firstQuestion);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start interview');
    } finally {
      setIsTyping(false);
    }
  }, []);

  // ── Send Answer (Multi-Turn Conversational) ─────

  const sendAnswer = useCallback(
    async (message: string) => {
      if (!sessionId) return;
      setError(null);

      // Add user bubble immediately
      addBubble('user', message);
      setIsTyping(true);

      try {
        const res = await sendMessage({ sessionId, message });
        setTurnCount(prev => prev + 1);

        // Simulate brief typing delay for realism
        await new Promise(r => setTimeout(r, 600));
        addBubble('agent', res.reply);

        if (res.isFinished) {
          setIsFinished(true);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to send message');
      } finally {
        setIsTyping(false);
      }
    },
    [sessionId]
  );

  // ── Request Feedback ────────────────────────────

  const requestFeedback = useCallback(async () => {
    if (!sessionId) return;
    setError(null);
    setIsTyping(true);

    try {
      const fb = await getFeedback(sessionId);
      setFeedback(fb);
      setGraph(buildBreethGraph(fb, candidateName, turnCount));
      setStage('feedback');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch feedback');
    } finally {
      setIsTyping(false);
    }
  }, [sessionId, candidateName, turnCount]);

  return {
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
  };
}
