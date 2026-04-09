

## GPTZero — funcționalități extra pe care le putem integra

GPTZero returnează deja date pe care nu le folosim. Iată ce putem adăuga:

### 1. Sentence-level AI highlighting în editor
GPTZero returnează `sentences[]` cu `generated_prob` și `highlight_sentence_for_ai` per propoziție. Putem evidenția direct în TipTap editorul propozițiile marcate ca AI — roșu pentru prob > 0.7, galben pentru 0.4-0.7. Userul vede exact CE trebuie rescris, nu doar un scor global.

### 2. Confidence level + clasificare detaliată
GPTZero returnează `class_probabilities` (probabilitate pentru HUMAN_ONLY, MIXED, AI_ONLY) și `confidence_category` (high/medium/low). Putem afișa un badge de confidence — când e "high", userul știe că scorul e de încredere; când e "low", afișăm un warning.

### 3. Sentence-level breakdown panel
Un panou colapsabil care arată fiecare propoziție cu scorul ei individual — sortate de la cel mai AI la cel mai uman. Userul poate click pe o propoziție și editorul scrollează la ea.

---

### Plan tehnic

**A. Edge function — returnează date extra** (`check-ai-detection/index.ts`)
- Adăugăm în response: `sentences` (array cu text + generated_prob + highlight flag), `confidence_category`, `class_probabilities`
- Structura răspunsului devine: `{ overall_score, human_score, details, confidence, sentences }`

**B. UI — AiDetectionScore.tsx îmbunătățit**
- Adăugăm confidence badge (High/Medium/Low) lângă scor
- Adăugăm panou colapsabil "Sentence Analysis" cu lista de propoziții colorate pe baza scorului
- Click pe propoziție → callback opțional pentru scroll în editor

**C. TipTap highlighting** (`TipTapEditor.tsx`)
- Adăugăm un prop `highlightedSentences` care primește array-ul de la GPTZero
- Folosim extensia `Highlight` (deja instalată) pentru a marca propozițiile AI cu background roșu/galben
- Buton toggle "Show AI highlights" care activează/dezactivează vizualizarea

**D. Wiring în AssignmentEditor.tsx**
- Pasăm `sentences` din rezultatul detection-ului către TipTapEditor
- Adăugăm state pentru toggle highlights on/off

### Fișiere modificate

| Fișier | Ce se schimbă |
|--------|--------------|
| `supabase/functions/check-ai-detection/index.ts` | Returnează sentences + confidence extra |
| `src/components/editor/AiDetectionScore.tsx` | Confidence badge + sentence breakdown panel |
| `src/components/editor/TipTapEditor.tsx` | Highlight AI sentences în text |
| `src/pages/AssignmentEditor.tsx` | Wire sentences data între componente |

