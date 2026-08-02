import { useState } from "react";
import { NotebookPen, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { CLINICAL_NOTES } from "@/data/content";

function NoteCard({ note, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 px-3.5 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-mono font-semibold text-muted-foreground">{note.date}</span>
          <h4 className="text-sm font-semibold leading-snug mt-0.5">{note.title}</h4>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
        )}
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 space-y-2.5">
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{note.body}</p>

          {note.matters && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/10 border border-primary/20">
              <Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed">
                <span className="font-semibold text-primary">Varför det spelar roll: </span>
                {note.matters}
              </p>
            </div>
          )}

          {note.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-medium text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClinicalNotes() {
  if (!CLINICAL_NOTES || CLINICAL_NOTES.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/20">
            <NotebookPen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Att hålla i minnet</h3>
            <p className="text-xs text-muted-foreground">
              Resonemang bakom tidigare beslut – så att de inte behöver härledas om
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {CLINICAL_NOTES.map((note, i) => (
          <NoteCard key={note.id} note={note} defaultOpen={i === 0} />
        ))}
      </div>
    </div>
  );
}
