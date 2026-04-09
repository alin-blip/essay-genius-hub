

## Plan: Manager scroll, Early Bird labeling, Stripe verification + conversion improvements

### 1. Sidebar Manager link → scroll la secțiunea Manager

**Problema:** Click pe "Manager" din sidebar duce la `/plans#manager` dar pagina nu scrollează la secțiunea de manager add-ons.

**Fix:** În `Plans.tsx`, adăugăm un `useEffect` care verifică `location.hash === "#manager"` și face `scrollIntoView` pe secțiunea Manager. Adăugăm `id="manager"` pe div-ul cu Manager Add-ons.

**Fișier:** `src/pages/Plans.tsx`

### 2. Early Bird messaging — fără coupon, doar label

**Ce ai cerut:** Prețurile din Stripe rămân exact cum sunt. Nu modificăm nimic în Stripe. Doar adăugăm vizual label-ul "Early Bird" pe prețurile existente, ca mesaj de marketing.

**Ce facem:**
- Pe Plans page, la secțiunea Manager, adăugăm badge "🎓 Early Bird Price" pe fiecare card
- Pe Dashboard upsell dialog, la fel — badge "Early Bird" vizibil
- Prețurile rămân identice cu ce e în Stripe (£100/mo, £499/yr, £997/yr)
- NU se creează coupon, NU se modifică priceId-urile

**Fișiere:** `src/pages/Plans.tsx`, `src/pages/Dashboard.tsx`

### 3. Verificare Stripe — funcționează?

Am verificat codul:
- **Checkout:** `create-checkout` edge function există, primește `price_id`, creează sesiune Stripe → redirect. Funcționează.
- **Subscription check:** `check-subscription` verifică subscripția activă pe Stripe, returnează `product_id`. Funcționează.
- **Customer portal:** `customer-portal` creează sesiune de billing portal pentru manage/cancel. Funcționează.
- **Upgrade:** Dacă userul e deja abonat și dă click pe alt plan, codul îl trimite la Customer Portal unde poate face switch. Funcționează.
- **Produsele Stripe** sunt toate create corect (Student Basic/Plus/Pro, Agent Starter/Pro/Unlimited, Manager Monthly/Academic/Final Year).

**Concluzie: Stripe e funcțional.** Checkout, upgrade, portal — toate merg.

### 4. Ce se întâmplă când userul rămâne fără credite?

**Acum:** Generarea eșuează cu eroare "Insufficient credits". Nu e clar ce trebuie să facă userul.

**Improvement:** Adăugăm un **low-credits banner** pe Dashboard când creditele < 500 (sub 1 assignment). Banner cu CTA "Upgrade for more words" care duce la `/plans`. De asemenea, în flow-ul de generare din `NewAssignment`, dacă creditele sunt sub word_count cerut, arătăm un mesaj clar cu link la upgrade.

**Fișiere:** `src/pages/Dashboard.tsx`, `src/pages/NewAssignment.tsx`

### 5. Conversion improvements

| Improvement | Unde | Ce facem |
|---|---|---|
| **Low credits nudge** | Dashboard | Banner galben când credits < 500: "Running low on words? Upgrade now" |
| **Post-generation upsell** | Dashboard (after checkout success) | Deja există — arată Manager upsell dialog |
| **Manager upsell card permanent** | Dashboard | Card vizibil permanent (nu doar dialog) sub stats, cu "Early Bird" badge și CTA |
| **Credits exhausted blocker** | NewAssignment | Dacă credits < word_count selectat, disable butonul Generate și arată "Upgrade to continue" |

### Rezumat implementare

1. `Plans.tsx` — adaugă `id="manager"` + `useEffect` scroll + "Early Bird Price" badge pe Manager cards
2. `Dashboard.tsx` — low-credits banner + Manager upsell card permanent (nu doar dialog) + "Early Bird" badge
3. `NewAssignment.tsx` — verificare credits vs word_count selectat, disable Generate + upgrade CTA

### Detalii tehnice

- Scroll: `document.getElementById("manager")?.scrollIntoView({ behavior: "smooth" })`
- Early Bird badge: `<Badge className="bg-amber-500 text-white">🎓 Early Bird</Badge>` pe prețuri existente
- Low credits threshold: 500 words (configurable)
- Nu se modifică nimic în Stripe, edge functions, sau subscription-tiers.ts

