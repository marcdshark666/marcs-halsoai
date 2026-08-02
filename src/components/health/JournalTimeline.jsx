import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { FileText, Stethoscope, FlaskConical, Phone, Pill, AlertCircle, ArrowRight, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";

const typeIcons = {
  besök: Stethoscope,
  remiss: ArrowRight,
  provsvar: FlaskConical,
  uppföljning: FileText,
  akut: AlertCircle,
  telefon: Phone,
  recept: Pill,
};

const PAGE_SIZE = 10;

export default function JournalTimeline({ entries }) {
  const [expanded, setExpanded] = useState(null);
  const [typeFilter, setTypeFilter] = useState("alla");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const sorted = useMemo(
    () => [...(entries || [])].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [entries]
  );

  // Typfilter byggs från datan så att bara förekommande typer visas.
  const typeCounts = useMemo(() => {
    const counts = {};
    sorted.forEach((e) => {
      const t = e.type || "övrigt";
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [sorted]);

  if (!entries || entries.length === 0) {
    return <p className="text-sm text-muted-foreground p-4">Inga journalanteckningar</p>;
  }

  const filtered = typeFilter === "alla" ? sorted : sorted.filter((e) => (e.type || "övrigt") === typeFilter);
  const visible = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visible.length;

  const selectFilter = (t) => {
    setTypeFilter(t);
    setVisibleCount(PAGE_SIZE);
    setExpanded(null);
  };

  return (
    <div>
      {/* Typfilter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
        <button
          onClick={() => selectFilter("alla")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
            typeFilter === "alla" ? "bg-primary text-white shadow-sm" : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          Alla ({sorted.length})
        </button>
        {Object.entries(typeCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([t, count]) => (
            <button
              key={t}
              onClick={() => selectFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                typeFilter === t ? "bg-primary text-white shadow-sm" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)} ({count})
            </button>
          ))}
      </div>

      <div className="space-y-1">
        {visible.map((entry) => {
          const Icon = typeIcons[entry.type] || FileText;
          const isOpen = expanded === entry.id;

          return (
            // div + klickbar rubrikrad (inte <button> runt allt) så att
            // journaltexten går att markera och kopiera.
            <div
              key={entry.id}
              className={`flex gap-4 p-3 rounded-lg transition-all ${isOpen ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"}`}
            >
              <div className="flex flex-col items-center pt-0.5">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                {!isOpen && <div className="w-px flex-1 bg-border mt-1" />}
              </div>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => setExpanded(isOpen ? null : entry.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold truncate">{entry.title}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                      {entry.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{format(new Date(entry.date), "d MMM yyyy", { locale: sv })}</span>
                    {entry.clinic && <span>• {entry.clinic}</span>}
                    {entry.doctor && <span>• {entry.doctor}</span>}
                  </div>
                </button>
                {isOpen && entry.content && (
                  <p className="mt-2 text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed select-text">
                    {entry.content}
                  </p>
                )}
                {isOpen && entry.icd_codes?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {entry.icd_codes.map((code) => (
                      <Badge key={code} variant="secondary" className="text-[10px]">{code}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {remaining > 0 && (
        <button
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="w-full mt-2 py-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary/40 hover:bg-secondary/70 transition-colors flex items-center justify-center gap-1.5"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          Visa fler ({remaining} kvar)
        </button>
      )}
    </div>
  );
}
