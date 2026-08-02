import { useState, useEffect } from "react";
import { Sun, Moon, Droplet, HeartPulse, AlertTriangle, CheckCircle2, Activity, Eye, Pill } from "lucide-react";
import { DAILY_CHECKLIST_TASKS, CHECKLIST_ALERT_NOTE } from "@/data/content";

const STORAGE_KEY = "marc_daily_checklist";

const ICONS = {
  heart: HeartPulse,
  droplet: Droplet,
  alert: AlertTriangle,
  activity: Activity,
  eye: Eye,
  pill: Pill,
};

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

export default function DailyChecklist() {
  const [checked, setChecked] = useState({});

  // Kryssen nollställs automatiskt vid dygnsskifte.
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.date === todayKey()) {
        setChecked(data.items || {});
      } else {
        setChecked({});
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: todayKey(), items: checked }));
  }, [checked]);

  const toggle = (id) => {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const morningTasks = DAILY_CHECKLIST_TASKS.filter(t => t.period === "morgon");
  const eveningTasks = DAILY_CHECKLIST_TASKS.filter(t => t.period === "kväll");
  const bleedTasks = DAILY_CHECKLIST_TASKS.filter(t => t.period === "infektionstecken");

  const completedCount = DAILY_CHECKLIST_TASKS.filter(t => checked[t.id]).length;
  const bleedFlagged = bleedTasks.filter(t => checked[t.id]).length;

  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold font-heading flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <CheckCircle2 className="w-4 h-4" />
          Daglig checklista
        </h2>
        <span className="text-xs text-muted-foreground">{completedCount}/{DAILY_CHECKLIST_TASKS.length} klara</span>
      </div>

      {DAILY_CHECKLIST_TASKS.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Inga checkpunkter inlagda</p>
      ) : (
        <>
          {bleedFlagged > 0 && (
            <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/40 dark:border-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <span className="text-xs font-medium text-red-700 dark:text-red-400">
                Infektionstecken noterat – ta med det till nästa besök, och sök vård om det förvärras
              </span>
            </div>
          )}

          <div className="space-y-4">
            <ChecklistGroup title="Morgon" icon={Sun} tasks={morningTasks} checked={checked} onToggle={toggle} />
            <ChecklistGroup title="Kväll" icon={Moon} tasks={eveningTasks} checked={checked} onToggle={toggle} />
            <ChecklistGroup
              title="Infektionstecken"
              icon={AlertTriangle}
              tasks={bleedTasks}
              checked={checked}
              onToggle={toggle}
              danger
              note={CHECKLIST_ALERT_NOTE}
            />
          </div>
        </>
      )}
    </div>
  );
}

function ChecklistGroup({ title, icon: Icon, tasks, checked, onToggle, danger, note }) {
  if (tasks.length === 0) return null;
  return (
    <div>
      <div className={`flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-wider ${danger ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
        <Icon className={`w-3.5 h-3.5 ${danger ? "text-red-500" : "text-amber-500"}`} />
        {title}
      </div>
      {note && <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">{note}</p>}
      <div className="space-y-1.5">
        {tasks.map(task => {
          const isDone = checked[task.id];
          const TaskIcon = ICONS[task.icon] || CheckCircle2;
          return (
            <button
              key={task.id}
              onClick={() => onToggle(task.id)}
              className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border transition-all text-left ${
                isDone
                  ? danger
                    ? "bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800"
                    : "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
                  : "bg-muted/40 border-border hover:bg-muted/70"
              }`}
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                isDone
                  ? danger ? "bg-red-500 border-red-500" : "bg-emerald-500 border-emerald-500"
                  : "border-muted-foreground/30"
              }`}>
                {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </div>
              <TaskIcon className={`w-4 h-4 flex-shrink-0 ${danger ? "text-red-400" : "text-muted-foreground"}`} />
              <span className={`text-sm ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {task.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
