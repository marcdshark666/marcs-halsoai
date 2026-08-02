import { useMemo, useState } from "react";
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceArea, ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { LineChart as LineChartIcon, TrendingUp, TrendingDown, Minus, Maximize2 } from "lucide-react";
import { formatRef } from "@/utils/labNormalizer";

// Klinisk prioritetsordning för denna patient (T2DM + CKD 3a + förmaksflimmer +
// hypotyreos + planerad statinstart). Tester utanför listan sorteras efter antal mätningar.
const CLINICAL_PRIORITY = [
  "HbA1c", "eGFR", "Kreatinin", "NT-proBNP", "Troponin T", "P-Glukos",
  "LDL", "Kolesterol", "non-HDL", "HDL", "Triglycerider",
  "Hb", "Leukocyter", "TSH", "T4 fritt",
  "ASAT", "ALAT", "ALP", "Kalium", "Natrium", "CRP", "Ferritin",
];

// Extra kliniska linjer per test: målvärden och stadiegränser.
const TARGET_LINES = {
  HbA1c: [{ y: 48, label: "Mål ≤48", color: "hsl(160, 60%, 42%)" }],
  eGFR: [
    { y: 60, label: "CKD 2/3a", color: "hsl(45, 90%, 55%)" },
    { y: 45, label: "CKD 3a/3b", color: "hsl(25, 90%, 55%)" },
    { y: 30, label: "CKD 3b/4", color: "hsl(0, 72%, 51%)" },
  ],
  LDL: [{ y: 1.8, label: "Mål <1,8", color: "hsl(160, 60%, 42%)" }],
  Kalium: [{ y: 5.5, label: "Åtgärd >5,5", color: "hsl(0, 72%, 51%)" }],
};

// TSH spänner 0,01–2,8 (suprimerad → normal) och kräver logskala för att
// historiken ska vara läsbar; linjär skala plattar ut de låga värdena.
const LOG_SCALE_TESTS = new Set(["TSH"]);

const RANGE_OPTIONS = [
  { key: "1y", label: "1 år", years: 1 },
  { key: "2y", label: "2 år", years: 2 },
  { key: "5y", label: "5 år", years: 5 },
  { key: "all", label: "Allt", years: null },
];

const STATUS_DOT = {
  normal: "hsl(160, 60%, 45%)",
  low: "hsl(45, 90%, 55%)",
  high: "hsl(45, 90%, 55%)",
  critical_low: "hsl(0, 72%, 55%)",
  critical_high: "hsl(0, 72%, 55%)",
};

function TrendBadge({ series }) {
  if (series.length < 2) return null;
  const last = series[series.length - 1].value;
  const prev = series[series.length - 2].value;
  const delta = last - prev;
  const pct = prev !== 0 ? (delta / Math.abs(prev)) * 100 : 0;
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const lastAbnormal = series[series.length - 1].status !== "normal";
  const color = delta === 0 ? "text-muted-foreground" : lastAbnormal ? "text-red-400" : "text-emerald-400";
  return (
    <span className={`flex items-center gap-0.5 text-[11px] font-semibold font-mono ${color}`}>
      <Icon className="w-3 h-3" />
      {delta > 0 ? "+" : ""}{Math.abs(delta) >= 10 ? delta.toFixed(0) : delta.toFixed(1)} ({pct > 0 ? "+" : ""}{pct.toFixed(0)}%)
    </span>
  );
}

// Punktmarkör färgad efter status – avvikande värden sticker ut även i miniformat.
function StatusDot(props) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const color = STATUS_DOT[payload.status] || STATUS_DOT.normal;
  const abnormal = payload.status !== "normal";
  return <circle cx={cx} cy={cy} r={abnormal ? 3.5 : 2.5} fill={color} stroke="hsl(240, 6%, 11%)" strokeWidth={1} />;
}

