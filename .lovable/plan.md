

## Diagnostic: Eroarea NU este de credite

### Cauza reală
Logurile Edge Function arată clar eroarea:
```
"Unsupported value: 'temperature' does not support 1.1 with this model. Only the default (1) value is supported."
```

Pe linia 281 din `generate-assignment/index.ts`, parametrul `temperature: 1.1` este trimis la modelul `openai/gpt-5`, care acceptă doar `temperature: 1`. Cererea AI eșuează cu status 400, iar frontend-ul afișează o eroare generică.

**Utilizatoarea avea 1,500 credite și a cerut 1,500 cuvinte — creditele erau suficiente.** Nu s-a consumat niciun credit deoarece generarea a eșuat înainte de a ajunge la deducere.

### De asemenea: bonusul de 5,000 credite
Bonusul nu a fost aplicat — utilizatoarea încă are 1,500 credite. Trebuie aplicat din nou.

### Plan de fix

| Fișier | Schimbare |
|--------|-----------|
| `supabase/functions/generate-assignment/index.ts` | Schimbă `temperature: 1.1` → `temperature: 1` (linia 281) |
| Database | Aplică bonusul de 5,000 credite pentru `dumitru.florentina82@yahoo.com` (1,500 → 6,500) |

Ambele fix-uri sunt simple și directe — un singur caracter în cod și un UPDATE în baza de date.

