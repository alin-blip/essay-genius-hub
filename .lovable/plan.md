

## Plan: Integrare GPTZero API ca detector AI real

### Ce se schimbă

Înlocuim estimarea Gemini din `check-ai-detection` cu un apel real la **GPTZero API** (`POST https://api.gptzero.me/v2/predict/text`). GPTZero returnează:
- `completely_generated_prob` (0-1) — probabilitatea ca textul e complet AI
- `average_generated_prob` (0-1) — media per propoziție
- `overall_burstiness` — scor burstiness (mic = mai AI)
- `document_classification` — `HUMAN_ONLY`, `MIXED`, `AI_ONLY`
- `sentences[]` — per-sentence `generated_prob` + `highlight_sentence_for_ai`

### Pași

**1. Adăugare secret `GPTZERO_API_KEY`**
- Userul trebuie să obțină un API key de la [gptzero.me/developers](https://gptzero.me/developers)
- Îl salvăm ca secret în backend

**2. Rescriere `supabase/functions/check-ai-detection/index.ts`**
- Înlocuim apelul Gemini cu `POST https://api.gptzero.me/v2/predict/text`
- Header: `x-api-key: ${GPTZERO_API_KEY}`
- Body: `{ "document": content }`
- Mapăm răspunsul:
  - `overall_score` = `completely_generated_prob * 100` (scor AI %)
  - `human_score` = `100 - overall_score`
  - `details` = clasificarea + burstiness + confidence
- Păstrăm aceeași structură de răspuns `{ overall_score, human_score, details }` — UI-ul nu se schimbă

**3. UI update mic în `AiDetectionScore.tsx`**
- Adăugăm badge "Powered by GPTZero" pentru credibilitate
- Eliminăm disclaimer-ul "estimated" — acum e un detector real

### Ce NU se schimbă
- Structura răspunsului edge function (same interface)
- `AssignmentEditor.tsx` — auto-humanize loop funcționează identic
- `humanize-text` — neatins
- Credit logic — neatinsă

### Fișiere modificate

| Fișier | Ce se schimbă |
|--------|--------------|
| `supabase/functions/check-ai-detection/index.ts` | Gemini → GPTZero API call |
| `src/components/editor/AiDetectionScore.tsx` | Badge "Powered by GPTZero" |

### Prerequisit
Userul trebuie să-și facă cont pe gptzero.me și să obțină un API key (~$0.02/scan, plan de la $15/lună).

