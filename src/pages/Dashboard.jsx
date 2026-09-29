import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Calendar, FileText, Heart, Sparkles, FlaskConical,
  LayoutDashboard, Bell, Pill, Droplet,
} from "lucide-react";
import GlucoseFood from "@/components/health/GlucoseFood";
import SearchBar from "@/components/health/SearchBar";
import LabValueCard from "@/components/health/LabValueCard";
import TrendChart from "@/components/health/TrendChart";
import JournalTimeline from "@/components/health/JournalTimeline";
import TodoList from "@/components/health/TodoList";
import DailyChecklist from "@/components/health/DailyChecklist";
import CalendarTimeline from "@/components/health/CalendarTimeline";
import OrganAvatar from "@/components/health/OrganAvatar";
import ProfileWave from "@/components/health/ProfileWave";
import WeightCard from "@/components/health/WeightCard";
import DiagnosisList from "@/components/health/DiagnosisList";
import RecommendedTests from "@/components/health/RecommendedTests";
import MedicationList from "@/components/health/MedicationList";
import RecommendedMedications from "@/components/health/RecommendedMedications";
import DrugInteractionAlert from "@/components/health/DrugInteractionAlert";
import OverdueAlert from "@/components/health/OverdueAlert";
import CompletedActions from "@/components/health/CompletedActions";
import AIFollowUpRecommendations from "@/components/health/AIFollowUpRecommendations";
import EvidenceSearch from "@/components/health/EvidenceSearch";
import TreatmentPlan from "@/components/health/TreatmentPlan";
import AdverseDrugHistory from "@/components/health/AdverseDrugHistory";
import ImagingFindings from "@/components/health/ImagingFindings";
import StatsOverview from "@/components/health/StatsOverview";
import HealthAnalytics from "@/components/health/HealthAnalytics";
import PriorityWatch from "@/components/health/PriorityWatch";
import VascularTimeline from "@/components/health/VascularTimeline";
import ClinicalNotes from "@/components/health/ClinicalNotes";
import VoiceAssistant from "@/components/health/VoiceAssistant";
import { normalizeTestName } from "@/utils/labNormalizer";
import { exportHealthReport } from "@/utils/exportReport";
import { ArrowUpDown, Download } from "lucide-react";
import { APP_NAME, PATIENT, CALENDAR_SUBTITLE, FOOTER_TEXT } from "@/data/content";

// Kategorierna speglar de provgrupper utredningsplanen för Marc använder.
// Sätt samma sträng i category-fältet i src/api/realdata/LabResult.json.
const CATEGORIES = ["alla", "diabetes", "lunga", "immunologi", "inflammation", "hematologi", "njure", "lever", "hormon", "näring", "lipider", "tyreoidea", "urin", "övrigt"];

const SORT_OPTIONS = [
  { key: "avvikelse", label: "Avvikelse" },
  { key: "namn", label: "Namn" },
  { key: "datum", label: "Datum" },
  { key: "förändring", label: "Förändring" },
];

const STATUS_SEVERITY = { critical_high: 0, critical_low: 0, high: 1, low: 1, normal: 2 };

// Navigeringen scrollar till respektive sektion på sidan.
const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Översikt", target: "top" },
  { icon: Droplet, label: "Blodsocker", target: "blodsocker" },
  { icon: FlaskConical, label: "Prover", target: "prover" },
  { icon: Calendar, label: "Att göra", target: "kalender" },
  { icon: Pill, label: "Behandling", target: "plan" },
  { icon: Sparkles, label: "Studier", target: "evidens" },
  { icon: FileText, label: "Journal", target: "journal" },
];

