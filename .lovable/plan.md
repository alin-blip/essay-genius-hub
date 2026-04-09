

## Audit: De ce scorul AI e 75% și cum fixăm

### Problemele identificate

**1. AI Detection checker-ul e fake — nu e Turnitin real**
`check-ai-detection` folosește Gemini să *ghicească* un scor. Nu e un detector real. E un AI care evaluează alt AI. Scorul de 75% poate fi complet greșit — nu reflectă ce ar zice Turnitin. Asta înseamnă că:
- Auto-humanize loop-ul poate rula 5 pase degeaba, pentru că "scorul" e arbitrar
- Userul pierde credite pe re-humanizări ghidate de un scor nesigur
- Gemini e inconsistent — același text poate primi 30% sau 75% la verificări diferite

**2. Promptul de humanizare e prea agresiv — strică lucrarea**
Promptul curent cere:
- "false starts and self-corrections" — strică fluxul academic
- "rhetorical questions" — nenatural în multe tipuri de assignment
- "slightly digresses" — strică structura
- "kind of, sort of" — prea informal pentru academic writing
- "sentence fragments" — nu e potrivit pentru un essay universitar

Rezultatul: textul humanizat pare scris de un student slab, nu de unul bun. Și tot are pattern-uri AI detectabile.

**3. Generarea inițială deja are instrucțiuni anti-AI**
`generate-assignment` are deja un prompt excelent cu burstiness, banned words, imperfections. Deci textul generat ar trebui să fie deja semi-human. Humanize-ul ar trebui doar să finiseze, nu să rescrie complet.

### Planul de fix

**A. Îmbunătățim promptul de humanizare — subtil, nu agresiv**

Rescrierea promptului `HUMANIZE_PROMPT` cu focus pe:
- Păstrează structura și argumentele 100% intacte
- Înlocuiește doar vocabularul tipic AI (lista de banned words)
- Variază lungimea propozițiilor (burstiness) fără a adăuga fragmente stupide
- Adaugă contractions natural, fără "sort of / kind of"
- NU adaugă digresiuni, retorici, false starts
- Mișcă citările în poziții variate
- Păstrează tonul academic dar natural — ca un student 2:1/First, nu ca unul slab

**B. Facem AI Detection checker-ul mai robust**

Schimbăm promptul din `check-ai-detection` ca să fie mai strict și consistent:
- Adaugă criterii clare de scoring cu ponderi
- Setăm `temperature: 0.1` (în loc de 0.3) pentru consistență
- Adăugăm instrucțiuni clare: "Score conservatively — if unsure, give benefit of doubt to human"
- Trimitem mai mult text (10k chars în loc de 5k) pentru analiză mai bună

**C. Simplificăm UX-ul — un singur buton clar**

În editor, în loc de 2 butoane (Humanize + Auto-Humanize):
- Păstrăm doar **"Humanize"** care face o singură pasă bună
- **"Auto-Humanize"** rămâne dar cu maxim 3 pase (nu 5) și target 15% (nu 10%, care e nerealist cu un checker AI-based)
- Afișăm warning clar: "AI score is estimated — always check with your university's tools before submitting"

### Fișiere modificate

| Fișier | Ce se schimbă |
|--------|--------------|
| `supabase/functions/humanize-text/index.ts` | Prompt rescris complet — subtil, păstrează calitatea |
| `supabase/functions/check-ai-detection/index.ts` | Prompt mai strict, temp 0.1, 10k chars sample |
| `src/pages/AssignmentEditor.tsx` | MAX_PASSES=3, TARGET_SCORE=15, warning text |

### Ce NU schimbăm
- `generate-assignment` — promptul e deja bun
- Logica de credite — rămâne la fel
- Structura edge functions — rămâne la fel

