
Audit complet pe flow-ul de creare assignment:

1. Ce am verificat
- codul din `generate-assignment`, `humanize-text`, `regenerate-section`, `NewAssignment`, `check-subscription`
- datele userului raportat din baza de date
- assignment-urile recente ale userului
- logurile backend pentru `generate-assignment` (nu au returnat evenimente utile)

2. Concluzie pentru userul raportat
- Nu există dovadă că i s-au luat mai multe credite decât a cerut.
- Userul are acum `3,500` credite.
- Are 2 assignment-uri recente `Distinction` de `1,500` words salvate cu succes.
- Deducerea a fost exact `1,500` credite per cerere, deci totalul consumat este compatibil cu balanța actuală.
- Problema reală observată nu este overcharge, ci că sistemul livrează mult peste word count-ul cerut.

3. Dovezi concrete
```text
Balance curent: 3,500

Assignment-uri recente:
- 2026-04-08 18:04 UTC | Distinction | requested 1,500 | status completed
- 2026-04-08 18:07 UTC | Distinction | requested 1,500 | status completed

Word count real generat din metadata:
- cerere 1,500 -> output ~4,451 words
- cerere 1,500 -> output ~4,252 words
```

4. Ce înseamnă mesajul “Please contact support”
Există exact acest mesaj în backend, în `supabase/functions/generate-assignment/index.ts`, și este returnat doar când serviciul AI răspunde cu `402`:
```text
"AI service credits exhausted. Please contact support."
```
Asta indică o problemă de backend/provider credits, nu lipsă de credite la user.

Important: nu pot confirma 100% că asta a fost eroarea din ultima încercare, fiindcă logurile pentru `generate-assignment` sunt goale acum. Dar acesta este locul exact din cod care produce mesajul descris de user.

5. Ce NU mai pare să fie problema
Bugul vechi cu `temperature: 1.1` nu mai apare în codul actual:
- generare principală: `temperature: 1`
- auto-humanizare: `temperature: 1`

Deci eroarea veche de tip “unsupported temperature” pare deja corectată.

6. Probleme reale descoperite în audit
A. Over-generation sever
- userul cere 1,500 words, dar sistemul produce peste 4,200
- asta nu supra-taxeză userul, dar creează risc mare de neîncredere și inconsistență de produs

B. Credit logic ne-atomică
- flow-ul este: citește creditele -> generează -> salvează assignment -> scade creditele
- dacă două requesturi pornesc simultan, se poate consuma greșit

C. Bug critic de billing la utilizatorii cu abonament
- `check-subscription` resetează `credits_balance` la valoarea completă a planului la refresh/login
- asta poate reumple creditele consumate periodic
- nu explică cazul acestui user free, dar este un bug major de integritate

D. Limitările planului nu sunt impuse corect
- în frontend se folosesc doar limitele de assignment-uri/lună
- `wordsPerMonth` și limitele promise per assignment nu sunt aplicate efectiv la generare

E. Mismatch UI vs backend
- slider-ul din UI merge până la `15,000`
- backend-ul acceptă maxim `10,000`
- deci userii pot selecta valori care vor pica în backend

F. Logică neclară la humanization cost
- comentariul spune “half of generation”
- codul taxează `Math.ceil(word_count / 200)`, deci pentru 1,500 words costă doar 8 credite
- asta e inconsistent cu restul modelului de pricing

7. Concluzia de business
- Pentru userul raportat, auditul nu arată că sistemul ia mai multe credite decât trebuie.
- Arată însă clar că sistemul generează mult mai multe cuvinte decât cere userul.
- Dacă userul a văzut mesajul cu “contact support”, sursa cea mai probabilă este epuizarea creditelor serviciului AI din backend, nu credit shortage la user.
- Fără loguri persistente pe fiecare încercare, suportul rămâne prea mult bazat pe presupuneri.

8. Plan recomandat de remediere
Prioritate 1
- adăugat audit trail pentru fiecare generare: user, requested words, credits before/after, status AI provider, pasul unde a eșuat

Prioritate 2
- refăcută deducerea de credite atomic în backend, cu verificare și update într-un singur pas sigur

Prioritate 3
- separat “plan entitlement” de `credits_balance`; `check-subscription` nu trebuie să reseteze soldul consumat la fiecare refresh

Prioritate 4
- impuse exact aceleași limite în UI și backend:
  - max words/request
  - limite plan
  - cap per assignment

Prioritate 5
- constrâns generatorul să livreze aproape de word count-ul cerut, nu 2.8x–3x peste

Prioritate 6
- înlocuit mesajul generic “contact support” cu eroare mai clară și log intern detaliat

Detalii tehnice
```text
Cod curent:
- generate-assignment main temperature: 1
- generate-assignment auto-humanize temperature: 1

Sursa exactă a mesajului:
- supabase/functions/generate-assignment/index.ts
- branch-ul de răspuns pentru AI gateway status 402

Date user auditat:
- credits_balance: 3,500
- subscription_plan: free
- account_type: student
```
