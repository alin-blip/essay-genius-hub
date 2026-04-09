

## Plan: Simplificare pricing + sidebar + free trial launch

### Ce se schimbă

**1. Landing page — un singur CTA "Start for free"**
- Eliminăm `PricingSection` complet din Landing page
- Eliminăm linkul "Pricing" din nav
- Hero CTA devine "Start for Free — 1,500 words free"
- CTA-ul final de pe pagină: același mesaj, fără prețuri
- Fișiere: `src/pages/Landing.tsx`

**2. Sidebar pentru userii logați**
- Creăm `src/components/AppSidebar.tsx` cu: Dashboard, New Assignment, Plans & Upgrade, Manager (upsell), Settings
- Creăm `src/components/DashboardLayout.tsx` — wrapper cu `SidebarProvider` + `AppSidebar` + `SidebarTrigger` în header
- Aplicăm layout-ul pe toate paginile protejate: Dashboard, NewAssignment, AssignmentEditor, Plans, Settings
- Eliminăm nav-ul inline din Dashboard (și din celelalte pagini care îl au)
- Fișiere: `src/components/AppSidebar.tsx` (nou), `src/components/DashboardLayout.tsx` (nou), `src/pages/Dashboard.tsx`, `src/pages/NewAssignment.tsx`, `src/pages/AssignmentEditor.tsx`, `src/pages/Settings.tsx`, `src/pages/Plans.tsx`

**3. Manager upsell în dashboard + sidebar**
- În sidebar: item "Assignment Manager" cu badge "50% OFF" și icon Crown
- Pe Dashboard: card upsell vizibil care arată cele 3 addon-uri cu preț tăiat + 50% early bird
- Prețurile afișate: ~~£100~~ £50/mo, ~~£499~~ £250/year, ~~£997~~ £499/year
- Acestea sunt doar prețuri afișate; checkout-ul va folosi un coupon Stripe separat (creat cu tool-ul Stripe)
- Fișiere: `src/components/AppSidebar.tsx`, `src/pages/Dashboard.tsx`

**4. Plans page — simplificat**
- Păstrăm pagina Plans dar o facem accesibilă doar din sidebar/dashboard
- Arătăm Student + Agent tiers (ca și până acum) + Manager add-ons cu early bird 50%
- Nu mai apare pe landing

**5. Free trial la launch**
- Default credits rămân 1,500 (actualizare din 5,000 curent) pentru userii noi
- Update mesajele din landing/hero: "Start with 1,500 free words"

### Detalii tehnice

| Componentă | Acțiune |
|------------|---------|
| `Landing.tsx` | Elimină import PricingSection, elimină `#pricing` din nav, actualizează hero text |
| `AppSidebar.tsx` | Nou — sidebar cu NavLink, icons, Manager upsell badge |
| `DashboardLayout.tsx` | Nou — SidebarProvider wrapper |
| `Dashboard.tsx` | Înlocuiește nav cu DashboardLayout, adaugă Manager upsell card prominent |
| `NewAssignment.tsx`, `AssignmentEditor.tsx`, `Settings.tsx`, `Plans.tsx` | Wrap în DashboardLayout |
| `profiles` table | Migration: `ALTER TABLE profiles ALTER COLUMN credits_balance SET DEFAULT 1500` |
| Stripe | Creare coupon 50% "EARLYBIRD50" pentru manager add-ons |

### Ordine implementare
1. Migration DB (default credits 1500)
2. Creare Stripe coupon 50%
3. AppSidebar + DashboardLayout
4. Refactor pagini protejate cu sidebar
5. Simplificare Landing (elimină pricing, update CTA)
6. Manager upsell card în Dashboard

