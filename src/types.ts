export type User = { id: string; name: string; email: string; demo: boolean };
export type Source = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
};
export type Citation = {
  sourceId: string;
  title: string;
  chunkId: string;
  quote: string;
};
export type Answer = {
  answer: string;
  citations: Citation[];
  insufficient: boolean;
  mode: "demo" | "live";
  latencyMs: number;
  tokens: number;
};
export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  result?: Answer;
  createdAt: string;
};
export type Thread = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
};
export type ThreadSummary = {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
};
export type Page<T> = { items: T[]; hasMore: boolean };
export type Config = {
  demoEnabled: boolean;
  mode: "demo" | "live";
  dailyLimit: number;
};