function MiniChart({ name, series, onOpen }) {
  const latest = series[series.length - 1];
  const refLow = latest.reference_low;
  const refHigh = latest.reference_high;
  const isAbnormal = latest.status !== "normal";

  const data = series.map((r) => ({
    ts: new Date(r.sample_date).getTime(),
    value: r.value,
    status: r.status,
    date: r.sample_date,
  }));

  const values = data.map((d) => d.value);
  const bounds = [...values];
  if (refLow != null) bounds.push(refLow);
  if (refHigh != null) bounds.push(refHigh);
  (TARGET_LINES[name] || []).forEach((t) => bounds.push(t.y));
  const useLog = LOG_SCALE_TESTS.has(name) && values.every((v) => v > 0);
  const rawMin = Math.min(...bounds);
  const rawMax = Math.max(...bounds);
  const padding = (rawMax - rawMin || Math.abs(rawMax) || 1) * 0.12;
  // Logskala kräver positiv domän; linjär får luft runt min/max.
  const yMin = useLog ? rawMin * 0.8 : rawMin - padding;
  const yMax = useLog ? rawMax * 1.2 : rawMax + padding;

  const tsMin = data[0].ts;
  const tsMax = data[data.length - 1].ts;

  return (
    <button
      onClick={() => onOpen(name)}
      className={`text-left rounded-xl border p-3 transition-all hover:shadow-md hover:-translate-y-0.5 group ${
        isAbnormal
          ? "bg-red-950/30 border-red-900/60 hover:border-red-700"
          : "bg-card border-border hover:border-primary/40"
      }`}
      title={`Öppna fullständig trend för ${name}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold truncate">{name}</span>
            <Maximize2 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-lg font-bold ${isAbnormal ? "text-red-400" : "text-foreground"}`}>
              {latest.value}
            </span>
            <span className="text-[10px] text-muted-foreground">{latest.unit}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <TrendBadge series={series} />
          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
            ref {formatRef(refLow, refHigh)}
          </div>
        </div>
      </div>

      <div className="h-[110px] -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
            {refLow != null && refHigh != null && (
              <ReferenceArea y1={refLow} y2={refHigh} fill="hsl(160, 60%, 42%)" fillOpacity={0.08} />
            )}
            {refLow == null && refHigh != null && (
              <ReferenceArea y1={yMin} y2={refHigh} fill="hsl(160, 60%, 42%)" fillOpacity={0.08} />
            )}
            {refLow != null && refHigh == null && (
              <ReferenceArea y1={refLow} y2={yMax} fill="hsl(160, 60%, 42%)" fillOpacity={0.08} />
            )}
            {(TARGET_LINES[name] || []).map((t) => (
              <ReferenceLine
                key={t.label}
                y={t.y}
                stroke={t.color}
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{ value: t.label, position: "insideTopRight", fontSize: 8, fill: t.color }}
              />
            ))}
            <XAxis
              dataKey="ts"
              type="number"
              domain={[tsMin, tsMax]}
              tick={{ fontSize: 9, fill: "hsl(240, 5%, 50%)" }}
              tickFormatter={(ts) => format(new Date(ts), "yyyy")}
              ticks={[tsMin, tsMax]}
              tickLine={false}
              axisLine={false}
              height={14}
            />
            <YAxis domain={[yMin, yMax]} scale={useLog ? "log" : "auto"} hide allowDataOverflow />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(240, 6%, 11%)",
                border: "1px solid hsl(240, 6%, 18%)",
                borderRadius: "10px",
                fontSize: "12px",
                color: "hsl(0, 0%, 95%)",
              }}
              labelFormatter={(ts) => format(new Date(ts), "d MMM yyyy", { locale: sv })}
              formatter={(value) => [`${value} ${latest.unit || ""}`, name]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={isAbnormal ? "hsl(0, 72%, 55%)" : "hsl(211, 100%, 55%)"}
              strokeWidth={1.8}
              dot={<StatusDot />}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-muted-foreground font-mono">
          {series.length} mätningar · {format(new Date(series[0].sample_date), "MMM yyyy", { locale: sv })}–{format(new Date(latest.sample_date), "MMM yyyy", { locale: sv })}
        </span>
      </div>
    </button>
  );
}

// "Trender & analys" – small multiples över hela provhistoriken.
// Klick på en graf öppnar den stora trendvyn (via onSelectTest).
export default function HealthAnalytics({ seriesByTest, onSelectTest }) {
  const [range, setRange] = useState("all");
  const [onlyAbnormal, setOnlyAbnormal] = useState(false);

  const charts = useMemo(() => {
    const rangeDef = RANGE_OPTIONS.find((r) => r.key === range);
    const cutoff = rangeDef?.years
      ? new Date(new Date().setFullYear(new Date().getFullYear() - rangeDef.years))
      : null;

    return Object.entries(seriesByTest)
      .map(([name, series]) => {
        const filtered = cutoff ? series.filter((r) => new Date(r.sample_date) >= cutoff) : series;
        return { name, series: filtered };
      })
      .filter(({ series }) => series.length >= 3)
      .filter(({ series }) => !onlyAbnormal || series[series.length - 1].status !== "normal")
      .sort((a, b) => {
        const ia = CLINICAL_PRIORITY.indexOf(a.name);
        const ib = CLINICAL_PRIORITY.indexOf(b.name);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return b.series.length - a.series.length;
      });
  }, [seriesByTest, range, onlyAbnormal]);

  const totalMeasurements = useMemo(
    () => Object.values(seriesByTest).reduce((sum, s) => sum + s.length, 0),
    [seriesByTest]
  );

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/20">
            <LineChartIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Trender & analys</h3>
            <p className="text-xs text-muted-foreground">
              {totalMeasurements} mätningar · sorterat efter klinisk relevans · klicka för detaljvy
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-secondary/50 rounded-full p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setRange(opt.key)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                  range === opt.key ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setOnlyAbnormal((v) => !v)}
            className={`px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all ${
              onlyAbnormal
                ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/40"
                : "bg-secondary/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            ⚠ Avvikande
          </button>
        </div>
      </div>

      <div className="p-4">
        {charts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Inga tester med minst 3 mätningar i valt intervall.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {charts.map(({ name, series }) => (
              <MiniChart key={name} name={name} series={series} onOpen={onSelectTest} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
