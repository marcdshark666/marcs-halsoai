import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, X, CheckCircle2, ChevronDown, ChevronUp, Sparkles, BellRing } from "lucide-react";
import { differenceInDays, format, isToday } from "date-fns";
import { sv } from "date-fns/locale";

const CACHE_KEY = "ai_followup_cache";
const AI_NOTIFY_KEY = "ai_notify_dismissed";

function getAINotification() {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (!cache) return null;
    const recs = cache.recommendations || [];
    // Find most urgent unnotified recommendation
    const urgent = recs.find(r => r.priority === "akut" || r.priority === "hög");
    if (!urgent) return null;
    // Check if analyzed recently (within last 2 days = fresh/new)
    const analyzedAt = new Date(cache.analyzedAt);
    const daysSince = differenceInDays(new Date(), analyzedAt);
    return { rec: urgent, daysSince };
  } catch { return null; }
}

function AINotificationBadge() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(AI_NOTIFY_KEY) || ""; } catch { return ""; }
  });

  const notification = getAINotification();
  if (!notification) return null;

  const dismissKey = notification.rec.title;
  if (dismissed === dismissKey) return null;

  const isNew = notification.daysSince <= 2;
  const isOld = notification.daysSince >= 5;

  const handleDismiss = () => {
    localStorage.setItem(AI_NOTIFY_KEY, dismissKey);
    setDismissed(dismissKey);
  };

  return (
    <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium flex-1 min-w-0 ${
      isNew
        ? "bg-violet-500/10 border-violet-500/40 text-violet-300"
        : isOld
        ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
        : "bg-primary/10 border-primary/30 text-primary"
    }`}>
      {isNew ? (
        <BellRing className="w-4 h-4 shrink-0 animate-pulse" />
      ) : (
        <Sparkles className="w-4 h-4 shrink-0" />
      )}
      <span className="truncate">
        {isNew
          ? `Nytt AI-fynd: ${notification.rec.title}`
          : isOld
          ? `Glömd uppföljning: ${notification.rec.title} (${notification.daysSince} dagar sedan)`
          : `AI-förslag: ${notification.rec.title}`
        }
      </span>
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-current/10 shrink-0">
        {notification.rec.priority}
      </span>
      <button onClick={handleDismiss} className="ml-auto shrink-0 opacity-60 hover:opacity-100 transition-opacity">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function OverdueAlert() {
  const [dismissed, setDismissed] = useState([]);
  const [expanded, setExpanded] = useState(true);

  const queryClient = useQueryClient();

  const { data: actions = [] } = useQuery({
    queryKey: ["upcomingActions"],
    queryFn: () => base44.entities.UpcomingAction.list("due_date", 500),
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UpcomingAction.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["upcomingActions"] }),
  });

  const now = new Date();

  const overdue = actions
    .filter(a => !a.is_completed && !a.is_paused)
    .filter(a => {
      const due = new Date(a.due_date);
      return due < now && !isToday(due);
    })
    .filter(a => !dismissed.includes(a.id))
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  const handleComplete = (action) => {
    // Sätt faktiskt genomförandedatum – annars faller CompletedActions
    // tillbaka på due_date och visar fel datum.
    const today = new Date().toISOString().slice(0, 10);
    completeMutation.mutate({ id: action.id, data: { ...action, is_completed: true, completed_date: today } });
  };

  const handleDismiss = (id) => {
    setDismissed(prev => [...prev, id]);
  };

  const aiNotification = getAINotification();
  const hasAI = !!aiNotification;

  if (overdue.length === 0 && !hasAI) return null;

  if (overdue.length === 0 && hasAI) {
    return (
      <div className="mb-5 flex gap-3">
        <AINotificationBadge />
      </div>
    );
  }

  return (
    <div className="mb-5 space-y-3">
      {/* Same-row: overdue count + AI notification */}
      <div className="flex items-stretch gap-3">
        <div className="rounded-2xl border-2 border-red-500 bg-red-500/10 overflow-hidden animate-overdue-blink flex-shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="h-full flex items-center gap-3 px-4 py-3 bg-red-500/20 hover:bg-red-500/25 transition-colors"
          >
            <div className="relative shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
            </div>
            <p className="text-sm font-bold text-red-500 whitespace-nowrap">
              {overdue.length} missad{overdue.length > 1 ? "e" : ""}
            </p>
            {expanded ? <ChevronUp className="w-4 h-4 text-red-500" /> : <ChevronDown className="w-4 h-4 text-red-500" />}
          </button>
        </div>
        <AINotificationBadge />
      </div>

      {/* Expanded overdue list */}
      {expanded && (
      <div className="rounded-2xl border-2 border-red-500 bg-red-500/10 overflow-hidden animate-overdue-blink">
          <div className="p-3 space-y-2">
            {overdue.map(action => {
              const dueDate = new Date(action.due_date);
              const daysOverdue = Math.abs(differenceInDays(dueDate, now));
              return (
                <div
                  key={action.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-card border border-red-500/30"
                >
                  <div className="flex flex-col items-center min-w-[48px] pr-3 border-r border-red-500/20">
                    <span className="text-[10px] uppercase text-red-500 font-semibold">
                      {format(dueDate, "MMM", { locale: sv })}
                    </span>
                    <span className="text-xl font-bold text-red-600 dark:text-red-400 leading-none">
                      {format(dueDate, "d")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{action.title}</p>
                    {action.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                    )}
                    <p className="text-xs text-red-500 font-medium mt-1">
                      {daysOverdue} dag{daysOverdue > 1 ? "ar" : ""} försenad
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => handleComplete(action)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30 transition-colors text-xs font-medium"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Klart
                    </button>
                    <button
                      onClick={() => handleDismiss(action.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/70 transition-colors text-xs font-medium"
                    >
                      <X className="w-3.5 h-3.5" />
                      Stäng
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}