import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  Clock,
  FlaskConical,
  History,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { api, post, setCsrf, ApiError } from "./api";
import type { Config, User, Interview, InterviewSummary, Page } from "./types";
import Brand from "./components/Brand";
import Auth from "./components/Auth";
import PracticeSetup from "./components/PracticeSetup";
import PracticeSession from "./components/PracticeSession";
import PracticeReview from "./components/PracticeReview";
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [view, setView] = useState<"setup" | "history" | "session" | "review">(
    "setup",
  );
  const [current, setCurrent] = useState<Interview | null>(null);
  const [history, setHistory] = useState<InterviewSummary[]>([]);
  const [more, setMore] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const login = useCallback((session: { user: User; csrf: string }) => {
    setCsrf(session.csrf);
    setUser(session.user);
  }, []);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const c = await api<Config>("/config");
        if (alive) setConfig(c);
        try {
          const s = await api<{ user: User; csrf: string }>("/auth/me");
          if (alive) login(s);
        } catch (e) {
          if (!(e instanceof ApiError) || e.status !== 401) throw e;
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [login]);
  const loadHistory = useCallback(async () => {
    const p = await api<Page<InterviewSummary>>("/interviews");
    setHistory(p.items);
    setMore(p.hasMore);
  }, []);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    setBusy(true);
    void (async () => {
      try {
        await loadHistory();
        const id = sessionStorage.getItem("interview:" + user.id);
        if (id) {
          try {
            const v = await api<Interview>("/interviews/" + id);
            if (alive) {
              setCurrent(v);
              setView(v.status === "completed" ? "review" : "session");
            }
          } catch (e) {
            if (e instanceof ApiError && e.status === 404)
              sessionStorage.removeItem("interview:" + user.id);
            else throw e;
          }
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, loadHistory]);
  useEffect(() => {
    if (!menu) return;
    const trigger = opener.current;
    const body = document.querySelector<HTMLElement>(".workspace-body");
    if (body) body.inert = true;
    const controls = () =>
      Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          ".sidebar button:not(:disabled)",
        ),
      ).filter((x) => x.getClientRects().length);
    controls()[0]?.focus();
    const keys = (e: KeyboardEvent) => {
      const c = controls();
      if (e.key === "Escape") setMenu(false);
      if (e.key === "Tab") {
        if (e.shiftKey && document.activeElement === c[0]) {
          e.preventDefault();
          c.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === c.at(-1)) {
          e.preventDefault();
          c[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", keys);
    return () => {
      document.removeEventListener("keydown", keys);
      if (body) body.inert = false;
      trigger?.focus();
    };
  }, [menu]);
  useEffect(() => {
    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    const media = window.matchMedia("(max-width: 700px)");
    const sync = () => {
      if (sidebar) sidebar.inert = media.matches && !menu;
      if (!media.matches && menu) setMenu(false);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [menu, user]);
  function change(v: Interview) {
    setCurrent(v);
    if (user) sessionStorage.setItem("interview:" + user.id, v.id);
    setView(v.status === "completed" ? "review" : "session");
    setError("");
    void loadHistory().catch((e) => setError((e as Error).message));
  }
  function navigate(next: "setup" | "history") {
    setMenu(false);
    setView(next);
    setError("");
    if (next === "setup" && user)
      sessionStorage.removeItem("interview:" + user.id);
  }
  async function open(id: string) {
    setBusy(true);
    setError("");
    setMenu(false);
    try {
      change(await api<Interview>("/interviews/" + id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    setError("");
    try {
      await api("/interviews/" + id, { method: "DELETE" });
      if (current?.id === id) {
        setCurrent(null);
        if (user) sessionStorage.removeItem("interview:" + user.id);
      }
      setDeleting(null);
      await loadHistory();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function older() {
    setBusy(true);
    try {
      const p = await api<Page<InterviewSummary>>(
        "/interviews?offset=" + history.length,
      );
      setHistory((h) => [...h, ...p.items]);
      setMore(p.hasMore);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await post("/auth/logout", {});
      setMenu(false);
      setUser(null);
      setCurrent(null);
      setHistory([]);
      setCsrf("");
      setView("setup");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!ready)
    return (
      <main className="boot">
        <Brand />
        <h1>Opening Interview Lab…</h1>
      </main>
    );
  if (!config)
    return (
      <main className="boot">
        <Brand />
        <h1>Practice is unavailable</h1>
        <p role="alert">{error}</p>
        <button className="primary" onClick={() => location.reload()}>
          Try again
        </button>
      </main>
    );
  if (!user) return <Auth config={config} onLogin={login} />;
  const mode = user.demo ? "demo" : config.mode;
  const completed = history.filter((h) => h.status === "completed").length;
  return (
    <div className="workspace">
      <a href="#workspace-main" className="skip-link">
        Skip to practice
      </a>
      <aside
        id="lab-navigation"
        className={"sidebar " + (menu ? "sidebar-open" : "")}
        aria-label="Practice navigation"
      >
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-only"
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-name">
          <span className="workspace-avatar">{user.name[0]}</span>
          <div>
            <strong>{user.demo ? "Your demo studio" : user.name}</strong>
            <span>
              {user.demo ? "SYNTHETIC PRACTICE" : "PRIVATE PRACTICE SPACE"}
            </span>
          </div>
        </div>
        <button
          className="new-chat"
          disabled={busy}
          onClick={() => navigate("setup")}
        >
          <Plus size={17} /> New practice <ArrowRight size={15} />
        </button>
        <nav aria-label="Interview Lab">
          <button
            className={"nav-item " + (view === "setup" ? "active" : "")}
            disabled={busy}
            onClick={() => navigate("setup")}
          >
            <FlaskConical size={17} /> Practice setup
          </button>
          <button
            className={"nav-item " + (view === "history" ? "active" : "")}
            disabled={busy}
            onClick={() => navigate("history")}
          >
            <History size={17} /> Session history <span>{history.length}</span>
          </button>
        </nav>
        <p className="sidebar-label">RECENT SESSIONS</p>
        <div className="thread-list">
          {history.slice(0, 6).map((h) => (
            <button
              key={h.id}
              className={
                "thread-item " + (h.id === current?.id ? "selected" : "")
              }
              disabled={busy}
              onClick={() => open(h.id)}
            >
              <span className={"history-dot " + h.status} />
              <span>
                {h.role}
                <small>
                  {h.status === "completed"
                    ? "Review ready"
                    : `${h.answered}/3 questions`}
                </small>
              </span>
            </button>
          ))}
          {!history.length && (
            <p className="sidebar-empty">
              Your first round starts with a little context.
            </p>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="privacy-card">
            <ShieldCheck size={18} />
            <strong>
              {mode === "demo"
                ? "No AI credits needed"
                : "Practice, with your permission"}
            </strong>
            <p>
              {mode === "demo"
                ? "Template questions. Local text rubric. Real saved sessions."
                : "Context goes to the selected provider only after consent."}
            </p>
          </div>
          <div className="account">
            <span className="account-avatar">{user.name[0]}</span>
            <div>
              <strong>{user.name}</strong>
              <span>{config.dailyLimit} practice requests / day</span>
            </div>
            <button
              className="icon-button"
              aria-label="Sign out"
              disabled={busy}
              onClick={logout}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      {menu && (
        <button
          className="menu-scrim"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="workspace-body">
        <header className="topbar">
          <div>
            <button
              ref={opener}
              className="icon-button mobile-only"
              aria-label="Open navigation"
              aria-controls="lab-navigation"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb">
              INTERVIEW LAB <ChevronRight size={12} />{" "}
              {view === "setup"
                ? "Practice setup"
                : view === "history"
                  ? "Your sessions"
                  : view === "review"
                    ? "Practice review"
                    : "Practice room"}
            </span>
          </div>
          <span className="topbar-status">
            <span />
            {mode === "demo" ? "Local demo" : config.provider}
          </span>
        </header>
        <main id="workspace-main" className="workspace-main">
          <p className="workspace-error" role="alert">
            {error}
          </p>
          {busy && (
            <p className="workspace-loading" role="status">
              Updating your practice space…
            </p>
          )}
          {view === "setup" ? (
            <PracticeSetup
              mode={mode}
              provider={config.provider}
              onStarted={change}
            />
          ) : view === "history" ? (
            <section className="history-page">
              <div className="page-heading">
                <p className="eyebrow">SMALL ROUNDS. USEFUL PROGRESS.</p>
                <h1>
                  Your practice history<span>.</span>
                </h1>
                <p>
                  {completed} completed rounds in this page of saved sessions.
                  Revisit an answer or pick up where you left off.
                </p>
              </div>
              {!history.length ? (
                <div className="history-empty">
                  <Clock size={30} />
                  <h2>Your first rehearsal is waiting.</h2>
                  <p>
                    Start with your experience and a role you want to practice
                    for.
                  </p>
                  <button className="primary" onClick={() => navigate("setup")}>
                    Set up a practice round <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                <div className="history-list">
                  {history.map((h) => (
                    <article key={h.id}>
                      <div>
                        <span className="eyebrow">
                          {h.focus} · {h.level.replaceAll("-", " ")}
                        </span>
                        <h2>{h.role}</h2>
                        <p>
                          {new Date(h.createdAt).toLocaleDateString()} ·{" "}
                          {h.mode === "demo" ? "Local demo" : "AI practice"} ·{" "}
                          {h.answered}/3 primary questions
                        </p>
                      </div>
                      <div className="history-actions">
                        <span className={"status-badge " + h.status}>
                          {h.status === "completed"
                            ? "Completed"
                            : "In progress"}
                        </span>
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() => open(h.id)}
                        >
                          {h.status === "completed" ? "Open review" : "Resume"}
                          <ArrowRight size={14} />
                        </button>
                        {deleting === h.id ? (
                          <>
                            <button
                              className="danger"
                              disabled={busy}
                              onClick={() => remove(h.id)}
                            >
                              Confirm deletion
                            </button>
                            <button
                              className="text-button"
                              onClick={() => setDeleting(null)}
                            >
                              Keep session
                            </button>
                          </>
                        ) : (
                          <button
                            className="icon-button"
                            aria-label={"Delete session " + h.role}
                            disabled={busy}
                            onClick={() => setDeleting(h.id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {more && (
                <button className="secondary" onClick={older} disabled={busy}>
                  Load older sessions
                </button>
              )}
            </section>
          ) : current ? (
            view === "review" ? (
              <PracticeReview
                interview={current}
                onNew={() => navigate("setup")}
              />
            ) : (
              <PracticeSession
                key={current.id}
                interview={current}
                provider={config.provider}
                onChanged={change}
                onReview={() => setView("review")}
              />
            )
          ) : (
            <p className="workspace-loading">
              Choose a saved session to continue.
            </p>
          )}
        </main>
        <footer className="workspace-footer">
          <span>INTERVIEW LAB / A CLEARER NEXT ANSWER</span>
          <span>Built by Shivansh Verma</span>
        </footer>
      </div>
    </div>
  );
}
