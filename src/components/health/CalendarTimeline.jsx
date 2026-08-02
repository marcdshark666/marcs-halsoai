import { useState, useEffect } from "react";
import { differenceInDays, format, isPast, isToday, isTomorrow } from "date-fns";
import { sv } from "date-fns/locale";
import { Calendar, Clock, AlertCircle, CheckCircle2, Stethoscope, FlaskConical, ArrowRight, User, RotateCcw, Trash2, PauseCircle, MapPin, X, ChevronDown, ChevronUp, BookOpen, HeartPulse, Microscope, ScanLine, Activity } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import CompleteDateModal from "@/components/health/CompleteDateModal";
import StudyRefs from "@/components/health/StudyRefs";

const typeIcons = {
  blodprov: FlaskConical,
  undersökning: Stethoscope,
  besök: User,
  remiss: ArrowRight,
  recept: ArrowRight,
  egenvård: HeartPulse,
  odling: Microscope,
  bilddiagnostik: ScanLine,
  fysiologi: Activity,
};

const priorityStyles = {
  akut: { dot: "bg-rose-500", border: "border-rose-200 dark:border-rose-800", bg: "bg-rose-50/50 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-400" },
  hög: { dot: "bg-amber-500", border: "border-amber-200 dark:border-amber-800", bg: "bg-amber-50/50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400" },
  medel: { dot: "bg-violet-500", border: "border-violet-200 dark:border-violet-800", bg: "bg-violet-50/40 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-400" },
  låg: { dot: "bg-slate-400", border: "border-slate-200 dark:border-slate-700", bg: "bg-slate-50/50 dark:bg-slate-800/30", text: "text-slate-600 dark:text-slate-400" },
};

// Liten dialog för att omkoordinera en åtgärd till annan plats/utförare.
function RelocateModal({ action, onConfirm, onCancel }) {
  const [location, setLocation] = useState(action.location || "");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Omkoordinera
          </h4>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{action.title}</p>
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ny plats/utförare</label>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          autoFocus
          placeholder="t.ex. Sollentuna fysiologi"
          onKeyDown={(e) => e.key === "Enter" && location.trim() && onConfirm(location.trim())}
          className="w-full mt-1 mb-4 px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm focus:outline-none focus:border-primary/50"
        />
        <div className="flex gap-2">
          <button
            onClick={() => location.trim() && onConfirm(location.trim())}
            disabled={!location.trim()}
            className="flex-1 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-40"
          >
            Spara plats
          </button>
          <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-secondary text-sm text-muted-foreground hover:text-foreground">Avbryt</button>
        </div>
      </div>
    </div>
  );
}

// Bekräftelsedialog för radering.
function DeleteModal({ action, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-red-400">
          <Trash2 className="w-4 h-4" />
          Radera åtgärd?
        </h4>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">"{action.title}" tas bort permanent från listan.</p>
        <div className="flex gap-2">
          <button onClick={onConfirm} className="flex-1 px-4 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-semibold">
            Ja, radera
          </button>
          <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-secondary text-sm text-muted-foreground hover:text-foreground">Avbryt</button>
        </div>
      </div>
    </div>
  );
}

