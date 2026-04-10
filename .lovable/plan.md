

# Plan Hybrid: Undetectable.ai + Surse Reale OpenAlex + GPTZero Real Scan

## Problema actuală

1. **Humanizarea** folosește GPT-5 care tot produce pattern-uri detectabile de GPTZero
2. **Auto-check AI detection** la generare folosește Gemini ca "meta-detector" — inexact, nu reflectă scorul real GPTZero
3. **Referințele** sunt fabricate de AI — Crossref validarea post-factum nu le face reale

## Ce schimbăm

### 1. Secret nou: `UNDETECTABLE_API_KEY`
- Userul trebuie să-și ia API key de la https://undetectable.ai/develop
- Se adaugă ca secret în proiect

### 2. Edge function `humanize-text/index.ts` — rescriere completă
Înlocuim call-ul la Lovable AI cu Undetectable.ai API (submit/poll pattern):

```text
POST https://humanize.undetectable.ai/submit
  { content, readability: "University", purpose: "Essay", strength: "More Human", model: "v11sr" }
  → returns { id }

Poll every 7s:
POST https://humanize.undetectable.ai/document
  { id }
  → until output exists (timeout 120s)
```

Parametrii: readability=University, purpose=Essay, strength="More Human", model="v11sr" (best humanization).

### 3. Edge function `targeted-humanize/index.ts` — simplificare
Actuala logică GPTZero scan → rewrite cu GPT-5 se înlocuiește cu:
- GPTZero scan pentru scorul inițial
- Trimite tot conținutul la Undetectable.ai (nu doar propozițiile flagged — API-ul lor decide ce rescrie)
- GPTZero re-scan pentru confirmare
- Returnează pass results ca înainte

### 4. Auto-check din `generate-assignment/index.ts` — GPTZero real
Înlocuim blocul Gemini "meta-detector" (liniile 346-394) cu un scan GPTZero real:
```text
POST https://api.gptzero.me/v2/predict/text
  { document: generatedContent }
  → overall_score, human_score, sentences
```
Asta dă feedback precis direct la generare.

### 5. Retrieval surse reale — nou: `fetch-references/index.ts`
Edge function nouă care caută surse academice reale din OpenAlex (gratuit, fără API key):
```text
GET https://api.openalex.org/works?search={topic}&filter=publication_year:2019-2025&per_page=20&mailto=support@assignmentpro.uk
```
- Se apelează ÎNAINTE de generarea assignment-ului
- Returnează titluri, autori, an, DOI, journal
- Referințele reale se includ în prompt-ul de generare ca "MUST USE these references"

### 6. Update `generate-assignment/index.ts` — multi-step cu surse reale
Fluxul devine:
```text
Step 1: Call fetch-references cu titlul + brief → lista de surse reale
Step 2: Injectează sursele în system prompt: "Use ONLY these real references: [...]"
Step 3: Generează assignment-ul cu GPT-5 (cum e acum)
Step 4: GPTZero scan real pentru AI detection score
Step 5: Similarity check (cum e acum)
```

### 7. UI updates
- `AssignmentEditor.tsx`: timeout humanize mărit la 150s, mesaje progress actualizate
- `DeepHumanizeProgress.tsx`: labels actualizate ("AI bypass engine" în loc de "rewriting")
- `NewAssignment.tsx`: progress messages actualizate pentru multi-step

## Fișiere de creat/modificat

| Fișier | Schimbare |
|--------|-----------|
| **Secret** `UNDETECTABLE_API_KEY` | Nou — solicitat userului |
| `supabase/functions/humanize-text/index.ts` | Rescriere — Undetectable.ai submit/poll |
| `supabase/functions/targeted-humanize/index.ts` | Rescriere — Undetectable.ai + GPTZero |
| `supabase/functions/fetch-references/index.ts` | **Nou** — OpenAlex API search |
| `supabase/functions/generate-assignment/index.ts` | Multi-step: fetch refs → generate → GPTZero real scan |
| `src/pages/AssignmentEditor.tsx` | Timeout + progress messages |
| `src/components/editor/DeepHumanizeProgress.tsx` | Labels |
| `src/pages/NewAssignment.tsx` | Progress messages multi-step |

## Ordinea implementării

1. Solicităm `UNDETECTABLE_API_KEY` de la user
2. Creăm `fetch-references` edge function (OpenAlex)
3. Actualizăm `generate-assignment` (multi-step + GPTZero real)
4. Rescriem `humanize-text` (Undetectable.ai)
5. Rescriem `targeted-humanize` (Undetectable.ai + GPTZero)
6. Actualizăm UI (timeouts, labels, progress)

## Impact

- **Referințe**: Toate vor fi reale, verificabile — nu mai trebuie "validate references" post-factum
- **AI detection la generare**: Scor GPTZero real, nu estimare Gemini
- **Humanizare**: Undetectable.ai cu model v11sr — construit specific pentru bypass detectors
- **Cost adițional**: Undetectable.ai plans de la ~$5/lună

