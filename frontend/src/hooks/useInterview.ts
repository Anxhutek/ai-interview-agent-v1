import { useState } from 'react';
import { 
  createSession, 
  submitAnswer, 
  getResults, 
  buildClientGraph,
  SessionResponse, 
  QuestionResponse,
  SessionResultsResponse,
  CandidateGraph
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
  
  // Quiz specific states
  const [questions, setQuestions] = useState<QuestionResponse[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Results structures
  const [results, setResults] = useState<SessionResultsResponse | null>(null);
  const [graph, setGraph] = useState<CandidateGraph | null>(null);

  const start = async (name: string, id: string, targetCurriculum: string) => {
    if (!name.trim() || !id.trim()) {
      setError("Please provide a valid Name and Candidate ID.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await createSession({
        role: targetCurriculum,
        domain: 'Frontend Frameworks & System Design',
        difficulty: 'medium',
        num_questions: 5
      });
      
      setCandidateName(name.trim());
      setCandidateId(id.trim());
      setCurriculum(targetCurriculum);
      setSessionId(data.id);
      setQuestions(data.questions);
      setCurrentQuestionIndex(0);
      
      // Present first question
      const firstQText = data.questions[0]?.text || "Welcome! Let's get started. Tell me about your general software engineering background.";
      setMessages([
        {
          id: 'msg-start',
          sender: 'agent',
          text: firstQText,
          timestamp: new Date()
        }
      ]);
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
      const currentQuestion = questions[currentQuestionIndex];
      if (!currentQuestion) throw new Error("No active question context found");

      // Submit answer to the active question
      await submitAnswer(sessionId, {
        question_id: currentQuestion.id,
        answer_text: text.trim()
      });

      // Simulation delay for typing indicator
      if (sessionId.startsWith('mock-')) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      const nextIndex = currentQuestionIndex + 1;
      
      if (nextIndex < questions.length) {
        // Move to the next question
        setCurrentQuestionIndex(nextIndex);
        const nextQ = questions[nextIndex];
        
        const agentMsg: Message = {
          id: `msg-agent-${Date.now()}`,
          sender: 'agent',
          text: nextQ.text,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, agentMsg]);
      } else {
        // All questions answered, compile results
        setIsLoading(true);
        const agentFinishMsg: Message = {
          id: `msg-finish-${Date.now()}`,
          sender: 'agent',
          text: "Thank you! That completes our interview. Generating your feedback dashboard now...",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, agentFinishMsg]);
        
        // Simulation delay
        if (sessionId.startsWith('mock-')) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        const resultsData = await getResults(sessionId);
        setResults(resultsData);
        
        // Build graph representation client-side from results
        const graphData = buildClientGraph(resultsData, candidateName);
        setGraph(graphData);
        
        setStep('feedback');
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit answer.");
    } finally {
      setIsTyping(false);
    }
  };

  const restart = () => {
    setStep('setup');
    setCandidateName('');
    setCandidateId('');
    setSessionId('');
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setMessages([]);
    setResults(null);
    setGraph(null);
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
    results,
    graph,
    turnsCount: currentQuestionIndex,
    totalQuestions: questions.length,
    start,
    send,
    restart
  };
}
