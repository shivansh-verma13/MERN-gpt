import { useEffect, useRef, useState } from "react";
import MediaRoom from "./MediaRoom";
import type { RoomState } from "./MediaRoom";
import type { FormEvent } from "react";
import { ArrowRight, Check, MessageSquare, Square } from "lucide-react";
import type { Interview, Turn } from "../types";
import { post } from "../api";
export function Feedback({
  turn,
  mode,
}: {
  turn: Turn;
  mode: "demo" | "live";
}) {
  return (
    <div className="feedback">
      <div className="feedback-heading">
        <span className="eyebrow">
          {mode === "demo" ? "LOCAL RUBRIC PREVIEW" : "PRACTICE FEEDBACK"}
        </span>
        <span>{turn.latencyMs} ms</span>
      </div>
      <p>{turn.review.summary}</p>
      <div className="feedback-columns">
        <div>
          <h3>What to keep</h3>
          {turn.review.strengths.length ? (
            <ul>
              {turn.review.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              No supported strength identified in this answer yet.
            </p>
          )}
        </div>
        <div>
          <h3>What to sharpen</h3>
          <ul>
            {turn.review.improvements.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </div>
      {turn.review.evidence.map((e, i) => (
        <blockquote key={i}>
          <p>“{e.quote}”</p>
          <cite>{e.observation}</cite>
        </blockquote>
      ))}
    </div>
  );
}
export default function PracticeSession({
  interview,
  provider,
  onChanged,
  onReview,
}: {
  interview: Interview;
  provider: string;
  onChanged: (v: Interview) => void;
  onReview: () => void;
}) {
  const [room, setRoom] = useState<RoomState>({
    locked: interview.format === "simulation",
    busy: false,
    fullscreen: false,
    camera: false,
    microphone: false,
  });
  const [interim, setInterim] = useState("");
  const [answer, setAnswer] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const attempt = useRef({ payload: "", id: crypto.randomUUID() });
  useEffect(() => () => controller.current?.abort(), []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (
      busy ||
      room.locked ||
      room.busy ||
      answer.trim().length < 10 ||
      (interview.mode === "live" && !consent)
    )
      return;
    setBusy(true);
    setError("");
    controller.current = new AbortController();
    const timer = setTimeout(() => controller.current?.abort(), 35000);
    const payload = JSON.stringify({ answer, version: interview.version });
    if (attempt.current.payload !== payload)
      attempt.current = { payload, id: crypto.randomUUID() };
    try {
      onChanged(
        await post<Interview>(
          "/interviews/" + interview.id + "/answers",
          {
            answer,
            version: interview.version,
            requestId: attempt.current.id,
            consent,
            environment: room,
          },
          controller.current.signal,
        ),
      );
      setAnswer("");
    } catch (e) {
      setError(
        (e as Error).name === "AbortError"
          ? "Request stopped. Your answer is still here."
          : (e as Error).message,
      );
    } finally {
      clearTimeout(timer);
      setBusy(false);
      controller.current = null;
    }
  }
  const latest = interview.turns.at(-1);
  return (
    <section className="session">
      <div className="session-heading">
        <div>
          <p className="eyebrow">THE PRACTICE ROOM</p>
          <h1>{interview.profile.role}</h1>
          <p>
            {interview.profile.focus} ·{" "}
            {interview.profile.level.replaceAll("-", " ")} ·{" "}
            {interview.mode === "demo" ? "local demo" : provider}
          </p>
        </div>
        <span className="session-status">
          {interview.status === "completed" ? (
            <Check size={15} />
          ) : (
            <MessageSquare size={15} />
          )}{" "}
          {interview.status === "completed" ? "Round complete" : "In progress"}
        </span>
      </div>
      <div
        className="session-progress"
        role="group"
        aria-label={`${interview.cursor} of 3 primary questions answered`}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={
              i < interview.cursor
                ? "done"
                : i === interview.cursor
                  ? "current"
                  : ""
            }
          >
            <span>
              {i < interview.cursor ? (
                <Check size={13} />
              ) : (
                String(i + 1).padStart(2, "0")
              )}
            </span>
            {["Round 1", "Round 2", "Round 3"][i]}
          </div>
        ))}
      </div>
      <div
        className={
          "session-layout " +
          (interview.format && interview.format !== "text"
            ? "studio-layout"
            : "")
        }
      >
        <div>
          {room.locked && (
            <div className="question-card">
              <p className="eyebrow">YOUR INTERVIEW TRANSCRIPT</p>
              <h2>
                {room.camera && room.microphone
                  ? "Enter fullscreen to begin."
                  : "Getting your studio ready."}
              </h2>
              <p>
                Your question and editable transcript will appear here once the
                simulation is ready. Device permissions are controlled by your
                browser.
              </p>
            </div>
          )}
          {interview.status === "completed" ? (
            <div className="complete-card">
              <span className="complete-icon">
                <Check size={28} />
              </span>
              <p className="eyebrow">REHEARSAL, COMPLETE</p>
              <h2>
                You showed your thinking.
                <br />
                Now make it sharper.
              </h2>
              <p>
                Your {interview.turns.length} answers and feedback are saved.
                Take a look at what to keep and what to practice next.
              </p>
              <button className="primary" onClick={onReview}>
                Open your review <ArrowRight size={17} />
              </button>
            </div>
          ) : (
            <>
              <div hidden={room.locked} className="question-card">
                <p className="eyebrow">
                  {interview.pendingFollowUp
                    ? "ONE LEVEL DEEPER · FOLLOW-UP"
                    : `QUESTION ${interview.cursor + 1} OF 3 · ${interview.questions[interview.cursor].category.toUpperCase()}`}
                </p>
                <h2>{interview.currentQuestion}</h2>
                {!interview.pendingFollowUp &&
                  interview.questions[interview.cursor].contextQuote && (
                    <p className="question-context">
                      From your context: “
                      {interview.questions[interview.cursor].contextQuote}”
                    </p>
                  )}
              </div>
              <form
                hidden={room.locked}
                className="answer-form"
                onSubmit={submit}
              >
                <p className="eyebrow">
                  {interview.format && interview.format !== "text"
                    ? "LIVE TRANSCRIPT · REVIEW BEFORE SUBMITTING"
                    : "YOUR RESPONSE"}
                </p>
                <label htmlFor="practice-answer">
                  {interview.format && interview.format !== "text"
                    ? "Your transcript / answer"
                    : "Your answer"}
                </label>
                <textarea
                  id="practice-answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={9}
                  maxLength={5000}
                  minLength={10}
                  required
                  disabled={busy || room.busy}
                  placeholder="Explain the situation, what you did or would do, the trade-offs, and how you would verify the outcome."
                />
                {interim && (
                  <p className="live-interim" role="status">
                    {interim}
                    <span> · listening</span>
                  </p>
                )}
                <div className="field-meta">
                  <span>No timer. Take a moment to think.</span>
                  <span>{answer.length.toLocaleString()} / 5,000</span>
                </div>
                {interview.mode === "live" && (
                  <label className="consent">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      disabled={busy || room.busy}
                    />
                    Send my practice context and this answer to {provider} for
                    feedback.
                  </label>
                )}
                <div className="answer-actions">
                  <button
                    className="primary"
                    disabled={
                      busy ||
                      room.locked ||
                      room.busy ||
                      answer.trim().length < 10 ||
                      (interview.mode === "live" && !consent)
                    }
                  >
                    {busy ? "Reviewing your answer…" : "Submit answer"}
                    <ArrowRight size={16} />
                  </button>
                  {busy && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => controller.current?.abort()}
                    >
                      <Square size={14} /> Stop
                    </button>
                  )}
                </div>
                <p role="alert" className="error">
                  {error}
                </p>
              </form>
            </>
          )}
          {latest && (
            <div className="latest-feedback" aria-live="polite">
              <p className="eyebrow">YOUR LAST ANSWER</p>
              <Feedback turn={latest} mode={interview.mode} />
            </div>
          )}
        </div>
        {interview.format &&
          interview.format !== "text" &&
          interview.status !== "completed" && (
            <aside className="studio-camera">
              <MediaRoom
                interview={interview}
                submitting={busy}
                onState={setRoom}
                onInterim={setInterim}
                onTranscript={(text) =>
                  setAnswer((v) => (v + " " + text).trim().slice(0, 5000))
                }
              />
            </aside>
          )}
        <aside className="session-notes" aria-label="Practice guidance">
          <span className="eyebrow">A GOOD ANSWER HAS A SHAPE</span>
          <h2>
            Context.
            <br />
            Decision.
            <br />
            Evidence.
          </h2>
          <p>
            Start with the problem. Explain your contribution or approach. Name
            a trade-off. Finish with how you would check the result.
          </p>
          <div className="mode-note">
            <p>
              <strong>
                {interview.mode === "demo"
                  ? "Demo disclosure"
                  : "You stay in control"}
              </strong>
              {interview.mode === "demo"
                ? "The local rubric checks wording and structure. It cannot verify technical correctness."
                : "AI feedback can be mistaken. Review its reasoning and do not treat it as a hiring score."}
            </p>
          </div>
          <p className="muted">
            Answers are saved after successful feedback. Failed submissions stay
            in the form for retry.
          </p>
          {interview.turns.length > 0 && (
            <details>
              <summary>Earlier answers ({interview.turns.length})</summary>
              {interview.turns.map((t) => (
                <div className="prior-answer" key={t.requestId}>
                  <strong>{t.question}</strong>
                  <p>{t.answer}</p>
                </div>
              ))}
            </details>
          )}
        </aside>
      </div>
    </section>
  );
}
