import { useState, useRef, useEffect } from "react";
import type { FormEvent } from "react";
import {
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Check,
  Copy,
  Layers,
  Square,
} from "lucide-react";
import { post } from "../api";
import type { Thread, Answer, Source } from "../types";
export default function Conversation({
  thread,
  sources,
  mode,
  onAnswered,
  onSource,
}: {
  thread: Thread | null;
  sources: Source[];
  mode: "live" | "demo";
  onAnswered: (
    question: string,
    result: Answer,
    thread: Thread | null,
  ) => Promise<void>;
  onSource: (id: string) => void;
}) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const [copied, setCopied] = useState("");
  const controller = useRef<AbortController | null>(null);
  const draftThread = useRef<Thread | null>(null);
  const request = useRef({ question: "", id: crypto.randomUUID() });
  useEffect(() => () => controller.current?.abort(), []);
  async function submit(e?: FormEvent, text = question) {
    e?.preventDefault();
    if (
      busy ||
      text.trim().length < 3 ||
      !sources.length ||
      (mode === "live" && !consent)
    )
      return;
    setBusy(true);
    setError("");
    controller.current = new AbortController();
    const timer = setTimeout(() => controller.current?.abort(), 35000);
    let current = thread ?? draftThread.current;
    try {
      if (!current) {
        current = await post<Thread>("/threads", { title: text.slice(0, 70) });
        draftThread.current = current;
      }
      if (request.current.question !== text)
        request.current = { question: text, id: crypto.randomUUID() };
      const result = await post<Answer>(
        "/threads/" + current.id + "/questions",
        { question: text, requestId: request.current.id, consent },
        controller.current.signal,
      );
      await onAnswered(text, result, current);
      setQuestion("");
      request.current = { question: "", id: crypto.randomUUID() };
    } catch (e) {
      setError(
        (e as Error).name === "AbortError"
          ? "Request stopped. Your question is still here."
          : (e as Error).message,
      );
      setQuestion(text);
    } finally {
      clearTimeout(timer);
      setBusy(false);
      controller.current = null;
    }
  }
  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      setError("Clipboard unavailable. Select the answer text to copy it.");
    }
  }
  const suggestions = [
    "What is included in the first release?",
    "When is the pilot launch?",
    "Why did the team reject a vector database?",
  ];
  return (
    <section className="conversation" aria-labelledby="conversation-title">
      <div className="conversation-heading">
        <div>
          <p className="eyebrow">RESEARCH DESK</p>
          <h1 id="conversation-title">
            {thread?.messages.length ? thread.title : "Connect the dots."}
          </h1>
        </div>
        <span className="quiet-badge">
          <span /> {mode === "demo" ? "Demo evidence" : "Grounded AI"}
        </span>
      </div>
      <div className="messages" aria-live="polite" aria-busy={busy}>
        {!thread?.messages.length ? (
          <div className="conversation-empty">
            <div className="empty-mark">
              <Layers size={30} strokeWidth={1.4} />
            </div>
            <p className="eyebrow">AN ANSWER IS ONLY AS GOOD AS ITS EVIDENCE</p>
            <h2>
              Your notes have answers.
              <br />
              <em>Let’s find them.</em>
            </h2>
            <p>
              Ask a question across your sources.
              <br />
              Every answer comes with a trail back to the original.
            </p>
            <div className="suggestions">
              {suggestions.map((s, i) => (
                <button
                  key={s}
                  disabled={
                    busy || !sources.length || (mode === "live" && !consent)
                  }
                  onClick={() => {
                    setQuestion(s);
                    void submit(undefined, s);
                  }}
                >
                  <span className="suggestion-number">0{i + 1}</span>
                  {s}
                  <ArrowUpRight size={16} />
                </button>
              ))}
            </div>
            {!sources.length && (
              <p className="empty-hint">
                Add your first source using the Source library panel.
              </p>
            )}
          </div>
        ) : (
          thread.messages.map((m) => (
            <article key={m.id} className={"message " + m.role}>
              <div className="message-label">
                {m.role === "user" ? "YOU" : "BRIEFCASE"}
                {m.result && (
                  <span>
                    {m.result.mode === "demo"
                      ? "DETERMINISTIC DEMO"
                      : "AI · CHECK THE EVIDENCE"}
                  </span>
                )}
              </div>
              <p className="message-content">{m.content}</p>
              {m.result && (
                <>
                  <div className="citations">
                    {m.result.citations.map((c, i) => (
                      <details key={c.chunkId}>
                        <summary>
                          <span className="citation-number">{i + 1}</span>
                          <BookOpen size={14} />
                          {c.title}
                        </summary>
                        <blockquote>{c.quote}</blockquote>
                        <button
                          className="text-button"
                          onClick={() => onSource(c.sourceId)}
                        >
                          Open original source <ArrowUpRight size={13} />
                        </button>
                      </details>
                    ))}
                  </div>
                  <div className="answer-footer">
                    <span>
                      {m.result.insufficient
                        ? "Evidence incomplete"
                        : `${m.result.citations.length} cited excerpts`}{" "}
                      · {m.result.latencyMs} ms
                      {m.result.mode === "live"
                        ? ` · ${m.result.tokens} tokens`
                        : ""}
                    </span>
                    <button
                      className="icon-button"
                      aria-label="Copy answer"
                      onClick={() => copy(m.id, m.content)}
                    >
                      {copied === m.id ? (
                        <Check size={14} />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                </>
              )}
            </article>
          ))
        )}
        {busy && (
          <p className="pending">
            <span className="loading-dot" />{" "}
            {mode === "demo"
              ? "Finding relevant excerpts…"
              : "Retrieving sources and checking the answer…"}
          </p>
        )}
      </div>
      <div className="composer-wrap">
        {mode === "live" && (
          <label className="consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />{" "}
            Send my question and relevant excerpts to OpenAI. I understand
            generated answers need review.
          </label>
        )}
        <form className="composer" onSubmit={submit}>
          <label className="sr-only" htmlFor="question">
            Ask a question about your sources
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={
              sources.length
                ? "Ask your sources a question…"
                : "Add a source to get started…"
            }
            maxLength={1200}
            rows={2}
            disabled={!sources.length}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          {busy ? (
            <button
              type="button"
              className="send"
              aria-label="Stop answer generation"
              onClick={() => controller.current?.abort()}
            >
              <Square size={17} />
            </button>
          ) : (
            <button
              className="send"
              aria-label="Ask question"
              disabled={
                question.trim().length < 3 ||
                !sources.length ||
                (mode === "live" && !consent)
              }
            >
              <ArrowUp size={21} />
            </button>
          )}
        </form>
        <div className="composer-meta">
          <span>
            {mode === "demo"
              ? "Demo previews quote sources. No AI provider is called."
              : "Source-grounded, not infallible. Always review citations."}
          </span>
          <span>{question.length}/1200</span>
        </div>
        <p role="alert" className="error">
          {error}
        </p>
      </div>
    </section>
  );
}
