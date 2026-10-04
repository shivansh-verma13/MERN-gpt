import { useCallback, useEffect, useState, useRef } from "react";
import {
  ArrowUpRight,
  FileText,
  Menu,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { api, post, setCsrf, ApiError } from "./api";
import type {
  User,
  Source,
  Thread,
  ThreadSummary,
  Config,
  Page,
  Answer,
} from "./types";
import Brand from "./components/Brand";
import Auth from "./components/Auth";
import SourceDialog from "./components/SourceDialog";
import Conversation from "./components/Conversation";
import Sidebar from "./components/Sidebar";
import SourceContext from "./components/SourceContext";
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [thread, setThread] = useState<Thread | null>(null);
  const [more, setMore] = useState(false);
  const [menu, setMenu] = useState(false);
  const [view, setView] = useState<"desk" | "sources">("desk");
  const [dialog, setDialog] = useState<Source | null | false>(false);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menu) return;
    const opener = menuButton.current;
    const body = document.querySelector<HTMLElement>(".workspace-body");
    if (body) body.inert = true;
    const controls = () =>
      Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          ".sidebar button:not(:disabled)",
        ),
      ).filter((el) => el.getClientRects().length > 0);
    controls()[0]?.focus();
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
      }
      if (e.key === "Tab") {
        const items = controls();
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("keydown", close);
      if (body) body.inert = false;
      opener?.focus();
    };
  }, [menu]);
  const login = useCallback((v: { user: User; csrf: string }) => {
    setCsrf(v.csrf);
    setUser(v.user);
  }, []);
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const c = await api<Config>("/config");
        if (alive) setConfig(c);
        try {
          const session = await api<{ user: User; csrf: string }>("/auth/me");
          if (alive) login(session);
        } catch (e) {
          if (!(e instanceof ApiError) || e.status !== 401) throw e;
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setReady(true);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [login]);
  const loadSources = useCallback(async () => {
    const result = await api<Page<Source>>("/sources?limit=50");
    setSources(result.items);
  }, []);
  const loadThreads = useCallback(async () => {
    const result = await api<Page<ThreadSummary>>("/threads?limit=20");
    setThreads(result.items);
    setMore(result.hasMore);
  }, []);
  useEffect(() => {
    if (!user) return;
    setBusy(true);
    Promise.all([loadSources(), loadThreads()])
      .catch((e) => setError((e as Error).message))
      .finally(() => setBusy(false));
  }, [user, loadSources, loadThreads]);
  async function open(t: ThreadSummary) {
    setRemove(false);
    setBusy(true);
    setError("");
    try {
      setThread(await api<Thread>("/threads/" + t.id));
      setView("desk");
      setMenu(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function answered(
    _question: string,
    _result: Answer,
    current: Thread | null,
  ) {
    if (current) setThread(await api<Thread>("/threads/" + current.id));
    await loadThreads();
  }
  async function logout() {
    setBusy(true);
    try {
      await post("/auth/logout", {});
      setMenu(false);
      setRemove(false);
      setView("desk");
      setError("");
      setUser(null);
      setThread(null);
      setThreads([]);
      setSources([]);
      setCsrf("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function deleteThread() {
    if (!thread) return;
    setBusy(true);
    try {
      await api("/threads/" + thread.id, { method: "DELETE" });
      setThread(null);
      setRemove(false);
      await loadThreads();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function loadMore() {
    setBusy(true);
    try {
      const next = await api<Page<ThreadSummary>>(
        "/threads?limit=20&offset=" + threads.length,
      );
      setThreads((prev) => [...prev, ...next.items]);
      setMore(next.hasMore);
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
        <p>Opening your workspace…</p>
      </main>
    );
  if (!config)
    return (
      <main className="boot">
        <Brand />
        <h1>Workspace unavailable</h1>
        <p role="alert">{error || "The API could not be reached."}</p>
        <button className="primary" onClick={() => location.reload()}>
          Try again
        </button>
      </main>
    );
  if (!user) return <Auth config={config} onLogin={login} />;
  const mode = user.demo ? "demo" : config.mode;
  const filtered = sources.filter((s) =>
    (s.title + " " + s.content).toLowerCase().includes(filter.toLowerCase()),
  );
  return (
    <div className="workspace">
      <a href="#workspace-main" className="skip-link">
        Skip to workspace
      </a>
      <Sidebar
        user={user}
        menu={menu}
        busy={busy}
        view={view}
        mode={mode}
        sources={sources.length}
        threads={threads}
        activeThreadId={thread?.id}
        more={more}
        dailyLimit={config.dailyLimit}
        onClose={() => setMenu(false)}
        onNew={() => {
          setThread(null);
          setRemove(false);
          setView("desk");
          setMenu(false);
        }}
        onNavigate={(view) => {
          setView(view);
          setMenu(false);
        }}
        onOpen={open}
        onLoadMore={loadMore}
        onLogout={logout}
      />

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
              className="icon-button mobile-only"
              ref={menuButton}
              aria-label="Open navigation"
              aria-controls="workspace-navigation"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb">
              WORKSPACE <span>/</span>{" "}
              {view === "desk" ? "Research desk" : "Source library"}
            </span>
          </div>
          <span className="topbar-status">
            <span /> {mode === "demo" ? "Demo mode" : "Live AI"}
          </span>
          <button className="secondary add-top" onClick={() => setDialog(null)}>
            <Plus size={15} /> Add source
          </button>
        </header>
        <main id="workspace-main" className="workspace-main">
          <p role="alert" className="workspace-error">
            {error}
          </p>
          {busy && (
            <p role="status" className="workspace-loading">
              Updating workspace…
            </p>
          )}
          {view === "desk" ? (
            <div className="desk-grid">
              <div>
                <Conversation
                  key={thread?.id ?? "new"}
                  thread={thread}
                  sources={sources}
                  mode={mode}
                  onAnswered={answered}
                  onSource={(id) => {
                    const source = sources.find((s) => s.id === id);
                    if (source) setDialog(source);
                    else
                      setError(
                        "The original source was deleted. Its quoted evidence remains in the conversation.",
                      );
                  }}
                />
                {thread && (
                  <div className="thread-actions">
                    {remove ? (
                      <>
                        <span>Delete this conversation?</span>
                        <button
                          className="danger"
                          onClick={deleteThread}
                          disabled={busy}
                        >
                          Confirm deletion
                        </button>
                        <button
                          className="text-button"
                          onClick={() => setRemove(false)}
                        >
                          Keep it
                        </button>
                      </>
                    ) : (
                      <button
                        className="text-button"
                        onClick={() => setRemove(true)}
                      >
                        <Trash2 size={13} /> Delete conversation
                      </button>
                    )}
                  </div>
                )}
              </div>
              <SourceContext
                sources={sources}
                onSource={setDialog}
                onAdd={() => setDialog(null)}
                onLibrary={() => setView("sources")}
              />
            </div>
          ) : (
            <section className="library">
              <p className="eyebrow">THE FOUNDATION OF YOUR ANSWERS</p>
              <h1>
                Source library<span>.</span>
              </h1>
              <p className="muted">
                Project briefs, decisions, and notes. Keep the context worth
                coming back to.
              </p>
              <label className="source-search">
                <Search size={18} />
                <span className="sr-only">Search sources</span>
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search titles and content…"
                />
              </label>
              <div className="source-grid">
                {filtered.map((s, i) => (
                  <button
                    className="source-card"
                    key={s.id}
                    onClick={() => setDialog(s)}
                  >
                    <div>
                      <FileText size={22} />
                      <span>{String(i + 1).padStart(2, "0")}</span>
                    </div>
                    <h2>{s.title}</h2>
                    <p>{s.content.slice(0, 150)}…</p>
                    <footer>
                      <span>
                        {new Date(s.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        · Plain text
                      </span>
                      <ArrowUpRight size={17} />
                    </footer>
                  </button>
                ))}
                <button
                  className="source-card new-source"
                  onClick={() => setDialog(null)}
                >
                  <Plus size={27} />
                  <h2>Add a source</h2>
                  <p>Bring another piece of the puzzle.</p>
                </button>
              </div>
              {!filtered.length && filter && (
                <p role="status">
                  No sources match “{filter}”. Try another search.
                </p>
              )}
            </section>
          )}
        </main>
        <footer className="workspace-footer">
          <span>BRIEFCASE / A LITTLE MORE CLARITY</span>
          <span>Built by Shivansh Verma</span>
        </footer>
      </div>
      {dialog !== false && (
        <SourceDialog
          source={dialog}
          onClose={() => setDialog(false)}
          onChange={loadSources}
        />
      )}
    </div>
  );
}
