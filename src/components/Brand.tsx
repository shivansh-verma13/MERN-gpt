import { BriefcaseBusiness } from "lucide-react";
export default function Brand() {
  return (
    <div className="brand">
      <span className="brand-icon">
        <BriefcaseBusiness size={19} />
      </span>
      <span>
        briefcase<span className="brand-period">.</span>
      </span>
    </div>
  );
}
