import {
  BookOpen,
  LogOut,
  MessageSquare,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import type { User, ThreadSummary } from "../types";
import Brand from "./Brand";
type Props = {
  user: User;
  menu: boolean;
  busy: boolean;
  view: "desk" | "sources";
  mode: "demo" | "live";
  sources: number;
  threads: ThreadSummary[];
  activeThreadId?: string;
  more: boolean;
  dailyLimit: number;
  onClose: () => void;
  onNew: () => void;
  onNavigate: (view: "desk" | "sources") => void;
  onOpen: (thread: ThreadSummary) => void;
  onLoadMore: () => void;
  onLogout: () => void;
};
export default function Sidebar({
  user,
  menu,
  busy,
  view,
  mode,
  sources,
  threads,
  activeThreadId,
  more,
  dailyLimit,
  onClose,
  onNew,
  onNavigate,
  onOpen,
  onLoadMore,
  onLogout,
}: Props) {
  return (
    <aside
      aria-label="Workspace navigation"
      id="workspace-navigation"
      className={"sidebar " + (menu ? "sidebar-open" : "")}
    >
      <div className="sidebar-brand">
        <Brand />
        <button
          className="icon-button mobile-only"
          aria-label="Close navigation"
          onClick={() => onClose()}
        >
          <X size={20} />
        </button>
      </div>
      <div className="workspace-name">
        <span className="workspace-avatar">{user.name.charAt(0)}</span>
        <div>
          <strong>
            {user.demo ? "Atlas workspace" : user.name + "’s workspace"}
          </strong>
          <span>
            {user.demo ? "SYNTHETIC PROJECT / DEMO" : "PRIVATE WORKSPACE"}
          </span>
        </div>
      </div>
      <button className="new-chat" disabled={busy} onClick={onNew}>
        <Plus size={17} /> New conversation <span>↗</span>
      </button>
      <nav aria-label="Workspace">
        <button
          className={view === "desk" ? "nav-item active" : "nav-item"}
          onClick={() => onNavigate("desk")}
        >
          <MessageSquare size={17} /> Research desk
        </button>
        <button
          className={view === "sources" ? "nav-item active" : "nav-item"}
          onClick={() => onNavigate("sources")}
        >
          <BookOpen size={17} /> Source library <span>{sources}</span>
        </button>
      </nav>
      <p className="sidebar-label">
        CONVERSATIONS <span>{threads.length}</span>
      </p>
      <div className="thread-list">
        {threads.map((t) => (
          <button
            className={
              "thread-item " + (t.id === activeThreadId ? "selected" : "")
            }
            key={t.id}
            onClick={() => onOpen(t)}
            disabled={busy}
          >
            <MessageSquare size={14} />
            <span>{t.title}</span>
          </button>
        ))}
        {!threads.length && (
          <p className="sidebar-empty">Your questions will find a home here.</p>
        )}
        {more && (
          <button className="text-button" onClick={onLoadMore} disabled={busy}>
            Load older conversations
          </button>
        )}
      </div>
      <div className="sidebar-bottom">
        <div className="privacy-card">
          <ShieldCheck size={18} />
          <strong>
            {mode === "demo"
              ? "Explore without AI credits"
              : "Private by design"}
          </strong>
          <p>
            {mode === "demo"
              ? "Synthetic sources. Isolated workspace. No provider calls."
              : "Only relevant excerpts leave your workspace after consent."}
          </p>
        </div>
        <div className="account">
          <span className="account-avatar">{user.name.charAt(0)}</span>
          <div>
            <strong>{user.name}</strong>
            <span>{dailyLimit} questions / day</span>
          </div>
          <button
            className="icon-button"
            aria-label="Sign out"
            onClick={onLogout}
            disabled={busy}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
