import { useState } from 'react';
import { 
  startInterview, 
  sendMessage, 
  getFeedback, 
  FeedbackResponse, 
  StartRequest 
} from '../lib/api';

export interface Message {
  id: string;
  sender: 'agent' | 'candidate';
  text: string;
  timestamp: Date;
}

export type WizardStep = 'setup' | 'chat' | 'feedback';

export function useInterview() {
  const [step, setStep] = useState<WizardStep>('setup');
  const [candidateName, setCandidateName] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [curriculum, setCurriculum] = useState('Frontend Engineer');
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [turnsCount, setTurnsCount] = useState(0);

  const start = async (name: string, id: string, targetCurriculum: string) => {
    if (!name.trim() || !id.trim()) {
      setError("Please provide a valid Name and Candidate ID.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await startInterview({
        candidateId: id.trim(),
        candidateName: name.trim(),
        curriculum: targetCurriculum
      });
      setCandidateName(name.trim());
      setCandidateId(id.trim());
      setCurriculum(targetCurriculum);
      setSessionId(data.sessionId);
      setMessages([
        {
          id: 'msg-start',
          sender: 'agent',
          text: data.firstQuestion,
          timestamp: new Date()
        }
      ]);
      setTurnsCount(0);
      setStep('chat');
    } catch (err: any) {
      setError(err.message || "Failed to start the interview session.");
    } finally {
      setIsLoading(false);
    }
  };

  const send = async (text: string) => {
    if (!text.trim() || isLoading || isTyping) return;
    
    // Add candidate message
    const candidateMsg: Message = {
      id: `msg-cand-${Date.now()}`,
      sender: 'candidate',
      text: text.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, candidateMsg]);
    setIsTyping(true);
    setError(null);

    try {
      // Send candidate's message
      const data = await sendMessage({
        sessionId,
        message: text.trim()
      });

      // Add a small delay for typing effect simulation if it's mock mode
      if (sessionId.startsWith('mock-')) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const agentMsg: Message = {
        id: `msg-agent-${Date.now()}`,
        sender: 'agent',
        text: data.reply,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, agentMsg]);
      setTurnsCount(prev => prev + 1);

      if (data.isFinished) {
        setIsLoading(true);
        // Add a small delay to simulate generation
        if (sessionId.startsWith('mock-')) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
        const feedbackData = await getFeedback(sessionId);
        setFeedback(feedbackData);
        setStep('feedback');
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Failed to send message.");
    } finally {
      setIsTyping(false);
    }
  };

  const restart = () => {
    setStep('setup');
    setCandidateName('');
    setCandidateId('');
    setSessionId('');
    setMessages([]);
    setFeedback(null);
    setTurnsCount(0);
    setError(null);
  };

  return {
    step,
    candidateName,
    candidateId,
    curriculum,
    sessionId,
    messages,
    isTyping,
    isLoading,
    error,
    feedback,
    turnsCount,
    start,
    send,
    restart
  };
}
