import { useMemo } from "react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { FlaskConical, AlertTriangle, ShieldAlert, CheckCircle2, CalendarClock, TrendingUp, TrendingDown } from "lucide-react";

const CATEGORY_LABELS = {
  hematologi: "Hematologi",
  kemi: "Kemi",
  diabetes: "Diabetes",
  tyreoida: "Tyreoida",
  njure: "Njure",
  lever: "Lever",
  "hjärta": "Hjärta",
  lipider: "Lipider",
  "övrigt": "Övrigt",
};

function StatTile({ icon: Icon, label, value, sub, tone = "default" }) {
  const tones = {
    default: "text-foreground",
    danger: "text-red-400",
    warning: "text-amber-400",
    success: "text-emerald-400",
  };
  return (
    <div className="flex-1 min-w-[130px] p-3.5 rounded-xl bg-secondary/40 border border-border/60">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className={`text-2xl font-bold leading-none ${tones[tone]}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1.5">{sub}</div>}
    </div>
  );
}

// Statistiköversikt över senaste labbvärden: KPI-rad + fördelning per kategori.
// `latestValues` = senaste resultat per unikt test, `seriesByTest` = hela historiken.
export default function StatsOverview({ latestByTest, seriesByTest, labResults, category, onSelectCategory }) {
  const stats = useMemo(() => {
    const latest = Object.values(latestByTest);
    const abnormal = latest.filter(v => v.status !== "normal");
    const critical = latest.filter(v => v.status === "critical_low" || v.status === "critical_high");

    // Trendriktning: jämför senaste två mätningarna per test
    let improving = 0, worsening = 0;
    Object.values(seriesByTest).forEach(series => {
      if (series.length < 2) return;
      const last = series[series.length - 1];
      const prev = series[series.length - 2];
      if (last.status === "normal" && prev.status !== "normal") improving++;
      if (last.status !== "normal" && prev.status === "normal") worsening++;
    });

    const latestDate = labResults.reduce((max, r) => (r.sample_date > max ? r.sample_date : max), "");

    // Per kategori: antal unika tester + andel avvikande
    const byCategory = {};
    latest.forEach(v => {
      const cat = v.category || "övrigt";
      if (!byCategory[cat]) byCategory[cat] = { total: 0, abnormal: 0 };
      byCategory[cat].total++;
      if (v.status !== "normal") byCategory[cat].abnormal++;
    });

    return {
      uniqueTests: latest.length,
      totalSamples: labResults.length,
      abnormal: abnormal.length,
      critical: critical.length,
      normalShare: latest.length ? Math.round(((latest.length - abnormal.length) / latest.length) * 100) : 0,
      improving,
      worsening,
      latestDate,
      byCategory,
    };
  }, [latestByTest, seriesByTest, labResults]);

  const categories = Object.entries(stats.byCategory).sort((a, b) => b[1].abnormal - a[1].abnormal || b[1].total - a[1].total);

  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Statistiköversikt</h3>
        {stats.latestDate && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="w-3.5 h-3.5" />
            Senaste prov: {format(new Date(stats.latestDate), "d MMM yyyy", { locale: sv })}
          </span>
        )}
      </div>

      {/* KPI-rad */}
      <div className="flex flex-wrap gap-2.5 mb-4">
        <StatTile icon={FlaskConical} label="Unika tester" value={stats.uniqueTests} sub={`${stats.totalSamples} mätningar totalt`} />
        <StatTile
          icon={AlertTriangle}
          label="Avvikande"
          value={stats.abnormal}
          sub={`${stats.normalShare}% inom referens`}
          tone={stats.abnormal > 0 ? "warning" : "success"}
        />
        <StatTile
          icon={ShieldAlert}
          label="Kritiska"
          value={stats.critical}
          sub={stats.critical === 0 ? "Inga kritiska värden" : "Kräver åtgärd"}
          tone={stats.critical > 0 ? "danger" : "success"}
        />
        <StatTile
          icon={stats.worsening > 0 ? TrendingDown : TrendingUp}
          label="Sedan förra provet"
          value={stats.worsening > 0 ? `${stats.worsening} nya avvik.` : stats.improving > 0 ? `${stats.improving} normalis.` : "Oförändrat"}
          sub={`${stats.improving} normaliserade · ${stats.worsening} nya avvikelser`}
          tone={stats.worsening > 0 ? "warning" : "success"}
        />
      </div>

      {/* Fördelning per kategori */}
      <div className="space-y-1.5">
        {categories.map(([cat, { total, abnormal }]) => {
          const isActive = category === cat;
          const abnormalShare = total ? (abnormal / total) * 100 : 0;
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory?.(isActive ? "alla" : cat)}
              className={`w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg transition-colors text-left ${
                isActive ? "bg-primary/15 ring-1 ring-primary/30" : "hover:bg-secondary/60"
              }`}
              title={isActive ? "Klicka för att visa alla kategorier" : `Filtrera på ${CATEGORY_LABELS[cat] || cat}`}
            >
              <span className="text-xs font-medium w-24 shrink-0 truncate">{CATEGORY_LABELS[cat] || cat}</span>
              <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden flex">
                <div className="h-full bg-red-500/80" style={{ width: `${abnormalShare}%` }} />
                <div className="h-full bg-emerald-500/50" style={{ width: `${100 - abnormalShare}%` }} />
              </div>
              <span className="text-[11px] text-muted-foreground font-mono w-20 text-right shrink-0">
                {abnormal > 0 ? `${abnormal} avvik. / ${total}` : `${total} normala`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Ett tomt provregister får inte se ut som ett friskintyg. */}
      {stats.uniqueTests === 0 ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 opacity-40" />
          Inga provsvar inlagda ännu – siffrorna ovan är därför nollor, inte normalvärden.
        </div>
      ) : stats.critical === 0 && stats.abnormal === 0 ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          Alla senaste provsvar ligger inom referensintervallen.
        </div>
      ) : null}
    </div>
  );
}
