export type User = { id: string; name: string; email: string; demo: boolean };
export type Config = {
  demoEnabled: boolean;
  mode: "demo" | "live";
  dailyLimit: number;
  provider: string;
};
export type Profile = {
  role: string;
  level: "early-career" | "mid-level" | "senior";
  focus: "frontend" | "backend" | "full-stack";
  resume: string;
  job: string;
};
export type Review = {
  summary: string;
  strengths: string[];
  improvements: string[];
  evidence: { quote: string; observation: string }[];
  followUp: string | null;
};
export type Turn = {
  requestId: string;
  question: string;
  answer: string;
  kind: "primary" | "follow-up";
  review: Review;
  createdAt: string;
  latencyMs: number;
  tokens: number;
};
export type Interview = {
  id: string;
  profile: Profile;
  questions: { text: string; category: string; contextQuote: string }[];
  cursor: number;
  pendingFollowUp: string | null;
  followUpUsed: boolean;
  turns: Turn[];
  status: "active" | "completed";
  version: number;
  mode: "demo" | "live";
  createdAt: string;
  updatedAt: string;
  currentQuestion: string | null;
  report: {
    completed: boolean;
    answered: number;
    primaryAnswered: number;
    strengths: string[];
    nextSteps: string[];
    disclaimer: string;
  };
};
export type InterviewSummary = {
  id: string;
  role: string;
  focus: string;
  level: string;
  status: "active" | "completed";
  mode: "demo" | "live";
  answered: number;
  createdAt: string;
  updatedAt: string;
};
export type Page<T> = { items: T[]; hasMore: boolean };
