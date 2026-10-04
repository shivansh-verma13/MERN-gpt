import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { FileText, Upload, X } from "lucide-react";
import { api, post } from "../api";
import type { Source } from "../types";
export default function SourceDialog({
  source,
  onClose,
  onChange,
}: {
  source: Source | null;
  onClose: () => void;
  onChange: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await post("/sources", { title, content });
      await onChange();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!source) return;
    setBusy(true);
    try {
      await api("/sources/" + source.id, { method: "DELETE" });
      await onChange();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="source-dialog"
      onCancel={onClose}
      aria-labelledby="source-dialog-title"
    >
      <div className="dialog-heading">
        <div>
          <span className="eyebrow">SOURCE LIBRARY</span>
          <h2 id="source-dialog-title">
            {source ? source.title : "Add a little context."}
          </h2>
        </div>
        <button
          className="icon-button"
          aria-label="Close source dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {source ? (
        <>
          <div className="source-text">{source.content}</div>
          <div className="dialog-actions">
            {confirm ? (
              <>
                <span>
                  Delete this source? Saved citations keep their excerpts.
                </span>
                <button className="danger" onClick={remove} disabled={busy}>
                  Confirm deletion
                </button>
                <button className="secondary" onClick={() => setConfirm(false)}>
                  Keep source
                </button>
              </>
            ) : (
              <button className="text-button" onClick={() => setConfirm(true)}>
                Delete source
              </button>
            )}
          </div>
        </>
      ) : (
        <form onSubmit={submit}>
          <p className="muted">
            Paste notes, a product brief, or an architecture decision. Start
            with one useful source.
          </p>
          <label className="file-import">
            <Upload size={17} /> Import a .txt or .md file
            <input
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 64000) {
                  setError("Choose a text file smaller than 64KB.");
                  return;
                }
                const text = await file.text();
                if (text.length > 16000) {
                  setError("Keep source content under 16,000 characters.");
                  return;
                }
                setContent(text);
                setTitle(file.name.replace(/\.(txt|md)$/i, ""));
                setError("");
              }}
            />
          </label>
          <label>
            Source title
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={100}
              placeholder="e.g. Launch plan · November"
            />
          </label>
          <label>
            Content
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              minLength={20}
              maxLength={16000}
              rows={9}
              placeholder="Paste the details you want to reference…"
            />
          </label>
          <div className="input-meta">
            <span>Plain text only · 50 sources per workspace</span>
            <span>{content.length.toLocaleString()} / 16,000</span>
          </div>
          <button
            className="primary"
            disabled={busy || content.trim().length < 20 || !title.trim()}
          >
            <FileText size={16} />
            {busy ? "Saving…" : "Save source"}
          </button>
        </form>
      )}
      <p role="alert" className="error">
        {error}
      </p>
    </dialog>
  );
}
