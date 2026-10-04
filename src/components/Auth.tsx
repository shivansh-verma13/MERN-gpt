import { useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowUpRight,
  Check,
  FileText,
  Quote,
  ShieldCheck,
} from "lucide-react";
import Brand from "./Brand";
import { post } from "../api";
import type { Config, User } from "../types";
export default function Auth({
  config,
  onLogin,
}: {
  config: Config;
  onLogin: (value: { user: User; csrf: string }) => void;
}) {
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      onLogin(
        await post(signup ? "/auth/register" : "/auth/login", {
          email: form.get("email"),
          password: form.get("password"),
          name: form.get("name"),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function demo() {
    setBusy(true);
    setError("");
    try {
      onLogin(await post("/auth/demo", {}));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="welcome">
      <section className="welcome-story">
        <Brand />
        <div className="welcome-content">
          <p className="eyebrow">A REHEARSAL FOR YOUR NEXT CHAPTER</p>
          <h1>
            Less guessing.
            <br />
            More <em>clarity.</em>
          </h1>
          <p className="welcome-description">
            Practice explaining your experience, your decisions, and your
            thinking. Leave with a clearer next answer.
          </p>
          <div className="welcome-preview">
            <div className="preview-label">
              <FileText size={16} /> INTERVIEW LAB / PRACTICE PROMPT{" "}
              <span>01</span>
            </div>
            <p>“What did you own, and how did you verify the result?”</p>
            <div className="preview-evidence">
              <Quote size={14} /> A good answer starts with your experience.
            </div>
          </div>
          <ul className="welcome-points">
            <li>
              <Check size={15} /> Role-specific questions and saved sessions
            </li>
            <li>
              <Check size={15} /> Feedback grounded in your own words
            </li>
            <li>
              <Check size={15} /> You control what goes to AI
            </li>
          </ul>
        </div>
        <p className="welcome-foot">
          Built by Shivansh Verma · React, Express & MongoDB
        </p>
      </section>
      <section className="welcome-form">
        <div>
          <p className="eyebrow">PREPARE FOR THE CONVERSATION</p>
          <h2>
            {config.demoEnabled
              ? "Take a look inside."
              : signup
                ? "Create your practice space."
                : "Welcome back."}
          </h2>
          <p className="muted">
            {config.demoEnabled
              ? "Try a complete text interview with synthetic context. No signup or AI credits needed."
              : "Your experience. A focused practice round. Useful next steps."}
          </p>
          {config.demoEnabled ? (
            <>
              <button
                className="primary demo-entry"
                disabled={busy}
                onClick={demo}
              >
                {busy ? "Preparing practice…" : "Explore demo interview"}
                <ArrowUpRight size={18} />
              </button>
              <div className="demo-disclosure">
                <ShieldCheck size={20} />
                <div>
                  <strong>A real product flow. A labelled demo.</strong>
                  <p>
                    Sessions and persistence use the real API. Demo questions
                    are templates and feedback uses a simple local rubric;
                    neither is AI-generated.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <form onSubmit={submit}>
              {signup && (
                <label>
                  Your name
                  <input
                    name="name"
                    autoComplete="name"
                    minLength={2}
                    maxLength={70}
                    required
                  />
                </label>
              )}
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete={signup ? "new-password" : "current-password"}
                  minLength={10}
                  maxLength={128}
                  required
                />
              </label>
              <p className="small muted">Use at least 10 characters.</p>
              <button className="primary" disabled={busy}>
                {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
                <ArrowUpRight size={16} />
              </button>
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setSignup(!signup);
                  setError("");
                }}
              >
                {signup
                  ? "Already have an account? Sign in"
                  : "New here? Create an account"}
              </button>
            </form>
          )}
          <p role="alert" className="error">
            {error}
          </p>
          <p className="welcome-privacy">
            Résumé and job context stay private to your account. Live AI
            receives context and practice answers only after consent.
          </p>
        </div>
      </section>
    </main>
  );
}