function ActionRow({ action, now, onComplete, onUndo, onDelete, onPauseToggle, onRelocate, done = false }) {
  // Motiveringen ("varför") och studieknapparna är hopfällda tills raden klickas.
  const [open, setOpen] = useState(false);
  const dueDate = new Date(action.due_date);
  const daysLeft = differenceInDays(dueDate, now);
  const paused = !!action.is_paused;
  const overdue = isPast(dueDate) && !isToday(dueDate) && !done && !paused;
  const isTodayItem = isToday(dueDate);
  const isTomorrowItem = isTomorrow(dueDate);

  const style = priorityStyles[action.priority || "medel"];
  const Icon = typeIcons[action.type] || Calendar;

  let countdownLabel;
  let countdownColor = style.text;
  if (done) {
    countdownLabel = "Genomförd";
    countdownColor = "text-emerald-600 dark:text-emerald-400";
  } else if (paused) {
    countdownLabel = "Pausad";
    countdownColor = "text-muted-foreground";
  } else if (overdue) {
    countdownLabel = `${Math.abs(daysLeft)} dag${Math.abs(daysLeft) !== 1 ? "ar" : ""} försenad`;
    countdownColor = "text-rose-600";
  } else if (isTodayItem) {
    countdownLabel = "Idag";
    countdownColor = "text-rose-600 font-bold";
  } else if (isTomorrowItem) {
    countdownLabel = "Imorgon";
    countdownColor = "text-amber-600 font-semibold";
  } else if (daysLeft <= 7) {
    countdownLabel = `${daysLeft} dag${daysLeft !== 1 ? "ar" : ""} kvar`;
    countdownColor = "text-amber-600";
  } else if (daysLeft <= 30) {
    countdownLabel = `${daysLeft} dagar kvar`;
  } else {
    const months = Math.round(daysLeft / 30);
    countdownLabel = `~${months} mån${months !== 1 ? "ader" : "ad"} kvar`;
  }

  return (
    <div
      className={`relative flex items-stretch gap-3 p-3.5 rounded-xl border ${
        done ? "border-emerald-500/15 bg-emerald-500/5"
        : paused ? "border-border bg-secondary/30 opacity-70"
        : `${style.border} ${style.bg}`
      } transition-all hover:shadow-md hover:-translate-y-0.5 ${overdue ? "animate-item-blink-red" : ""}`}
    >
      <div className="flex flex-col items-center justify-center min-w-[56px] pr-3 border-r border-border/60">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {format(dueDate, "MMM", { locale: sv })}
        </span>
        <span className="text-2xl font-bold leading-none font-heading">
          {format(dueDate, "d")}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {format(dueDate, "yyyy")}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1.5 rounded-lg bg-white/60 dark:bg-white/5 ${style.text}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className={`text-sm font-semibold truncate ${done ? "line-through decoration-emerald-500/50 text-muted-foreground" : ""}`}>
              {action.title}
            </span>
          </div>
          <div className={`flex items-center gap-1.5 text-xs ${countdownColor} whitespace-nowrap`}>
            {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : paused ? <PauseCircle className="w-3.5 h-3.5" /> : overdue ? <AlertCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            {countdownLabel}
          </div>
        </div>
        {(action.description || action.study_refs?.length > 0) && (
          <>
            <button
              onClick={() => setOpen(v => !v)}
              className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              title={open ? "Dölj motivering" : "Visa varför den här åtgärden finns med"}
            >
              {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {open ? "Dölj motivering" : "Varför?"}
              {action.study_refs?.length > 0 && !open && (
                <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                  <BookOpen className="w-2.5 h-2.5" />
                  {action.study_refs.length} studier
                </span>
              )}
            </button>
            {open && (
              <>
                {action.description && (
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed whitespace-pre-line">{action.description}</p>
                )}
                <StudyRefs refs={action.study_refs} label="Studier" />
              </>
            )}
          </>
        )}
        {action.location && (
          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-medium">
            <MapPin className="w-3 h-3" />
            {action.location}
          </span>
        )}
        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {action.type} · {action.priority || "medel"} prioritet
            </span>
          </div>
          {done ? (
            <button
              onClick={() => onUndo(action)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted text-muted-foreground hover:bg-muted/70 transition-colors text-[11px] font-medium"
              title="Ångra – markera som ej genomförd"
            >
              <RotateCcw className="w-3 h-3" />
              Ångra
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onRelocate(action)}
                className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title="Omkoordinera – flytta till annan plats/utförare"
              >
                <MapPin className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onPauseToggle(action)}
                className={`p-1.5 rounded-lg transition-colors ${paused ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25" : "bg-orange-500/15 text-orange-400 hover:bg-orange-500/25"}`}
                title={paused ? "Återuppta åtgärden" : "Pausa åtgärden"}
              >
                {paused ? <RotateCcw className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => onDelete(action)}
                className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/25 transition-colors"
                title="Radera åtgärden"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              {!paused && (
                <button
                  onClick={() => onComplete(action)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30 transition-colors text-[11px] font-medium"
                  title="Markera som genomförd"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Klart
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GroupHeader({ icon: Icon, label, count, color, blink = false }) {
  return (
    <div className={`flex items-center gap-2 mb-2 mt-1 ${color}`}>
      <Icon className={`w-4 h-4 ${blink ? "animate-pulse" : ""}`} />
      <h4 className="text-xs font-bold uppercase tracking-wider">{label}</h4>
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-current/10">
        {count}
      </span>
    </div>
  );
}

export default function CalendarTimeline({ actions }) {
  const [now, setNow] = useState(new Date());
  const [pendingAction, setPendingAction] = useState(null);
  const [relocating, setRelocating] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["upcomingActions"] });

  const completeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UpcomingAction.update(id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.UpcomingAction.delete(id),
    onSuccess: invalidate,
  });

  const handleComplete = (action) => setPendingAction(action);

  const handleConfirmComplete = (completedDate) => {
    completeMutation.mutate({
      id: pendingAction.id,
      data: { ...pendingAction, is_completed: true, completed_date: completedDate },
    });
    setPendingAction(null);
  };

  const handlePauseToggle = (action) => {
    completeMutation.mutate({ id: action.id, data: { ...action, is_paused: !action.is_paused } });
  };

  const handleRelocateConfirm = (location) => {
    completeMutation.mutate({ id: relocating.id, data: { ...relocating, location } });
    setRelocating(null);
  };

  const handleDeleteConfirm = () => {
    deleteMutation.mutate(deleting.id);
    setDeleting(null);
  };

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  if (!actions || actions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Inga planerade åtgärder</p>
      </div>
    );
  }

  const active = actions.filter(a => !a.is_completed && !a.is_paused);
  const paused = actions.filter(a => !a.is_completed && a.is_paused)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  const overdue = active
    .filter(a => {
      const due = new Date(a.due_date);
      return due < now && !isToday(due);
    })
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  const upcoming = active
    .filter(a => {
      const due = new Date(a.due_date);
      return due >= now || isToday(due);
    })
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  const rowHandlers = {
    onComplete: handleComplete,
    onDelete: setDeleting,
    onPauseToggle: handlePauseToggle,
    onRelocate: setRelocating,
  };

  return (
    <>
      {pendingAction && (
        <CompleteDateModal
          action={pendingAction}
          onConfirm={handleConfirmComplete}
          onCancel={() => setPendingAction(null)}
        />
      )}
      {relocating && (
        <RelocateModal action={relocating} onConfirm={handleRelocateConfirm} onCancel={() => setRelocating(null)} />
      )}
      {deleting && (
        <DeleteModal action={deleting} onConfirm={handleDeleteConfirm} onCancel={() => setDeleting(null)} />
      )}
      <div className="space-y-4">
        {/* Utgångna / Försenade */}
        <div>
          <GroupHeader icon={AlertCircle} label="Utgångna / Försenade" count={overdue.length} color="text-red-600 dark:text-red-400" blink={overdue.length > 0} />
          {overdue.length === 0 ? (
            <p className="text-xs text-muted-foreground italic px-1">Inga försenade åtgärder 🎉</p>
          ) : (
            <div className="space-y-2">
              {overdue.map(action => (
                <ActionRow key={action.id} action={action} now={now} {...rowHandlers} />
              ))}
            </div>
          )}
        </div>

        {/* Pågående / Planerade */}
        <div>
          <GroupHeader icon={Clock} label="Pågående & framöver" count={upcoming.length} color="text-primary" />
          {upcoming.length === 0 ? (
            <p className="text-xs text-muted-foreground italic px-1">Inga planerade åtgärder</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map(action => (
                <ActionRow key={action.id} action={action} now={now} {...rowHandlers} />
              ))}
            </div>
          )}
        </div>

        {/* Pausade */}
        {paused.length > 0 && (
          <div>
            <GroupHeader icon={PauseCircle} label="Pausade" count={paused.length} color="text-muted-foreground" />
            <div className="space-y-2">
              {paused.map(action => (
                <ActionRow key={action.id} action={action} now={now} {...rowHandlers} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