function scrollToSection(target) {
  if (target === "top") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Dashboard() {
  const [selectedTest, setSelectedTest] = useState(null);
  const [category, setCategory] = useState("alla");
  const [sortBy, setSortBy] = useState("avvikelse");
  const [onlyAbnormal, setOnlyAbnormal] = useState(false);

  const { data: labResults = [], isLoading: loadingLabs } = useQuery({
    queryKey: ["labResults"],
    queryFn: () => base44.entities.LabResult.list("-sample_date", 500),
  });

  const { data: journalEntries = [], isLoading: loadingJournal } = useQuery({
    queryKey: ["journalEntries"],
    queryFn: () => base44.entities.JournalEntry.list("-date", 200),
  });

  const { data: upcomingActions = [], isLoading: loadingActions } = useQuery({
    queryKey: ["upcomingActions"],
    queryFn: () => base44.entities.UpcomingAction.list("due_date", 500),
  });

  const { data: medications = [] } = useQuery({
    queryKey: ["medications"],
    queryFn: () => base44.entities.Medication.list(),
  });

  const { data: glucoseDays = [] } = useQuery({
    queryKey: ["glucoseDays"],
    queryFn: () => base44.entities.GlucoseDay.list("-date", 120),
  });

  // Hela historiken grupperad per normaliserat testnamn, kronologiskt sorterad.
  // Dubbletter (samma test + datum + värde, förekommer i rådatan) filtreras bort.
  // latestByTest och antal mätningar härleds ur samma struktur.
  const seriesByTest = useMemo(() => {
    const map = {};
    const seen = new Set();
    labResults.forEach(r => {
      const key = normalizeTestName(r.test_name);
      const dupeKey = `${key}|${r.sample_date}|${r.value}`;
      if (seen.has(dupeKey)) return;
      seen.add(dupeKey);
      (map[key] ||= []).push(r);
    });
    Object.values(map).forEach(series =>
      series.sort((a, b) => new Date(a.sample_date) - new Date(b.sample_date))
    );
    return map;
  }, [labResults]);

  const latestByTest = useMemo(() => {
    const map = {};
    Object.entries(seriesByTest).forEach(([key, series]) => {
      map[key] = series[series.length - 1];
    });
    return map;
  }, [seriesByTest]);

  const historyCountByTest = useMemo(() => {
    const counts = {};
    Object.entries(seriesByTest).forEach(([key, series]) => {
      counts[key] = series.length;
    });
    return counts;
  }, [seriesByTest]);

  // Absolut procentuell förändring mot föregående mätning – för sortering.
  const changeByTest = useMemo(() => {
    const map = {};
    Object.entries(seriesByTest).forEach(([key, series]) => {
      if (series.length < 2) { map[key] = 0; return; }
      const last = series[series.length - 1].value;
      const prev = series[series.length - 2].value;
      map[key] = prev !== 0 ? Math.abs((last - prev) / prev) * 100 : 0;
    });
    return map;
  }, [seriesByTest]);

  const latestValues = useMemo(() => {
    let values = Object.values(latestByTest);
    if (category !== "alla") {
      values = values.filter(v => v.category === category);
    }
    if (onlyAbnormal) {
      values = values.filter(v => v.status !== "normal");
    }
    const key = (r) => normalizeTestName(r.test_name);
    switch (sortBy) {
      case "namn":
        return values.sort((a, b) => key(a).localeCompare(key(b), "sv"));
      case "datum":
        return values.sort((a, b) => new Date(b.sample_date) - new Date(a.sample_date));
      case "förändring":
        return values.sort((a, b) => (changeByTest[key(b)] || 0) - (changeByTest[key(a)] || 0));
      case "avvikelse":
      default:
        // Allvarligast först (kritisk → avvikande → normal), inom samma nivå störst förändring först
        return values.sort((a, b) => {
          const sev = (STATUS_SEVERITY[a.status] ?? 2) - (STATUS_SEVERITY[b.status] ?? 2);
          if (sev !== 0) return sev;
          return (changeByTest[key(b)] || 0) - (changeByTest[key(a)] || 0);
        });
    }
  }, [latestByTest, category, sortBy, onlyAbnormal, changeByTest]);

  const trendData = useMemo(() => {
    if (!selectedTest) return [];
    // Använd den dedupade serien så att stora och lilla trendvyn visar samma data
    return seriesByTest[selectedTest] || [];
  }, [seriesByTest, selectedTest]);

  const selectedRef = selectedTest ? latestByTest[selectedTest] : null;
  const abnormalCount = Object.values(latestByTest).filter(v => v.status !== "normal").length;
  const isLoading = loadingLabs || loadingJournal || loadingActions;

  const overdueActions = upcomingActions.filter(a => {
    if (a.is_completed || a.is_paused) return false;
    const due = new Date(a.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  });
  const hasOverdue = overdueActions.length > 0;
  const openActionCount = upcomingActions.filter(a => !a.is_completed).length;

  if (isLoading) {
    return (
      <div className="dark fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Laddar hälsodata...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground relative">
      {/* Helsidespulsen borttagen medvetet: en primär varningssignal (OverdueAlert)
          räcker – fyra samtidiga blinkningar skapade larmtrötthet. */}

      {/* Top Navigation */}
      <nav className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Heart className="w-5 h-5 text-white" fill="white" />
            </div>
            <span className="text-lg font-semibold tracking-tight hidden sm:block">{APP_NAME}</span>
          </div>

          {/* Nav buttons */}
          <div className="hidden md:flex items-center gap-1 bg-secondary/50 rounded-full p-1">
            {NAV_ITEMS.map((item, i) => (
              <button
                key={i}
                onClick={() => scrollToSection(item.target)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all ${
                  item.target === "top"
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden lg:inline">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <VoiceAssistant />
            <button
              onClick={() => exportHealthReport({ labResults, medications, upcomingActions, journalEntries, latestByTest })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
              title="Ladda ner hälsorapport som PDF"
            >
              <Download className="w-4 h-4" />
              <span className="hidden lg:inline">Rapport</span>
            </button>
            <button className="relative p-2 rounded-full hover:bg-secondary transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              {abnormalCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
              )}
            </button>
            <div className="relative w-11 h-11 flex items-center justify-center">
              <ProfileWave />
              <img
                src={PATIENT.avatar_url}
                onError={(e) => {
                  // Saknas fotot faller vi tillbaka på den tecknade profilen.
                  if (e.currentTarget.src.endsWith(PATIENT.avatar_fallback)) return;
                  e.currentTarget.src = PATIENT.avatar_fallback;
                }}
                alt={PATIENT.first_name}
                style={{ objectPosition: "50% 18%" }}
                className="relative w-9 h-9 rounded-full object-cover ring-2 ring-primary/40 z-10"
              />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Search bar */}
        <div className="mb-6">
          <SearchBar labResults={labResults} journalEntries={journalEntries} />
        </div>

        {/* Overdue alerts */}
        <OverdueAlert />

        {/* Klinisk prioriteringspanel – härledd ur patientens riktiga data */}
        <div className="mb-6">
          <PriorityWatch
            upcomingActions={upcomingActions}
            onSelectTest={(name) => {
              setSelectedTest(name);
              setTimeout(() => document.getElementById("trend-detalj")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
            }}
          />
        </div>

        {/* Blodsocker & mat – dygnsstatistik från Dexcom + matfoton med kurvan efteråt */}
        <div id="blodsocker" className="mb-6 scroll-mt-20">
          <GlucoseFood days={glucoseDays} />
        </div>

        {/* Rekommenderade prover – rangordnade efter kliniskt utbyte */}
        <div id="prover" className="mb-6 scroll-mt-20">
          <RecommendedTests />
        </div>

        {/* Three-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Organ Avatar */}
          <div className="lg:col-span-3 space-y-5">
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{PATIENT.first_name}</h3>
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  {openActionCount} att göra
                </span>
              </div>
              <OrganAvatar abnormalCount={abnormalCount} />
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-3">{PATIENT.summary}</p>
            </div>

            <WeightCard />

            <DiagnosisList />
          </div>

          {/* Middle: Vital cards */}
          <div className="lg:col-span-5 space-y-5">
            {/* Statistiköversikt */}
            <StatsOverview
              latestByTest={latestByTest}
              seriesByTest={seriesByTest}
              labResults={labResults}
              category={category}
              onSelectCategory={setCategory}
            />

            {/* Category tabs */}
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Labbvärden</h3>
                <span className="text-xs text-muted-foreground">{latestValues.length} prover</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      category === cat
                        ? "bg-primary text-white shadow-sm"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>
              {/* Sortering + filter */}
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <ArrowUpDown className="w-3 h-3" />
                  Sortera:
                </span>
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setSortBy(opt.key)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      sortBy === opt.key
                        ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                        : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <button
                  onClick={() => setOnlyAbnormal(v => !v)}
                  className={`ml-auto px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    onlyAbnormal
                      ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/40"
                      : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ⚠ Endast avvikande
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {latestValues.map(r => (
                  <LabValueCard
                    key={r.test_name}
                    result={r}
                    onClick={(name) => {
                      setSelectedTest(normalizeTestName(name));
                      setTimeout(() => document.getElementById("trend-detalj")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
                    }}
                    historyCount={historyCountByTest[normalizeTestName(r.test_name)] || 1}
                    series={seriesByTest[normalizeTestName(r.test_name)]}
                  />
                ))}
              </div>
              {latestValues.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Inga prover matchar valt filter.
                </p>
              )}
            </div>

            {/* Trend chart */}
            {selectedTest && (
              <div id="trend-detalj">
                <TrendChart
                  data={trendData}
                  testName={selectedTest}
                  refLow={selectedRef?.reference_low}
                  refHigh={selectedRef?.reference_high}
                  unit={selectedRef?.unit}
                  onClose={() => setSelectedTest(null)}
                />
              </div>
            )}

            {/* Daily checklist */}
            <DailyChecklist />
          </div>

          {/* Right: Calendar + Tasks */}
          <div className="lg:col-span-4 space-y-5">
            {/* Calendar timeline */}
            <div id="kalender" className="bg-card rounded-2xl border border-border overflow-hidden scroll-mt-20">
              <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/20">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">Att göra · utredningsplan</h3>
                    <p className="text-xs text-muted-foreground">{CALENDAR_SUBTITLE}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 max-h-[500px] overflow-y-auto">
                <CalendarTimeline actions={upcomingActions} />
              </div>
            </div>

            {/* AI follow-up recommendations */}
            <AIFollowUpRecommendations journalEntries={journalEntries} upcomingActions={upcomingActions} />

            {/* Completed actions - separate card */}
            <CompletedActions />

            {/* Todo / Follow-up */}
            <div className="bg-card rounded-2xl border border-border p-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Avvikande provsvar</h3>
              <TodoList labResults={labResults} />
            </div>

            {/* Drug interactions */}
            <DrugInteractionAlert medications={medications} />

            {/* Adverse drug history */}
            <AdverseDrugHistory />

            {/* Recommended medications */}
            <RecommendedMedications />

            {/* Medications */}
            <div id="mediciner" className="bg-card rounded-2xl border border-border p-4 scroll-mt-20">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Pill className="w-4 h-4" />
                Mediciner · dygnschema
              </h3>
              <MedicationList />
            </div>


          </div>
        </div>

        {/* Trender & analys – small multiples över hela provhistoriken */}
        <div id="analys" className="mt-5 scroll-mt-20">
          <HealthAnalytics
            seriesByTest={seriesByTest}
            onSelectTest={(name) => {
              setSelectedTest(name);
              // Vänta tills detaljvyn renderats innan scroll
              setTimeout(() => document.getElementById("trend-detalj")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
            }}
          />
        </div>

        {/* Kärlförloppet i sammandrag */}
        <div className="mt-5">
          <VascularTimeline />
        </div>

        {/* Resonemang värda att minnas */}
        <div className="mt-5">
          <ClinicalNotes />
        </div>

        {/* Graded imaging findings */}
        <div className="mt-5">
          <ImagingFindings />
        </div>

        {/* Bottom: Journal */}
        <div id="journal" className="mt-5 bg-card rounded-2xl border border-border p-5 scroll-mt-20">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Journalhistorik
          </h3>
          <JournalTimeline entries={journalEntries} />
        </div>

        {/* Treatment plan */}
        <div id="plan" className="mt-5 scroll-mt-20">
          <TreatmentPlan />
        </div>

        {/* AI evidence search – hit scrollar studieknapparna i att göra-listan */}
        <div id="evidens" className="mt-5 scroll-mt-20">
          <EvidenceSearch />
        </div>

        {/* Footer */}
        <footer className="text-center py-6">
          <p className="text-xs text-muted-foreground">{FOOTER_TEXT}</p>
        </footer>
      </main>
    </div>
  );
}