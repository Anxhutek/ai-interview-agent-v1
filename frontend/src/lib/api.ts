export interface StartRequest {
  candidateId: string;
  candidateName: string;
  curriculum?: string;
}

export interface StartResponse {
  sessionId: string;
  firstQuestion: string;
}

export interface MessageRequest {
  sessionId: string;
  message: string;
}

export interface MessageResponse {
  reply: string;
  isFinished: boolean;
}

export interface FeedbackResponse {
  feedback: string;
  score: number;
  distilledProfile: string;
  graph?: CandidateGraph;
}

export interface CandidateGraph {
  entity: {
    uuid: string;
    name: string;
    summary: string;
    knot_narrative: string;
    knot_score: number;
  };
  neighbors: Array<{
    peer: string;
    direction: string;
    fact: string;
    intent_meta: {
      edge_kind: string;
      cognitive_pattern: string;
      why_connected: string;
    };
  }>;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Mock interview state for offline fallback
const MOCK_QUESTIONS = [
  "Welcome! Let's start the interview. Can you describe your experience with modern React features, specifically React 19's Server Actions and client-side transitions?",
  "How do you handle state management in large-scale Next.js applications? Do you prefer Zustand, Redux, or built-in React hooks, and why?",
  "Next.js App Router relies heavily on Server and Client Components. How do you structure your components to minimize client-side bundle size?",
  "What techniques do you use to optimize Core Web Vitals (like LCP and CLS) in a Next.js application?",
  "Tailwind CSS v4 introduces a CSS-first configuration. How do you customize themes, utility variables, and manage responsive designs using Tailwind v4?",
  "How do you handle API integration, error boundaries, and loading states when fetching data dynamically in Next.js?",
  "What is your strategy for testing Next.js applications? Do you write Jest unit tests, or do you prefer E2E testing with Playwright?",
  "Great. Finally, how do you secure environment variables and handle authentication (e.g., JWT, OAuth, or Clerk) on the frontend?"
];

let mockSessionTurns = 0;
let mockCandidateName = "Candidate";

export async function startInterview(req: StartRequest): Promise<StartResponse> {
  mockCandidateName = req.candidateName;
  mockSessionTurns = 0;

  try {
    const res = await fetch(`${BASE_URL}/api/interview/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error('API server returned error');
    return await res.json();
  } catch (error) {
    console.warn("Using offline mock fallback for startInterview:", error);
    // Offline simulation
    return {
      sessionId: `mock-session-${Date.now()}`,
      firstQuestion: MOCK_QUESTIONS[0]
    };
  }
}

export async function sendMessage(req: MessageRequest): Promise<MessageResponse> {
  try {
    const res = await fetch(`${BASE_URL}/api/interview/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error('API server returned error');
    return await res.json();
  } catch (error) {
    console.warn("Using offline mock fallback for sendMessage:", error);
    mockSessionTurns += 1;
    const isFinished = mockSessionTurns >= MOCK_QUESTIONS.length - 1;
    const nextQuestion = isFinished 
      ? "Thank you! That completes our interview. Generating your feedback dashboard now..." 
      : MOCK_QUESTIONS[mockSessionTurns];
    
    return {
      reply: nextQuestion,
      isFinished
    };
  }
}

export async function getFeedback(sessionId: string): Promise<FeedbackResponse> {
  try {
    const res = await fetch(`${BASE_URL}/api/interview/feedback?sessionId=${sessionId}`);
    if (!res.ok) throw new Error('API server returned error');
    return await res.json();
  } catch (error) {
    console.warn("Using offline mock fallback for getFeedback:", error);
    
    // Simulate Breeth API graph distillation narrative
    return {
      score: 87,
      feedback: `The candidate (${mockCandidateName}) showed exceptional capability in architectural patterns. They articulated solid logic for choosing React Server Components and demonstrated structural understanding of state synchronization across hydration boundaries. Highly capable in implementing responsive layout and modern glassmorphism styling.`,
      distilledProfile: `A highly skilled React/Next.js developer who excels in front-end architecture, rendering optimizations, and styling with Tailwind v4. Displays strong cognitive alignment with responsive performance and modern design principles.`,
      graph: {
        entity: {
          uuid: "mock-uuid-john-doe",
          name: mockCandidateName,
          summary: "Frontend-heavy engineer with strong focus on Next.js hydration optimizations.",
          knot_narrative: `${mockCandidateName} exhibits consistent preference for tail-latency optimizations and structured error handling. Bet on React Server Actions for production pipelines.`,
          knot_score: 87.0
        },
        neighbors: [
          {
            peer: "React Server Components",
            direction: "out",
            fact: `${mockCandidateName} prefers RSC for fetching static layouts and SEO optimization.`,
            intent_meta: {
              edge_kind: "preference",
              cognitive_pattern: "performance optimization",
              why_connected: "RSC minimizes client bundle sizes and improves initial page load speed."
            }
          },
          {
            peer: "Tailwind CSS v4",
            direction: "out",
            fact: `${mockCandidateName} shows preference for CSS-first configuration and modern CSS custom variables.`,
            intent_meta: {
              edge_kind: "preference",
              cognitive_pattern: "styling workflow",
              why_connected: "Tailwind CSS v4 CSS-first configuration is preferred for clean theme extensions."
            }
          },
          {
            peer: "Zustand State Management",
            direction: "out",
            fact: `${mockCandidateName} uses Zustand for client-side ephemeral state and avoids Redux boilerplate.`,
            intent_meta: {
              edge_kind: "tool selection",
              cognitive_pattern: "developer velocity",
              why_connected: "Zustand is chosen for lightweight API, ease of hook integration, and zero boilerplate."
            }
          }
        ]
      }
    };
  }
}
