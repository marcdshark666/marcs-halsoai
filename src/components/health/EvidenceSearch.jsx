import { useState, useMemo, useRef, useEffect } from "react";
import {
  Search, Sparkles, Loader2, X, ExternalLink, BookOpen, Stethoscope, FileText,
  Shield, Activity, Eye, HeartPulse, Droplet, ListOrdered, Layers, Dna, Microscope, FlaskConical,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  DISEASE_CATEGORIES, EVIDENCE_CORPUS as CORPUS, SUGGESTED_QUERIES, EVIDENCE_IMAGES,
} from "@/data/content";
import { STUDY_EVENT } from "@/components/health/StudyRefs";

// Ikonnycklar anges som strängar i content.js så att kunskapsbanken kan
// redigeras utan att den här komponenten behöver röras.
const ICONS = {
  book: BookOpen,
  shield: Shield,
  stethoscope: Stethoscope,
  file: FileText,
  activity: Activity,
  eye: Eye,
  heart: HeartPulse,
  droplet: Droplet,
  list: ListOrdered,
  layers: Layers,
  dna: Dna,
  microscope: Microscope,
  flask: FlaskConical,
};

// Bygger den textkontext som språkmodellen resonerar utifrån.
function buildContext(items) {
  const evidence = items.filter(i => i.type !== "ref");
  const refs = items.filter(i => i.type === "ref");

  let ctx = "=== KLINISK EVIDENS & SAMMANFATTNINGAR ===\n\n";
  evidence.forEach(e => {
    ctx += `Titel: ${e.title}\nKategori: ${e.tag}\nSammanfattning: ${e.summary}\nKälla: ${e.source}\n\n`;
  });
  if (refs.length) {
    ctx += "\n=== REFERENSER OCH RIKTLINJER ===\n\n";
    refs.forEach(r => {
      ctx += `[${r.n}] ${r.title} (${r.source})\n`;
    });
  }
  return ctx;
}

