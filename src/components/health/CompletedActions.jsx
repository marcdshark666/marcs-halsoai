import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

const typeIcons = {
  blodprov: "🧪",
  undersökning: "🩺",
  besök: "👤",
  remiss: "📋",
  recept: "💊",
};

export default function CompletedActions() {
  const [expanded, setExpanded] = useState(true);

  const queryClient = useQueryClient();

  const { data: actions = [] } = useQuery({
    queryKey: ["upcomingActions"],
    queryFn: () => base44.entities.UpcomingAction.list("due_date", 500),
  });

  const undoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UpcomingAction.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["upcomingActions"] }),
  });

  const completed = actions
    .filter(a => a.is_completed)
    .sort((a, b) => new Date(b.due_date) - new Date(a.due_date));

  const handleUndo = (action) => {
    undoMutation.mutate({ id: action.id, data: { ...action, is_completed: false } });
  };

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border-b border-border"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/20">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-left">
            <h3 className="text-base font-semibold">Genomförda besök & åtgärder</h3>
            <p className="text-xs text-muted-foreground">{completed.length} klara</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="p-4 max-h-[300px] overflow-y-auto space-y-2">
          {completed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="w-7 h-7 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Inga genomförda åtgärder ännu</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">Tryck på <span className="text-emerald-500 font-medium">Klart</span> på en åtgärd så flyttas den hit</p>
            </div>
          ) : (
            completed.map(action => {
              const displayDate = new Date(action.completed_date || action.due_date);
              return (
                <div
                  key={action.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15"
                >
                  <div className="flex flex-col items-center min-w-[48px] pr-3 border-r border-emerald-500/20">
                    <span className="text-[10px] uppercase text-emerald-500 font-semibold">
                      {format(displayDate, "MMM", { locale: sv })}
                    </span>
                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 leading-none">
                      {format(displayDate, "d")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{typeIcons[action.type] || "📋"}</span>
                      <span className="text-sm font-semibold text-foreground line-through decoration-emerald-500/50">
                        {action.title}
                      </span>
                    </div>
                    {action.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{action.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleUndo(action)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/70 transition-colors text-xs font-medium"
                    title="Ångra – markera som ej genomförd"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Ångra
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}