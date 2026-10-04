import { ArrowUpRight, FileText, Plus } from "lucide-react";
import type { Source } from "../types";
export default function SourceContext({
  sources,
  onSource,
  onAdd,
  onLibrary,
}: {
  sources: Source[];
  onSource: (source: Source) => void;
  onAdd: () => void;
  onLibrary: () => void;
}) {
  return (
    <aside aria-label="Source context" className="context-panel">
      <div className="context-heading">
        <span className="eyebrow">YOUR CONTEXT</span>
        <span className="count">{sources.length}</span>
      </div>
      <h2>
        Good sources.
        <br />
        Better answers.
      </h2>
      <p>Questions search across the sources in this workspace.</p>
      <div className="source-mini-list">
        {sources.slice(0, 5).map((s, i) => (
          <button key={s.id} onClick={() => onSource(s)}>
            <span className="source-icon">
              <FileText size={18} />
            </span>
            <span>
              <strong>{s.title}</strong>
              <small>
                SOURCE {String(i + 1).padStart(2, "0")} ·{" "}
                {Math.ceil(s.content.length / 1000)} KB TEXT
              </small>
            </span>
            <ArrowUpRight size={14} />
          </button>
        ))}
      </div>
      <button className="source-add" onClick={() => onAdd()}>
        <Plus size={17} /> Add a source
      </button>
      <button className="text-button" onClick={() => onLibrary()}>
        View source library <ArrowUpRight size={14} />
      </button>
      <div className="context-note">
        <span className="quote-mark" aria-hidden="true">
          “
        </span>
        <p>A useful answer lets you check where it came from.</p>
        <span>THE BRIEFCASE PRINCIPLE</span>
      </div>
    </aside>
  );
}
