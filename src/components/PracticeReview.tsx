import { ArrowRight, Download } from "lucide-react";
import { Feedback } from "./PracticeSession";
import type { Interview } from "../types";
export default function PracticeReview({
  interview,
  onNew,
}: {
  interview: Interview;
  onNew: () => void;
}) {
  return (
    <section className="review">
      <div className="page-heading">
        <p className="eyebrow">TURN A REHEARSAL INTO A NEXT STEP</p>
        <h1>
          Your practice, in perspective<span>.</span>
        </h1>
        <p>
          {interview.profile.role} ·{" "}
          {new Date(interview.createdAt).toLocaleDateString()} ·{" "}
          {interview.mode === "demo"
            ? "Local rubric demo"
            : "AI-assisted practice"}
        </p>
      </div>
      <div className="review-actions">
        <button className="primary" onClick={onNew}>
          Practice another round <ArrowRight size={16} />
        </button>
        <a
          className="secondary"
          href={"/api/interviews/" + interview.id + "/export"}
          download="Interview_Lab_Review.md"
        >
          <Download size={16} /> Download review
        </a>
      </div>
      <div className="review-disclaimer">{interview.report.disclaimer}</div>
      {interview.format === "simulation" && (
        <div className="media-room">
          <h2>Session interruptions</h2>
          <p>
            Client-reported browser events, not proof of cheating. No eye
            tracking or face analysis.
          </p>
          <ul>
            {(interview.integrity ?? []).map((e) => (
              <li key={e.id}>
                {e.type.replaceAll("_", " ")} ·{" "}
                {new Date(e.at).toLocaleTimeString()}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="review-grid">
        <div className="review-summary">
          <p className="eyebrow">WHAT TO KEEP</p>
          <h2>Build on the useful parts.</h2>
          {interview.report.strengths.length ? (
            <ul>
              {interview.report.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          ) : (
            <p>
              No evidence-backed strengths were identified yet. Use the next
              steps to make your next answer more concrete.
            </p>
          )}
        </div>
        <div className="review-summary">
          <p className="eyebrow">YOUR NEXT PRACTICE</p>
          <h2>Make the next answer clearer.</h2>
          <ul>
            {interview.report.nextSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="review-transcript">
        <h2>The full conversation</h2>
        <p className="muted">
          {interview.cursor} primary questions ·{" "}
          {interview.turns.filter((t) => t.kind === "follow-up").length}{" "}
          follow-up · saved for your review
        </p>
        {interview.turns.map((t, i) => (
          <article key={t.requestId}>
            <div className="transcript-question">
              <span className="step-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="eyebrow">{t.kind.toUpperCase()}</p>
                <h3>{t.question}</h3>
              </div>
            </div>
            <div className="transcript-answer">
              <p className="eyebrow">YOUR ANSWER</p>
              <p>{t.answer}</p>
            </div>
            <Feedback turn={t} mode={interview.mode} />
          </article>
        ))}
      </div>
    </section>
  );
}
