

## Diagnostic: Eroare la auto-humanizare (nu la generare)

### Ce s-a întâmplat
Utilizatoarea a generat un assignment Distinction. Generarea principală a **funcționat** (scorul AI a fost 90%). Dar în pasul următor — **auto-humanizarea** — sistemul a trimis din nou `temperature: 1.1` la modelul `openai/gpt-5`, care acceptă doar `temperature: 1`.

Logurile confirmă:
```
Pass 1: AI score 90% > 40% — humanizing...
Humanize pass 1 failed with status 400
Http: connection closed before message completed
```

Am corectat `temperature` la linia 281 (generarea principală), dar am ratat **linia 477** — aceeași valoare invalidă `1.1` în bucla de auto-humanizare.

### Credite
Balanța actuală: **3,500 credite** (din 6,500 inițiale). Deci bonusul de 5,000 a fost aplicat, iar generarea anterioară a consumat credite. Creditele sunt OK.

### Fix necesar

| Fișier | Linia | Schimbare |
|--------|-------|-----------|
| `supabase/functions/generate-assignment/index.ts` | 477 | `temperature: 1.1` → `temperature: 1` |

Un singur caracter de schimbat. După deploy, auto-humanizarea va funcționa și assignment-urile Distinction nu vor mai eșua.

