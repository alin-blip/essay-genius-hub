

## Plan: Auto-Humanize Loop — humanizare repetată până AI score < 10%

### Cum funcționează

Un nou buton **"Auto-Humanize"** în editor care:
1. Ia conținutul curent (original sau deja humanizat)
2. Rulează `humanize-text` → primește text humanizat
3. Rulează `check-ai-detection` pe rezultat → verifică scorul AI
4. Dacă `overall_score > 10%`, repetă de la pas 2 cu noul text
5. Se oprește când scorul AI < 10% SAU după maxim 5 pase (safety limit)
6. Arată progresul live: "Pass 1/5... AI Score: 45% → Pass 2/5... AI Score: 22% → Pass 3/5... AI Score: 8% ✅"

### Modificări

**`src/pages/AssignmentEditor.tsx`** — singura modificare:
- Adaugă state: `autoHumanizing`, `autoHumanizePass`, `autoHumanizeScore`, `maxPasses = 5`
- Funcție `handleAutoHumanize`:
  - Loop: call `humanize-text` → call `check-ai-detection` → check score
  - Dacă score ≤ 10, oprește și salvează
  - Dacă pass === maxPasses, oprește cu ce avem (cel mai bun rezultat)
  - La fiecare pas, actualizează UI cu pass-ul curent și scorul
- Buton nou **"Auto-Humanize"** lângă butonul existent de "Humanize Text", cu icon `Wand2` + `Bot`
- Progress card actualizat: arată pass-ul curent, scorul AI la fiecare iterație, și statusul

**Edge functions** — nicio modificare. Refolosim `humanize-text` și `check-ai-detection` existente, apelate secvențial din client.

### UI în timpul procesului

Card de progress cu:
- "Auto-Humanize — Pass 2 of 5"
- Progress bar
- "Current AI Score: 34% → Target: < 10%"
- Buton "Stop" pentru a opri loop-ul devreme și a păstra rezultatul curent

### Costuri credite

Fiecare pass de humanizare costă credite (ca acum). Userul vede la final totalul: "Used 15 credits across 3 passes. 485 credits remaining."

### Fișiere modificate
| Fișier | Ce se schimbă |
|--------|--------------|
| `src/pages/AssignmentEditor.tsx` | Buton Auto-Humanize, loop logic, progress UI |

