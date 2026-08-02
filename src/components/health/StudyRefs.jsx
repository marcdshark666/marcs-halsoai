import { BookOpen } from "lucide-react";
import { EVIDENCE_CORPUS } from "@/data/content";

// Klick på en studiereferens i en åtgärd scrollar ner till samma studie i
// evidensbanken och markerar den. EvidenceSearch lyssnar på händelsen och
// nollställer sitt kategorifilter först, så att studien garanterat är renderad.
export const STUDY_EVENT = "visa-studie";

export function visaStudie(id) {
  window.dispatchEvent(new CustomEvent(STUDY_EVENT, { detail: { id } }));
}

export default function StudyRefs({ refs = [], label = "Underlag" }) {
  const items = (refs || [])
    .map((id) => EVIDENCE_CORPUS.find((item) => item.id === id))
    .filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}:
      </span>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={(e) => {
            e.stopPropagation();
            visaStudie(item.id);
          }}
          title={item.source}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors"
        >
          <BookOpen className="w-3 h-3" />
          {item.short || item.title}
        </button>
      ))}
    </div>
  );
}
