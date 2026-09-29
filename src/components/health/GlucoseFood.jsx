import { useMemo, useState } from "react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, ComposedChart } from "recharts";
import { Droplet, TrendingUp, TrendingDown, Minus, Utensils, AlertTriangle, Info, Moon, Sunrise, Sun, Sunset } from "lucide-react";
import { FLAG_TEXT } from "@/lib/glukos/meals";

// "Blodsocker & mat": dygnskort, trendgraf och måltidslista med kurvan efter
// maten. Datat kommer från src/api/realdata/GlucoseDay.json som fylls av det
// nattliga jobbet (tools/daglig-glukos.js). Allt är beslutsstöd – flaggorna
// beskriver kurvans FORM och är underlag för diabetesteamet, aldrig en dos.

const TIR_SEGMENTS = [
  { key: "veryLow", label: "< 3,0", color: "bg-red-600" },
  { key: "low", label: "3,0–3,8", color: "bg-red-400" },
  { key: "inRange", label: "3,9–10", color: "bg-emerald-500" },
  { key: "high", label: "10,1–13,9", color: "bg-amber-400" },
  { key: "veryHigh", label: "> 13,9", color: "bg-orange-600" },
];

const PART_ICONS = { night: Moon, morning: Sunrise, afternoon: Sun, evening: Sunset };

const sv1 = (v) => (v == null ? "–" : String(v).replace(".", ","));
const dateLabel = (d, f = "EEE d MMM") => format(new Date(`${d}T12:00:00`), f, { locale: sv });

function TirBar({ tir, height = "h-2.5" }) {
  if (!tir) return null;
  return (
    <div className={`w-full ${height} rounded-full bg-secondary overflow-hidden flex`} title="Tid i intervall">
      {TIR_SEGMENTS.map((s) => (
        <div key={s.key} className={`h-full ${s.color}`} style={{ width: `${tir[s.key] || 0}%` }} />
      ))}
    </div>
  );
}

function TrendArrow({ trend }) {
  if (!trend || trend.riktning === "okant") {
    return <span className="text-[11px] text-muted-foreground">för få dagar för trend</span>;
  }
  const up = trend.riktning === "upp", down = trend.riktning === "ner";
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
  const tone = up ? "text-amber-400" : down ? "text-emerald-400" : "text-muted-foreground";
  const sign = trend.avgDelta > 0 ? "+" : "";
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold ${tone}`} title={`Mot snittet av föregående ${trend.days} dagar`}>
      <Icon className="w-3.5 h-3.5" />
      {sign}{sv1(trend.avgDelta)} · TIR {trend.tirDelta > 0 ? "+" : ""}{trend.tirDelta} %
    </span>
  );
}

function DayCard({ day, active, onClick }) {
  const hasStats = Number.isFinite(day.avg);
  return (
    <button
      onClick={onClick}
      className={`text-left min-w-[190px] flex-1 p-3.5 rounded-xl border transition-all ${
        active ? "bg-primary/10 border-primary/40 ring-1 ring-primary/30" : "bg-secondary/40 border-border/60 hover:bg-secondary/70"
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{dateLabel(day.date)}</span>
        {day.source === "syntetisk" && <span className="text-[10px] font-bold text-orange-400">SYNTETISK</span>}
        {day.meals?.length > 0 && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Utensils className="w-3 h-3" />{day.meals.length}</span>}
      </div>
      {hasStats ? (
        <>
          <div className="flex items-end gap-1.5">
            <span className="text-2xl font-bold leading-none">{sv1(day.avg)}</span>
            <span className="text-[11px] text-muted-foreground mb-0.5">mmol/L snitt</span>
          </div>
          <div className="mt-2"><TirBar tir={day.tir} /></div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>TIR <span className="text-foreground font-semibold">{day.tir.inRange} %</span></span>
            <span>GMI {sv1(day.gmi)} %</span>
            <span>CV {day.cv} %</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <TrendArrow trend={day.trend} />
            {day.lows?.episodes > 0 && (
              <span className="text-[11px] text-red-400 font-medium">{day.lows.episodes} låg{day.lows.episodes > 1 ? "a" : ""}</span>
            )}
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">Bara måltider – inga CGM-värden det dygnet.</p>
      )}
    </button>
  );
}

