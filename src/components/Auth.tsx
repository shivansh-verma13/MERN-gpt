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
          <p className="eyebrow">YOUR KNOWLEDGE. A CLEARER PICTURE.</p>
          <h1>
            Less searching.
            <br />
            More <em>knowing.</em>
          </h1>
          <p className="welcome-description">
            Bring your project notes together. Find the answer, trace the
            evidence, and keep the context.
          </p>
          <div className="welcome-preview">
            <div className="preview-label">
              <FileText size={16} /> ATLAS / PROJECT BRIEF <span>01</span>
            </div>
            <p>“The pilot launch is scheduled for November 12.”</p>
            <div className="preview-evidence">
              <Quote size={14} /> Answers that show their work.
            </div>
          </div>
          <ul className="welcome-points">
            <li>
              <Check size={15} /> Private sources and saved conversations
            </li>
            <li>
              <Check size={15} /> Cited excerpts you can inspect
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
          <p className="eyebrow">A WORKSPACE FOR YOUR NEXT IDEA</p>
          <h2>
            {config.demoEnabled
              ? "Take a look inside."
              : signup
                ? "Create your workspace."
                : "Welcome back."}
          </h2>
          <p className="muted">
            {config.demoEnabled
              ? "Explore a realistic project with synthetic notes. No signup, no provider calls."
              : "A quiet place to turn notes into useful answers."}
          </p>
          {config.demoEnabled ? (
            <>
              <button
                className="primary demo-entry"
                disabled={busy}
                onClick={demo}
              >
                {busy ? "Preparing workspace…" : "Explore demo workspace"}
                <ArrowUpRight size={18} />
              </button>
              <div className="demo-disclosure">
                <ShieldCheck size={20} />
                <div>
                  <strong>A real product flow. A labelled demo.</strong>
                  <p>
                    Sources, conversations, and persistence use the API. Answer
                    previews retrieve excerpts deterministically; they are not
                    AI-generated.
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
                {busy
                  ? "Please wait…"
                  : signup
                    ? "Create workspace"
                    : "Sign in"}
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
            Your notes stay in your workspace. Live AI receives only your
            question and relevant excerpts after you opt in.
          </p>
        </div>
      </section>
    </main>
  );
}
