import { useState, useEffect, useRef } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Sparkles, Plus, CheckCircle2, AlertCircle, Clock, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { format, addDays, addWeeks, addMonths, differenceInDays, formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";

const CACHE_KEY = "ai_followup_cache";
const STALE_DAYS = 7;

const URGENCY_STYLES = {
  akut:  { border: "border-rose-500/40",   bg: "bg-rose-500/8",   badge: "bg-rose-500/20 text-rose-400",    icon: AlertCircle, iconColor: "text-rose-400" },
  hög:   { border: "border-amber-500/40",  bg: "bg-amber-500/8",  badge: "bg-amber-500/20 text-amber-400",  icon: AlertCircle, iconColor: "text-amber-400" },
  medel: { border: "border-violet-500/30", bg: "bg-violet-500/6", badge: "bg-violet-500/20 text-violet-400", icon: Clock,       iconColor: "text-violet-400" },
  låg:   { border: "border-border",        bg: "bg-secondary/40", badge: "bg-muted text-muted-foreground",   icon: Clock,       iconColor: "text-muted-foreground" },
};

function computeDueDate(timeframe) {
  const today = new Date();
  if (!timeframe) return format(addWeeks(today, 4), "yyyy-MM-dd");
  const t = timeframe.toLowerCase();
  if (t.includes("vecka") || t.includes("week")) return format(addWeeks(today, parseInt(t) || 2), "yyyy-MM-dd");
  if (t.includes("månad") || t.includes("month")) return format(addMonths(today, parseInt(t) || 1), "yyyy-MM-dd");
  if (t.includes("dag") || t.includes("day")) return format(addDays(today, parseInt(t) || 7), "yyyy-MM-dd");
  return format(addWeeks(today, 4), "yyyy-MM-dd");
}

// Simple hash of journal entries to detect new ones
function journalHash(entries) {
  return entries.map(e => e.id + e.date).join("|");
}

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || null; } catch { return null; }
}
function saveCache(data) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