function MealCurve({ insight }) {
  const pts = insight?.curve || [];
  if (pts.length < 2) return <div className="text-[11px] text-muted-foreground">Ingen kurva</div>;
  const W = 240, H = 72, X0 = -15, X1 = 240, Y0 = 2, Y1 = 20;
  const x = (m) => ((m - X0) / (X1 - X0)) * W;
  const y = (v) => H - ((Math.min(Y1, Math.max(Y0, v)) - Y0) / (Y1 - Y0)) * H;
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.min).toFixed(1)} ${y(p.mmol).toFixed(1)}`).join(" ");
  const marks = [0, 120, 180, 240];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[72px]" preserveAspectRatio="none" aria-label="Blodsocker efter måltiden">
      <rect x="0" y={y(10)} width={W} height={y(3.9) - y(10)} fill="hsl(160, 60%, 42%)" fillOpacity="0.12" />
      <line x1="0" x2={W} y1={y(3.9)} y2={y(3.9)} stroke="hsl(0, 72%, 51%)" strokeDasharray="3 3" strokeWidth="1" />
      <line x1="0" x2={W} y1={y(10)} y2={y(10)} stroke="hsl(35, 92%, 50%)" strokeDasharray="3 3" strokeWidth="1" />
      {marks.map((m) => (
        <g key={m}>
          <line x1={x(m)} x2={x(m)} y1="0" y2={H} stroke="hsl(240, 6%, 25%)" strokeWidth="1" />
          <text x={x(m) + 2} y={H - 2} fontSize="8" fill="hsl(240, 5%, 60%)">{m === 0 ? "mål" : `${m / 60} h`}</text>
        </g>
      ))}
      <path d={line} fill="none" stroke="hsl(211, 100%, 50%)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function MealRow({ meal }) {
  const t = new Date(meal.time);
  const ins = meal.insight;
  const flags = ins?.flags || [];
  return (
    <div className="flex flex-col sm:flex-row gap-4 p-3.5 rounded-xl border border-border/60 bg-secondary/30">
      <div className="w-full sm:w-36 shrink-0">
        {meal.photo ? (
          <img src={meal.photo} alt="" loading="lazy" className="w-full sm:w-36 h-28 object-cover rounded-lg border border-border/60" />
        ) : (
          <div className="w-full sm:w-36 h-28 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground">
            <Utensils className="w-6 h-6 opacity-50" />
          </div>
        )}
        <div className="mt-1.5 text-xs font-mono text-muted-foreground">{format(t, "HH:mm", { locale: sv })}</div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <ul className="text-sm space-y-0.5">
            {(meal.foods || []).map((f, i) => (
              <li key={i} className="flex flex-wrap gap-x-1.5">
                <span className="font-medium">{f.namn}</span>
                <span className="text-muted-foreground text-xs mt-0.5">{[f.tillagning, f.portion].filter(Boolean).join(" · ")}</span>
                <span className="text-xs font-mono text-muted-foreground mt-0.5">{f.kolhydrater_g} g</span>
              </li>
            ))}
            {!(meal.foods || []).length && <li className="text-muted-foreground text-sm">Inget livsmedel igenkänt</li>}
          </ul>
          <div className="text-right shrink-0">
            <div className="text-xl font-bold leading-none">~{meal.carbs_g} <span className="text-xs font-normal text-muted-foreground">g kh</span></div>
            <div className="text-[10px] text-muted-foreground mt-1">uppskattning · {meal.confidence} säkerhet</div>
          </div>
        </div>
        {meal.comment && <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{meal.comment}</p>}

        <div className="mt-3 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-3 items-start">
          <MealCurve insight={ins} />
          <div>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {flags.includes("for_lite") && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30">
                  <AlertTriangle className="w-3 h-3" />{FLAG_TEXT.for_lite}
                </span>
              )}
              {flags.includes("for_mycket") && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-500/15 text-red-400 ring-1 ring-red-500/30">
                  <AlertTriangle className="w-3 h-3" />{FLAG_TEXT.for_mycket}
                </span>
              )}
              {ins && !flags.length && ins.complete && ins.baseline != null && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/15 text-emerald-400">Inom det förväntade</span>
              )}
              {ins && !ins.complete && <span className="px-2 py-0.5 rounded-md text-[11px] bg-secondary text-muted-foreground">preliminär</span>}
              {ins?.stord && <span className="px-2 py-0.5 rounded-md text-[11px] bg-secondary text-muted-foreground">ny måltid inom 3 h</span>}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{ins?.text || "Kurvan bedöms när nattens jobb har kört."}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GlucoseFood({ days = [] }) {
  const sorted = useMemo(() => [...days].filter((d) => d?.date).sort((a, b) => (a.date < b.date ? 1 : -1)), [days]);
  const [selected, setSelected] = useState(null);
  const [span, setSpan] = useState(14);
  const current = sorted.find((d) => d.date === selected) || sorted[0] || null;

  const chartData = useMemo(
    () => sorted.filter((d) => Number.isFinite(d.avg)).slice(0, span).reverse().map((d) => ({
      date: d.date, label: dateLabel(d.date, "d/M"), avg: d.avg, tir: d.tir?.inRange ?? null, lows: d.lows?.episodes ?? 0,
    })),
    [sorted, span]
  );

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/20"><Droplet className="w-5 h-5 text-primary" /></div>
          <div>
            <h3 className="text-base font-semibold">Blodsocker &amp; mat</h3>
            <p className="text-xs text-muted-foreground">Dexcom G7 via Share · dygnsstatistik, matfoton och kurvan efter maten</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed p-3 rounded-lg bg-secondary/40 border border-border/60">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Beslutsstöd, inte journalhandling. Kolhydraterna är AI-uppskattningar från foto och kurvflaggorna beskriver
            blodsockrets <em>form</em> efter måltiden – de är underlag för samtal med diabetesteamet, aldrig en dosrekommendation.
            Sidan innehåller inga insulindoser.
          </span>
        </div>

        {!sorted.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Inga dygn inlästa ännu – det nattliga jobbet fyller på från Dexcom Share när Marc har kopplat sitt konto.
          </p>
        ) : (
          <>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Senaste dygnen</div>
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
                {sorted.slice(0, 7).map((d) => (
                  <DayCard key={d.date} day={d} active={current?.date === d.date} onClick={() => setSelected(d.date)} />
                ))}
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-muted-foreground">
                {TIR_SEGMENTS.map((s) => (
                  <span key={s.key} className="flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded-sm ${s.color}`} />{s.label} mmol/L</span>
                ))}
              </div>
            </div>

            {chartData.length > 1 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Trend · medel och tid i intervall</div>
                  <div className="flex gap-1 bg-secondary/60 rounded-md p-0.5">
                    {[14, 30].map((n) => (
                      <button key={n} onClick={() => setSpan(n)} className={`px-2.5 py-1 rounded text-[11px] font-medium ${span === n ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                        {n} dagar
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 6%, 18%)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(240, 5%, 60%)" }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="avg" domain={[3, 14]} tick={{ fontSize: 11, fill: "hsl(240, 5%, 60%)" }} tickLine={false} axisLine={false} width={34} />
                    <YAxis yAxisId="tir" orientation="right" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(240, 5%, 60%)" }} tickLine={false} axisLine={false} width={34} unit="%" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(240, 6%, 11%)", border: "1px solid hsl(240, 6%, 18%)", borderRadius: "12px", fontSize: "13px", color: "hsl(0, 0%, 95%)" }}
                      formatter={(value, name) => (name === "avg" ? [`${sv1(value)} mmol/L`, "Medel"] : [`${value} %`, "Tid i intervall"])}
                    />
                    <ReferenceLine yAxisId="tir" y={70} stroke="hsl(160, 60%, 42%)" strokeDasharray="5 5" label={{ value: "mål 70 %", position: "right", fontSize: 10, fill: "hsl(160, 60%, 42%)" }} />
                    <Bar yAxisId="tir" dataKey="tir" fill="hsl(160, 60%, 42%)" fillOpacity={0.35} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                    <Line yAxisId="avg" type="monotone" dataKey="avg" stroke="hsl(211, 100%, 50%)" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {current && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">{dateLabel(current.date, "EEEE d MMMM yyyy")}</h4>
                  {Number.isFinite(current.avg) && (
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {current.count} värden · {current.coverage_pct} % täckning · median {sv1(current.median)} · SD {sv1(current.sd)} · {sv1(current.min)}–{sv1(current.max)}
                    </span>
                  )}
                </div>

                {current.dayParts?.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {current.dayParts.map((p) => {
                      const Icon = PART_ICONS[p.id] || Sun;
                      return (
                        <div key={p.id} className="p-3 rounded-xl bg-secondary/40 border border-border/60">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            <Icon className="w-3.5 h-3.5" />{p.label}<span className="font-normal normal-case tracking-normal">{p.range}</span>
                          </div>
                          <div className="mt-1 flex items-end gap-1.5">
                            <span className="text-xl font-bold leading-none">{p.avg == null ? "–" : sv1(p.avg)}</span>
                            <span className="text-[11px] text-muted-foreground">mmol/L</span>
                            <span className={`ml-auto text-xs font-semibold ${p.tir == null ? "text-muted-foreground" : p.tir >= 70 ? "text-emerald-400" : "text-amber-400"}`}>
                              {p.tir == null ? "" : `${p.tir} % i mål`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div>
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5" />Måltider ({current.meals?.length || 0})
                  </div>
                  {current.meals?.length ? (
                    <div className="space-y-3">
                      {[...current.meals].sort((a, b) => new Date(a.time) - new Date(b.time)).map((m) => <MealRow key={m.id} meal={m} />)}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-3">Inga matbilder valda för det här dygnet.</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
