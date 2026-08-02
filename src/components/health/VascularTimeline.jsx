import { Activity, Scissors, Microscope, GitBranch, AlertTriangle, Route } from "lucide-react";
import { VASCULAR_TIMELINE } from "@/data/content";

// Färg och ikon per händelsetyp. "lucka" markeras röd eftersom det är just
// glappen i uppföljningen som är den kliniskt intressanta signalen här.
const KIND_STYLES = {
  händelse: { icon: Activity, dot: "bg-rose-500", text: "text-rose-400", label: "Händelse" },
  utredning: { icon: Microscope, dot: "bg-cyan-500", text: "text-cyan-400", label: "Utredning" },
  operation: { icon: Scissors, dot: "bg-violet-500", text: "text-violet-400", label: "Ingrepp" },
  beslut: { icon: GitBranch, dot: "bg-emerald-500", text: "text-emerald-400", label: "Beslut" },
  lucka: { icon: AlertTriangle, dot: "bg-red-500", text: "text-red-400", label: "Lucka" },
};

export default function VascularTimeline() {
  if (!VASCULAR_TIMELINE || VASCULAR_TIMELINE.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-r from-rose-500/10 via-primary/10 to-rose-500/10 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/20">
            <Route className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Sjukdomsförloppet i sammandrag</h3>
            <p className="text-xs text-muted-foreground">
              Från första reseassocierade proppen till dagens fyraåriga uppföljningsglapp
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="relative">
          {/* Lodrät linje genom hela förloppet */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

          <div className="space-y-4">
            {VASCULAR_TIMELINE.map((item, i) => {
              const style = KIND_STYLES[item.kind] || KIND_STYLES.händelse;
              const Icon = style.icon;
              return (
                <div key={i} className="relative pl-7">
                  <span
                    className={`absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full ${style.dot} ring-4 ring-card`}
                  />
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-[11px] font-mono font-semibold text-muted-foreground">
                      {item.date}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${style.text}`}>
                      <Icon className="w-3 h-3" />
                      {style.label}
                    </span>
                  </div>
                  <h4 className={`text-sm font-semibold leading-snug mt-0.5 ${item.kind === "lucka" ? "text-red-400" : ""}`}>
                    {item.title}
                  </h4>
                  {item.actors && (
                    <p className="text-[11px] text-muted-foreground/80 italic mt-0.5">{item.actors}</p>
                  )}
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