export default function AIFollowUpRecommendations({ journalEntries, upcomingActions }) {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [added, setAdded] = useState({});
  const [lastAnalyzed, setLastAnalyzed] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const queryClient = useQueryClient();
  const hasAutoAnalyzed = useRef(false);

  // On mount + when journal changes: check cache and decide whether to auto-analyze
  useEffect(() => {
    if (!journalEntries || journalEntries.length === 0) return;

    const cache = loadCache();
    const currentHash = journalHash(journalEntries);

    if (cache) {
      const analyzedAt = new Date(cache.analyzedAt);
      const daysSince = differenceInDays(new Date(), analyzedAt);
      const journalChanged = cache.journalHash !== currentHash;
      const weekPassed = daysSince >= STALE_DAYS;

      setLastAnalyzed(analyzedAt);

      if (journalChanged || weekPassed) {
        // New journal entries added, or it's been a week — re-analyze
        setIsStale(true);
        if (!hasAutoAnalyzed.current) {
          hasAutoAnalyzed.current = true;
          runAnalysis(journalEntries, upcomingActions, currentHash);
        }
      } else {
        // Use cached results
        setRecommendations(cache.recommendations);
        setIsStale(false);
      }
    } else {
      // No cache at all — auto-analyze on first load
      if (!hasAutoAnalyzed.current) {
        hasAutoAnalyzed.current = true;
        runAnalysis(journalEntries, upcomingActions, currentHash);
      }
    }
   
  }, [journalEntries.length]);

  const runAnalysis = async (entries, actions, hash) => {
    setLoading(true);
    setAdded({});
    try {
      const entriesText = entries
        .slice(0, 20)
        .map(e => `[${e.date}] ${e.type?.toUpperCase() || "BESÖK"}: ${e.title}\n${e.content || ""}`)
        .join("\n\n---\n\n");

      const existingTitles = actions
        .filter(a => !a.is_completed)
        .map(a => a.title)
        .join(", ");

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Du är en klinisk assistent som analyserar patientjournaler och identifierar viktiga uppföljningar.

JOURNALANTECKNINGAR (nyast först):
${entriesText}

BEFINTLIGA PLANERADE ÅTGÄRDER (undvik att duplicera dessa):
${existingTitles || "Inga"}

Analysera journalen och identifiera de viktigaste uppföljningsåtgärderna som SAKNAS i befintliga åtgärder.
Fokusera på: blodprov, remisser, läkarbesök, medicinuppföljning, undersökningar.

Returnera max 6 rekommendationer, sorterade efter prioritet (viktigast först).
För varje rekommendation:
- title: kort, konkret åtgärd (max 8 ord)
- reason: varför detta behövs baserat på journalen (1-2 meningar)
- timeframe: när bör detta ske (t.ex. "2 veckor", "1 månad", "3 månader")
- priority: "akut" | "hög" | "medel" | "låg"
- type: "blodprov" | "undersökning" | "besök" | "remiss" | "recept"
- value_assessment: kort bedömning av kliniskt värde (1 mening)`,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  reason: { type: "string" },
                  timeframe: { type: "string" },
                  priority: { type: "string" },
                  type: { type: "string" },
                  value_assessment: { type: "string" },
                }
              }
            }
          }
        }
      });

      const recs = result.recommendations || [];
      const now = new Date();
      setRecommendations(recs);
      setLastAnalyzed(now);
      setIsStale(false);
      saveCache({ recommendations: recs, analyzedAt: now.toISOString(), journalHash: hash });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleManualAnalyze = () => {
    hasAutoAnalyzed.current = true;
    runAnalysis(journalEntries, upcomingActions, journalHash(journalEntries));
  };

  const addAction = useMutation({
    mutationFn: (data) => base44.entities.UpcomingAction.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["upcomingActions"] }),
  });

  const handleAdd = async (rec, idx) => {
    await addAction.mutateAsync({
      title: rec.title,
      description: rec.reason,
      due_date: computeDueDate(rec.timeframe),
      type: rec.type || "besök",
      priority: rec.priority || "medel",
      is_completed: false,
    });
    setAdded(prev => ({ ...prev, [idx]: true }));
  };

  const nextUpdateLabel = lastAnalyzed
    ? format(addDays(lastAnalyzed, STALE_DAYS), "d MMM", { locale: sv })
    : null;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-violet-500/10 via-primary/5 to-violet-500/10 border-b border-border"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-violet-500/20">
            <Sparkles className={`w-5 h-5 text-violet-400 ${loading ? "animate-spin" : ""}`} />
          </div>
          <div className="text-left">
            <h3 className="text-base font-semibold">AI-rekommenderade uppföljningar</h3>
            <p className="text-xs text-muted-foreground">
              {loading
                ? "Analyserar journal..."
                : recommendations
                  ? `${recommendations.length} förslag · uppdateras ${nextUpdateLabel || "snart"}`
                  : "Automatisk veckoanalys av journalen"}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="p-4">
          {loading && (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-7 h-7 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Analyserar journalanteckningar...</p>
            </div>
          )}

          {!loading && recommendations && (
            <div className="space-y-3">
              {/* Last analyzed info */}
              {lastAnalyzed && (
                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 pb-1">
                  <span>
                    Senast analyserad: {formatDistanceToNow(lastAnalyzed, { locale: sv, addSuffix: true })}
                    {isStale && <span className="ml-1 text-amber-400">(uppdaterades)</span>}
                  </span>
                  <button
                    onClick={handleManualAnalyze}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Uppdatera nu
                  </button>
                </div>
              )}

              {recommendations.map((rec, idx) => {
                const style = URGENCY_STYLES[rec.priority] || URGENCY_STYLES.medel;
                const Icon = style.icon;
                const isAdded = added[idx];
                return (
                  <div key={idx} className={`rounded-xl border p-3.5 ${style.border} ${style.bg}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${style.iconColor}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{rec.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{rec.reason}</p>
                          <p className="text-xs text-muted-foreground/70 mt-1 italic">{rec.value_assessment}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>{rec.priority}</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />{rec.timeframe}
                            </span>
                            <span className="text-[10px] text-muted-foreground">· {rec.type}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAdd(rec, idx)}
                        disabled={isAdded}
                        className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                          isAdded
                            ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                            : "bg-primary/20 text-primary hover:bg-primary/30"
                        }`}
                      >
                        {isAdded ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {isAdded ? "Tillagd" : "Lägg till"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && !recommendations && (
            <div className="flex flex-col items-center py-6 text-center gap-3">
              <Sparkles className="w-8 h-8 text-violet-400/60" />
              <p className="text-sm text-muted-foreground max-w-[260px]">
                Laddar journaldata för analys...
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}