export default function EvidenceSearch() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [category, setCategory] = useState("alla");
  const [aiResult, setAiResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const inputRef = useRef(null);

  // En åtgärd i att göra-listan kan peka hit. Filtret nollställs så att
  // studien säkert är renderad, därefter scrollas den fram och markeras.
  useEffect(() => {
    const handler = (e) => {
      const id = e.detail?.id;
      if (!id) return;
      setCategory("alla");
      setHighlightId(id);
      // Vänta ut omrenderingen innan vi letar upp noden.
      setTimeout(() => {
        document.getElementById(`evidens-${id}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 80);
    };
    window.addEventListener(STUDY_EVENT, handler);
    return () => window.removeEventListener(STUDY_EVENT, handler);
  }, []);

  // Markeringen tonas bort av sig själv.
  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => setHighlightId(null), 6000);
    return () => clearTimeout(timer);
  }, [highlightId]);

  const filteredCorpus = useMemo(() => {
    if (category === "alla") return CORPUS;
    return CORPUS.filter(item => (item.diseases || []).includes(category));
  }, [category]);

  const handleSearch = async (e) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q || isLoading) return;

    setIsLoading(true);
    setError(null);
    setAiResult(null);
    setSubmittedQuery(q);

    try {
      const contextText = buildContext(filteredCorpus);
      const prompt = `Du är en klinisk AI-assistent för en läkare. Baserat på följande kliniska evidens och referenser, svara på läkarens fråga.

FRÅGA: "${q}"

${contextText}

Instruktioner:
- Svara på svenska.
- Parafrasera och syntetisera informationen från evidensen ovan – citera inte direkt.
- Strukturera svaret i JSON med följande format:
{
  "sammanfattning": "En koncis sammanfattning (2-3 meningar) som direkt svarar på frågan.",
  "praktiska_overvaganden": ["Punkt 1", "Punkt 2"],
  "slutsats": "En avslutande rekommendation (1-2 meningar).",
  "relevanta_referenser": [1, 4],
  "uppfoljningsfraga": "En relevant följdfråga läkaren kan ställa härnäst."
}
- Håll tonen professionell, evidensbaserad och koncis.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            sammanfattning: { type: "string" },
            praktiska_overvaganden: { type: "array", items: { type: "string" } },
            slutsats: { type: "string" },
            relevanta_referenser: { type: "array", items: { type: "number" } },
            uppfoljningsfraga: { type: "string" },
          },
        },
      });

      setAiResult(result);
    } catch {
      setError("Kunde inte hämta AI-svar. Försök igen.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setAiResult(null);
    setError(null);
    setSubmittedQuery("");
    inputRef.current?.focus();
  };

  const handleSuggestion = (s) => {
    setQuery(s);
    inputRef.current?.focus();
  };

  const handleFollowUp = () => {
    if (aiResult?.uppfoljningsfraga) {
      setQuery(aiResult.uppfoljningsfraga);
      inputRef.current?.focus();
    }
  };

  const relevantRefs = useMemo(() => {
    if (!aiResult?.relevanta_referenser) return [];
    return aiResult.relevanta_referenser
      .map(n => CORPUS.find(i => i.n === n))
      .filter(Boolean);
  }, [aiResult]);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Rubrik */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/20">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Evidenssök</h3>
            <p className="text-xs text-muted-foreground">Ställ en klinisk fråga – svaret byggs på kunskapsbanken nedan</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/15 text-primary shrink-0">
          {CORPUS.length} källor
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Sökfält */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="t.ex. Ska popliteaaneurysmet opereras?"
            className="w-full pl-10 pr-24 py-3 rounded-xl bg-secondary/50 border border-border text-sm focus:outline-none focus:border-primary/50 transition-colors"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {(query || aiResult) && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Rensa"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold disabled:opacity-40 transition-opacity"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sök"}
            </button>
          </div>
        </form>

        {/* Kategorifilter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {DISEASE_CATEGORIES.map(cat => {
            const Icon = ICONS[cat.icon] || BookOpen;
            const isActive = category === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  isActive ? cat.color : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Förslag på frågor */}
        {!aiResult && !isLoading && SUGGESTED_QUERIES.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_QUERIES.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSuggestion(s)}
                className="px-2.5 py-1 rounded-full text-[11px] bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2.5 p-4 rounded-xl bg-secondary/40 border border-border">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Söker igenom {filteredCorpus.length} källor…</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* AI-svar */}
        {aiResult && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 overflow-hidden">
            <div className="px-4 py-2.5 bg-primary/10 border-b border-primary/20 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Svar på: {submittedQuery}</span>
            </div>
            <div className="p-4 space-y-3">
              {aiResult.sammanfattning && (
                <p className="text-sm leading-relaxed">{aiResult.sammanfattning}</p>
              )}

              {aiResult.praktiska_overvaganden?.length > 0 && (
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Praktiska överväganden
                  </h5>
                  <ul className="space-y-1">
                    {aiResult.praktiska_overvaganden.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiResult.slutsats && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-xs text-emerald-300 leading-relaxed">
                    <strong>Slutsats:</strong> {aiResult.slutsats}
                  </p>
                </div>
              )}

              {relevantRefs.length > 0 && (
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Relevanta referenser
                  </h5>
                  <div className="space-y-1">
                    {relevantRefs.map(r => (
                      <a
                        key={r.n}
                        href={r.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-1.5 text-xs text-primary hover:underline"
                      >
                        [{r.n}] {r.title}
                        <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {aiResult.uppfoljningsfraga && (
                <button
                  onClick={handleFollowUp}
                  className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left"
                >
                  <Sparkles className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm text-foreground/90 italic">{aiResult.uppfoljningsfraga}</span>
                  <Search className="w-3.5 h-3.5 text-primary ml-auto shrink-0" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Valfria bilder (algoritmer o.dyl.) */}
        {EVIDENCE_IMAGES.algorithm && (
          <div className="rounded-xl border border-border overflow-hidden bg-muted/30">
            <div className="p-3">
              <img
                src={EVIDENCE_IMAGES.algorithm}
                alt={EVIDENCE_IMAGES.algorithm_caption || "Algoritmbild"}
                className="w-full rounded-lg border border-border"
              />
              {EVIDENCE_IMAGES.algorithm_caption && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {EVIDENCE_IMAGES.algorithm_caption}
                </p>
              )}
            </div>
          </div>
        )}
        {EVIDENCE_IMAGES.indication && (
          <div className="rounded-xl border border-border overflow-hidden bg-muted/30">
            <div className="p-3">
              <img
                src={EVIDENCE_IMAGES.indication}
                alt={EVIDENCE_IMAGES.indication_caption || "Indikationsbild"}
                className="w-full rounded-lg border border-border"
              />
              {EVIDENCE_IMAGES.indication_caption && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {EVIDENCE_IMAGES.indication_caption}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Kunskapsbanken */}
        <div>
          <h4 className="text-sm font-bold mb-3 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-primary" />
            {category === "alla"
              ? "All evidens"
              : `Evidens: ${DISEASE_CATEGORIES.find(c => c.key === category)?.label}`}
            <span className="text-xs font-normal text-muted-foreground">({filteredCorpus.length})</span>
          </h4>

          {filteredCorpus.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Inga källor i den här kategorin ännu.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredCorpus.map(item => {
                const Icon = ICONS[item.icon] || FileText;
                const isHighlighted = highlightId === item.id;
                return (
                  <div
                    key={item.id || item.n}
                    id={item.id ? `evidens-${item.id}` : undefined}
                    className={`rounded-xl border p-3 scroll-mt-24 transition-all duration-500 ${
                      isHighlighted
                        ? "border-primary ring-2 ring-primary/60 bg-primary/5 shadow-lg shadow-primary/10"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-xs font-semibold">{item.title}</span>
                          {item.tag && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${item.tagColor}`}>
                              {item.tag}
                            </span>
                          )}
                        </div>
                        {item.summary && (
                          <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{item.summary}</p>
                        )}
                        {item.sourceUrl && (
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-primary hover:underline"
                          >
                            {item.source}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
