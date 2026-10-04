import { MessagesSquare } from "lucide-react";
export default function Brand() {
  return (
    <div className="brand">
      <span className="brand-icon">
        <MessagesSquare size={19} />
      </span>
      <span>
        interview lab<span className="brand-period">.</span>
      </span>
    </div>
  );
}
