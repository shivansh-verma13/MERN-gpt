import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  FileText,
  FlaskConical,
  ShieldCheck,
  Upload,
} from "lucide-react";
import type { Profile, Interview, SessionFormat } from "../types";
import { post } from "../api";
export const sampleProfile: Profile = {
  role: "Full-Stack Software Engineer",
  level: "early-career",
  focus: "full-stack",
  resume:
    "Alex Morgan — synthetic candidate. Built a React dashboard and Express API for a student project. Implemented session authentication, MongoDB queries, and integration tests. Collaborated with two classmates on accessible forms. No production adoption or business impact is claimed.",
  job: "Synthetic role: Full-Stack Software Engineer. Build responsive React interfaces and reliable Node.js APIs. Explain database design and security trade-offs. Work with product and QA, write tests, and measure performance. This is a practice role, not an actual job listing.",
};
export default function PracticeSetup({
  mode,
  provider,
  onStarted,
}: {
  mode: "demo" | "live";
  provider: string;
  onStarted: (v: Interview) => void;
}) {
  const [profile, setProfile] = useState<Profile>({
    ...sampleProfile,
    resume: "",
    job: "",
  });
  const [format, setFormat] = useState<SessionFormat>("text");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const attempt = useRef({ payload: "", id: crypto.randomUUID() });
  useEffect(() => () => controller.current?.abort(), []);
  const change = (key: keyof Profile, value: string) =>
    setProfile((p) => ({ ...p, [key]: value }));
  async function start(e: FormEvent) {
    e.preventDefault();
    if (busy || (mode === "live" && !consent)) return;
    setBusy(true);
    setError("");
    controller.current = new AbortController();
    const timer = setTimeout(() => controller.current?.abort(), 35000);
    const payload = JSON.stringify({ profile, format });
    if (attempt.current.payload !== payload)
      attempt.current = { payload, id: crypto.randomUUID() };
    try {
      onStarted(
        await post<Interview>(
          "/interviews",
          { ...profile, format, requestId: attempt.current.id, consent },
          controller.current.signal,
        ),
      );
    } catch (e) {
      setError(
        (e as Error).name === "AbortError"
          ? "Preparation stopped. Your context is still here; retry when ready."
          : (e as Error).message,
      );
    } finally {
      clearTimeout(timer);
      setBusy(false);
      controller.current = null;
    }
  }
  async function importResume(file?: File) {
    if (!file) return;
    if (file.size > 64000) {
      setError("Choose a text file smaller than 64KB.");
      return;
    }
    if (!/\.(txt|md)$/i.test(file.name)) {
      setError(
        "This release accepts .txt or .md. Copy text from a PDF into the résumé field.",
      );
      return;
    }
    const text = await file.text();
    if (text.length > 10000) {
      setError("Keep résumé text under 10,000 characters.");
      return;
    }
    change("resume", text);
    setError("");
  }
  return (
    <section className="setup">
      <div className="page-heading">
        <p className="eyebrow">YOUR NEXT CONVERSATION STARTS HERE</p>
        <h1>
          Practice with purpose<span>.</span>
        </h1>
        <p>
          Bring your experience. Pick a role.
          <br />
          Build a clearer answer, one question at a time.
        </p>
      </div>
      <fieldset className="format-picker">
        <legend>Choose your interview experience</legend>
        <div>
          {(
            [
              ["text", "Text practice", "Write and refine your answers."],
              ["audio", "Audio practice", "Hear questions and answer aloud."],
              ["video", "Video practice", "Camera preview and spoken answers."],
              [
                "simulation",
                "Fullscreen simulation",
                "Camera + microphone required. Exits pause the round.",
              ],
            ] as const
          ).map(([value, title, description]) => (
            <label key={value}>
              <input
                type="radio"
                name="interview-format"
                value={value}
                checked={format === value}
                disabled={busy}
                onChange={() => setFormat(value)}
              />
              <span>
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
            </label>
          ))}
        </div>
        <p>
          Video stays on your device. Audio is sent to Gemini only with consent.
          Fullscreen cannot detect help from another device.
        </p>
      </fieldset>
      <div className="setup-grid">
        <form onSubmit={start} className="setup-form">
          <div className="form-section">
            <div className="section-title">
              <span className="step-number">01</span>
              <h2>Set the scene</h2>
            </div>
            <label htmlFor="role">Target role</label>
            <input
              id="role"
              value={profile.role}
              onChange={(e) => change("role", e.target.value)}
              minLength={3}
              maxLength={100}
              required
              disabled={busy}
            />
            <div className="field-pair">
              <label>
                Experience level
                <select
                  value={profile.level}
                  onChange={(e) => change("level", e.target.value)}
                  disabled={busy}
                >
                  <option value="early-career">Early career</option>
                  <option value="mid-level">Mid-level</option>
                  <option value="senior">Senior</option>
                </select>
              </label>
              <label>
                Interview focus
                <select
                  value={profile.focus}
                  onChange={(e) => change("focus", e.target.value)}
                  disabled={busy}
                >
                  <option value="full-stack">Full-stack</option>
                  <option value="frontend">Frontend</option>
                  <option value="backend">Backend</option>
                </select>
              </label>
            </div>
          </div>
          <div className="form-section">
            <div className="section-title">
              <span className="step-number">02</span>
              <h2>Bring the context</h2>
              <button
                type="button"
                className="text-button sample-button"
                disabled={busy}
                onClick={() => {
                  setProfile(sampleProfile);
                  setError("");
                }}
              >
                Use synthetic example
              </button>
            </div>
            <label htmlFor="resume">Résumé / experience</label>
            <p className="field-hint" id="resume-hint">
              Paste relevant experience. Remove phone numbers, addresses, and
              confidential details.
            </p>
            <textarea
              id="resume"
              aria-describedby="resume-hint"
              value={profile.resume}
              onChange={(e) => change("resume", e.target.value)}
              rows={7}
              minLength={40}
              maxLength={10000}
              required
              disabled={busy}
              placeholder="Your projects, responsibilities, skills, and experience…"
            />
            <div className="field-meta">
              <label className="import-label">
                <Upload size={14} /> Import .txt / .md
                <input
                  type="file"
                  accept=".txt,.md"
                  aria-label="Import résumé text"
                  disabled={busy}
                  onChange={(e) => void importResume(e.target.files?.[0])}
                />
              </label>
              <span>{profile.resume.length.toLocaleString()} / 10,000</span>
            </div>
            <label htmlFor="job">Job description</label>
            <textarea
              id="job"
              value={profile.job}
              onChange={(e) => change("job", e.target.value)}
              rows={5}
              minLength={40}
              maxLength={8000}
              required
              disabled={busy}
              placeholder="What the role expects. Paste a job description or write the responsibilities."
            />
            <div className="field-meta">
              <span>At least 40 characters in each context field.</span>
              <span>{profile.job.length.toLocaleString()} / 8,000</span>
            </div>
          </div>
          {mode === "live" ? (
            <label className="consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                disabled={busy}
              />
              Send this résumé, job context, and my practice answers to{" "}
              {provider} for questions and feedback.{" "}
              {provider === "Gemini"
                ? "Google’s free tier may use submitted content to improve its products."
                : ""}
            </label>
          ) : (
            <div className="mode-note">
              <FlaskConical size={17} />
              <p>
                <strong>Local demo · no AI calls</strong>Questions use role
                templates. Feedback uses a simple text rubric, not an AI
                assessment.
              </p>
            </div>
          )}
          <div className="form-submit">
            <button
              className="primary"
              disabled={
                busy ||
                profile.resume.trim().length < 40 ||
                profile.job.trim().length < 40 ||
                (mode === "live" && !consent)
              }
            >
              {busy ? "Preparing your questions…" : "Start practice"}
              <ArrowRight size={17} />
            </button>
            {busy && (
              <button
                type="button"
                className="secondary"
                onClick={() => controller.current?.abort()}
              >
                Cancel preparation
              </button>
            )}
            <span>3 questions · up to 1 follow-up</span>
          </div>
          <p className="error" role="alert">
            {error}
          </p>
        </form>
        <aside className="practice-guide" aria-label="How practice works">
          <div className="guide-label">
            <FileText size={16} /> A SMALL, USEFUL REHEARSAL
          </div>
          <h2>
            Not a test.
            <br />A better next answer.
          </h2>
          <ol>
            <li>
              <span>01</span>
              <div>
                <strong>Explain your thinking</strong>
                <p>
                  Technical, systems, and experience questions shaped around
                  your role.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Go one level deeper</strong>
                <p>
                  A follow-up gives you room to clarify a decision or a
                  trade-off.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Leave with next steps</strong>
                <p>
                  Review your answers, supporting excerpts, and specific
                  improvements.
                </p>
              </div>
            </li>
          </ol>
          <div className="guide-privacy">
            <ShieldCheck size={20} />
            <p>
              Practice feedback is guidance, not a hiring verdict or
              verification of your qualifications.
            </p>
          </div>
          <p className="guide-caption">TEXT FIRST. THOUGHTFUL BY DESIGN.</p>
        </aside>
      </div>
    </section>
  );
}
