import { useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function SearchBar({ labResults, journalEntries }) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setAnswer(null);

    const labContext = (labResults || []).map(r =>
      `${r.sample_date}: ${r.test_name} = ${r.value} ${r.unit} (ref ${r.reference_low}-${r.reference_high}, status: ${r.status}${r.is_validated === false ? ', EJ VIDIMERAT' : ''})`
    ).join("\n");

    const journalContext = (journalEntries || []).map(e =>
      `${e.date} [${e.type}] ${e.title}: ${e.content || ''}${e.icd_codes?.length ? ' ICD: ' + e.icd_codes.join(', ') : ''}`
    ).join("\n");

    const prompt = `Du är en medicinsk informationsassistent. Svara på frågan baserat ENBART på nedanstående journaldata och labbresultat. Svara på svenska. Var koncis men informativ. Om du inte hittar svaret i datan, säg det tydligt.

LABBRESULTAT:
${labContext}

JOURNALANTECKNINGAR:
${journalContext}

FRÅGA: ${query}

Svara med relevant data, datum och värden. Markera avvikande prover tydligt.`;

    const res = await base44.integrations.Core.InvokeLLM({ prompt });
    setAnswer(res);
    setLoading(false);
  };

  return (
    <div className="w-full">
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Fråga om prover, diagnoser, historik..."
            className="pl-10 pr-10 h-12 text-base rounded-xl bg-card border-2 border-transparent focus-visible:border-primary/40 shadow-sm"
          />
          {query && (
            <button onClick={() => { setQuery(""); setAnswer(null); }} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <Button onClick={handleSearch} disabled={loading || !query.trim()} className="h-12 px-6 rounded-xl">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sök"}
        </Button>
      </div>

      {loading && (
        <div className="mt-4 p-4 rounded-xl bg-card border animate-pulse">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Söker i journaldata...
          </div>
        </div>
      )}

      {answer && (
        <div className="mt-4 p-5 rounded-xl bg-card border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Search className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Svar baserat på journaldata</span>
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{answer}</div>
        </div>
      )}
    </div>
  );
}