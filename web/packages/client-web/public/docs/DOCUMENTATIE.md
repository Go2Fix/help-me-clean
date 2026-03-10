# Go2Fix.ro — Documentație Platformă

> **Versiune:** Actualizată la 10 martie 2026
> **Scop:** Referință completă a funcționalității platformei. Oricine citește acest document trebuie să înțeleagă cum funcționează Go2Fix, ce poate face fiecare tip de utilizator și cum se rezolvă problemele operaționale frecvente.

---

## Cuprins

1. [Prezentare Generală](#1-prezentare-generală)
2. [Autentificare](#2-autentificare)
3. [Fluxul Clientului](#3-fluxul-clientului-cont)
4. [Fluxul Firmei](#4-fluxul-firmei-firma)
5. [Fluxul Angajatului](#5-fluxul-angajatului-worker)
6. [Fluxul Administratorului](#6-fluxul-administratorului-admin)
7. [Ciclul de Viață al Rezervărilor](#7-ciclul-de-viață-al-rezervărilor)
8. [Sistemul de Dispute](#8-sistemul-de-dispute)
9. [Abonamente Recurente](#9-abonamente-recurente)
10. [Plăți și Facturare](#10-plăți-și-facturare)
11. [Gestionarea Prețurilor](#11-gestionarea-prețurilor)
12. [Întrebări Frecvente Operaționale](#12-întrebări-frecvente-operaționale)

---

## 1. Prezentare Generală

**Go2Fix.ro** este prima platformă de servicii pentru casă din România. Funcționează ca un marketplace care conectează clienții cu firme de curățenie verificate și angajații acestora.

### Tipuri de utilizatori

| Tip | Rol în sistem | Portal |
|-----|--------------|--------|
| **Client** | Persoana care solicită și plătește serviciile | `/cont` |
| **Firmă (Company Admin)** | Administrator al unei firme de servicii | `/firma` |
| **Angajat (Worker)** | Prestatorul de servicii (curățenie etc.) | `/worker` |
| **Administrator (Admin)** | Echipa Go2Fix — gestionează întreaga platformă | `/admin` |

### Modul platformei

Platforma are două moduri de funcționare, configurabile din panoul admin:

- **`pre_release`** — Pagina de rezervare (`/rezervare`) redirecționează automat către lista de așteptare (`/lista-asteptare`). Clienții și firmele se pot înscrie, dar nu pot plasa rezervări.
- **`live`** — Platforma este complet funcțională. Oricine poate plasa o rezervare fără autentificare prealabilă.

Modul curent se schimbă din **Admin > Setări** (câmpul `platform_mode`).

---

## 2. Autentificare

**Rută:** `/autentificare`

### Metode de autentificare

**1. Google OAuth**
- Utilizatorul apasă "Continuă cu Google"
- Se selectează contul Google
- Dacă este cont nou, se creează automat un profil cu rolul corespunzător

**2. Email OTP (One-Time Password)**
- Utilizatorul introduce adresa de email
- Primește un cod numeric de 6 cifre pe email
- Introduce codul pentru autentificare
- În medii de dezvoltare (non-producție), codul apare direct în răspuns (`devCode`)

### Redirecționare după autentificare

După login, sistemul redirecționează automat în funcție de rol:

| Rol | Destinație |
|-----|-----------|
| CLIENT | `/cont` |
| COMPANY_ADMIN | `/firma` |
| WORKER | `/worker` |
| GLOBAL_ADMIN | `/admin` |

### Coduri de referral

La înregistrare, un utilizator poate introduce un cod de referral. Codul propriu al unui client devine activ după prima comandă finalizată.

---

## 3. Fluxul Clientului (`/cont`)

### 3.1 Rezervarea unui serviciu (fără autentificare)

Fluxul de rezervare este accesibil **fără cont** de pe pagina principală sau direct la `/rezervare`.

**Pași:**

1. **Selectarea categoriei** — curățenie standard, curățenie profundă, curățenie la mutare, post-construcție, birouri, geamuri
2. **Adresa** — stradă, număr, bloc, etaj, apartament, oraș, detalii acces
3. **Data și ora** — se alege dintr-un calendar; sistemul verifică disponibilitatea angajaților
4. **Detalii proprietate** — număr camere, băi, suprafață (mp), tip proprietate, animale de companie
5. **Servicii suplimentare (extras)** — opțiuni adiționale cu prețuri separate
6. **Recapitulare și confirmare** — prețul estimat, politica de anulare
7. **Plată** — card bancar prin Stripe (se poate salva cardul pentru utilizări viitoare)
8. **Confirmare** — ecran de succes cu codul de rezervare (ex: `G2F-2026-0042`)

**Notă:** După confirmare, clienții neautentificați văd un banner de conversie "Creează cont" pentru a-și salva rezervarea în cont.

**Cod promoțional:** Poate fi aplicat pe ecranul de recapitulare.

**Discount referral:** Dacă clientul are reduceri referral disponibile, le poate aplica la comandă.

### 3.2 Dashboard (`/cont`)

Ecranul principal al clientului afișează:
- **Statistici rapide:** comenzi în curs, abonamente active, total cheltuit
- **Comenzi recente** și comenzi finalizate
- **Lista de verificare (setup checklist):** verificare telefon, completare profil, prima comandă, adresă salvată
- **Acțiuni rapide:** plasează comandă, vezi abonamente, gestionează adrese

### 3.3 Comenzile mele (`/cont/comenzi`)

Listă paginată cu toate comenzile clientului.

**Filtrare și căutare:**
- Filtrare după status: `PENDING`, `ASSIGNED`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, variante de `CANCELLED`
- Filtrare după dată
- Sortare după dată, cod referință, total

Clic pe o comandă → pagina de detaliu.

### 3.4 Detaliu comandă (`/cont/comenzi/:id`)

Pagina centrală pentru gestionarea unei rezervări individuale.

**Informații afișate:**
- Cod referință, tip serviciu, dată/oră/durată
- Adresa de serviciu
- Detalii proprietate și extras comandate
- Angajatul desemnat (avatar, rating, recenzii)
- Timeline status: creare → desemnare → confirmare → în curs → finalizat

**Acțiunile clientului (depind de status):**

| Status | Acțiuni disponibile |
|--------|-------------------|
| `ASSIGNED` | Confirmă disponibilitatea, chat cu firma |
| `CONFIRMED` | Reprogramează, anulează (cu afișarea politicii de rambursare), chat |
| `IN_PROGRESS` | Urmărire status în timp real |
| `COMPLETED` | Lasă recenzie + poze, solicită rambursare, plătește factura, deschide dispută |
| 60+ min după ora de start | Marchează ca "No-Show" (angajatul nu s-a prezentat) |

**Chat:** Disponibil direct din pagina comenzii cu angajatul/firma.

**Factură:** Se poate descărca/vizualiza pentru comenzile finalizate.

### 3.5 Abonamente (`/cont/abonamente`)

Lista abonamentelor recurente ale clientului (curățenie săptămânală, bisăptămânală sau lunară).

**Detaliu abonament (`/cont/abonamente/:id`):**
- Tip serviciu, frecvență, zi/oră preferată
- Detalii proprietate și extras incluse
- Firma și angajatul desemnat
- Lista comenzilor viitoare (următoarele 10)
- **Acțiuni:** Pauză, Reluare, Anulare (cu motiv)
- **Schimbare angajat:** clientul poate solicita un alt angajat (cu motiv)
- **Banner amber:** dacă abonamentul este în status `PAST_DUE` (plată eșuată), apare un banner care redirecționează la `/cont/plati`

### 3.6 Adrese (`/cont/adrese`)

Gestionarea adreselor salvate:
- Adăugare adresă nouă: stradă, număr, bloc, etaj, apartament, oraș, cod acces, note
- Editare și ștergere adrese
- Marcare adresă ca implicită (default)

### 3.7 Metode de plată (`/cont/plati`)

- Lista cardurilor salvate (brand, ultimele 4 cifre, data expirării)
- Adăugare card nou (modal Stripe)
- Setare card implicit
- Ștergere card

### 3.8 Facturi (`/cont/facturi`)

Lista facturilor emise pentru comenzile finalizate și abonamente, cu posibilitate de descărcare PDF.

### 3.9 Chat (`/cont/mesaje`)

Mesagerie în timp real cu angajații și firmele. Istoricul conversațiilor este păstrat.

### 3.10 Profil și Setări (`/cont/setari`)

- Editare profil: nume complet, email, telefon
- Widget verificare telefon (indicator "verificat")
- Upload avatar
- Limbă preferată (RO/EN) — se salvează în cont și persistă între sesiuni
- Cod de referral personal + buton de distribuire
- **Ștergere cont** (cu modal de confirmare)

---

## 4. Fluxul Firmei (`/firma`)

### 4.1 Înregistrarea unei firme

**Rută:** `/inregistrare-firma`

**Pași:**

1. **Autentificare** — Google OAuth sau Email OTP (obligatorie)
2. **Detalii firmă:**
   - Nume firmă, CUI (cod fiscal unic)
   - Tip entitate: SRL, PFA, II, IF sau SA
   - Reprezentant legal, email și telefon de contact
3. **Lookup CUI automat** — dacă firma există deja în sistem, datele se precompletează
4. **Categorii de servicii** — selecție multiplă din categoriile disponibile
5. **Trimitere aplicație** → status: `PENDING_REVIEW`

**Alternativă — Revendicarea unei firme existente:**
- Dacă firma a fost deja listată de Go2Fix, administratorul poate revendica firma cu un token de revendicare (`claimToken`)
- Ruta: `/inregistrare-firma` → tab "Revendică firma"

**După aprobare:** Firma primește acces la portalul `/firma`.

### 4.2 Dashboard (`/firma`)

**Metrici principale:**
- Venit total (ultimele 30 zile)
- Comenzi finalizate (luna curentă)
- Rating mediu
- Venit net (după comisionul platformei)
- Abonamente active și MRR (venit lunar recurent)

**Grafic venituri:** Grafic pe arii (ultimele 30 zile) cu venit brut și comision platformă.

**Lista de verificare (setup checklist):**
1. Logo încărcat
2. Descriere completată
3. Telefon adăugat
4. Documente obligatorii încărcate și aprobate
5. Stripe Connect configurat (pentru primirea plăților)
6. Categorii de servicii selectate
7. Arii de servicii configurate (orașe/cartiere)

**Comenzi recente:** Ultimele 5 comenzi cu status și sumă.

**Abonamente active:** Ultimele 5 abonamente cu frecvența și suma lunară.

### 4.3 Comenzi (`/firma/comenzi`)

Lista completă a rezervărilor firmei.

**Filtrare:**
- Status: `ASSIGNED`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, variante `CANCELLED`
- Căutare: cod referință, dată, numele clientului

**Export CSV** al comenzilor filtrate.

**Detaliu comandă (`/firma/comenzi/:id`):**
- Informații complete: client, tip serviciu, dată/oră, locație, angajat desemnat
- Estimat vs. total final
- Timeline status
- **Acțiuni firmă:**
  - `PENDING/ASSIGNED`: Desemnează angajat din echipă
  - `CONFIRMED`: Vizualizare informații angajat
  - `COMPLETED`: Vizualizare recenzie client, câștiguri
- Chat cu clientul
- Descărcare factură

### 4.4 Echipă (`/firma/echipa`)

Gestionarea angajaților firmei.

**Lista angajaților:**
- Filtrare după status: `ACTIVE`, `INACTIVE`, `INVITED`, `SUSPENDED`
- Căutare după nume/email
- Informații card: avatar, nume, email, telefon, status, rating, joburi finalizate, categorii de servicii

**Invitarea unui angajat nou:**
1. Clic pe **+ Invită Angajat**
2. Completare formular: nume, email, categorii de servicii (opțional)
3. Sistemul generează un token de invitație (`inv-xxxxxxxx`)
4. Se afișează link-ul de invitație: `go2fix.ro/invitare?token=inv-xxx`
5. Copiere link → trimis angajatului pe orice canal (WhatsApp, email etc.)

**Notă:** La trimiterea invitației, disponibilitatea săptămânală a angajatului este **populată automat** pe baza programului de lucru al firmei (configurat în `/firma/setari`).

**Detaliu angajat (`/firma/lucratori/:id`):**
- Profil complet: nume, telefon, email, avatar, rating
- Statistici: joburi finalizate, recenzii, rating mediu
- Categorii de servicii desemnate
- Status curent al angajatului

**Gestionare program angajat:**
- Secțiunea de disponibilitate din pagina de detaliu include butonul **"Editează program"**
- Administratorul firmei poate activa/dezactiva zilele de lucru și seta orele de start-end per zi pentru angajat
- Modificările se salvează imediat și devin vizibile angajatului ca program read-only

**Zile libere lucrător:**
- Un card dedicat **"Zile libere lucrător"** permite administratorului să adauge sau să anuleze zile libere punctuale pentru angajat
- Zilele libere adăugate funcționează ca override-uri pe datele respective, blocând alocarea de joburi

### 4.5 Calendar (`/firma/program`)

Vizualizare săptămânală a programului firmei cu joburile desemnate pe zile și ore. Permite vizualizarea globală a disponibilității echipei. Editarea programului individual al fiecărui angajat se face din pagina de detaliu a angajatului (`/firma/lucratori/:id`).

### 4.6 Mesaje (`/firma/mesaje`)

Lista conversațiilor cu clienții și angajații. Mesagerie în timp real.

### 4.7 Plăți și Viramente (`/firma/plati`)

**Rezumat câștiguri:**
- Total brut, comision platformă, net de primit
- Lista virarilor: sumă, perioadă, status (`PENDING`, `COMPLETED`, `FAILED`)
- Detaliu virar: ID tranzacție, defalcare per comandă (brut, comision, net)

**Stripe Connect:**
- Dacă firma nu este conectată, apare butonul "Configurează cont Stripe"
- Onboarding complet prin platforma Stripe (date bancare, identitate etc.)
- Fără Stripe Connect, firma nu poate primi virări

### 4.8 Recenzii (`/firma/recenzii`)

Lista recenziilor primite de la clienți, cu posibilitate de filtrare după numărul de stele (1-5). Firma poate răspunde la recenzii.

### 4.9 Abonamente (`/firma/abonamente`)

Lista abonamentelor recurente ale clienților firmei.

**Detaliu abonament (`/firma/abonamente/:id`):**
- Informații abonament: client, tip serviciu, frecvență, angajat desemnat
- Lista comenzilor viitoare
- Acțiuni: Pauză, Reluare, Anulare

### 4.10 Facturi (`/firma/facturi`)

Lista facturilor emise de firmă către clienți, cu descărcare PDF.

### 4.11 Setări (`/firma/setari`)

**Profil firmă:**
- Nume, CUI, reprezentant legal, email/telefon de contact
- Upload/schimbare logo
- Descriere firmă

**Program de lucru:** Orele de operare pe fiecare zi a săptămânii (format 24h).

**Arii de servicii:** Selectarea orașelor și cartierelor în care firma activează.

**Categorii de servicii:** Vizualizare categorii active și solicitare acces la categorii noi (necesită aprobare admin).

**Date fiscale:** Număr registru comerț, regim TVA, bancă, IBAN (necesare pentru facturi conforme).

**Stripe Connect:** Configurare/gestionare cont de plăți.

**Limbă preferată:** RO/EN, se aplică imediat.

---

## 5. Fluxul Angajatului (`/worker`)

### 5.1 Cum ajunge un angajat pe platformă

Angajații sunt invitați **exclusiv** de administratorii firmelor. Nu există înregistrare directă ca angajat.

**Procesul complet de onboarding (5 pași):**

```
1. Invitație → 2. Test personalitate → 3. Documente → 4. Revizuire admin → 5. Activ
```

### 5.2 Acceptarea invitației (`/invitare?token=inv-xxx`)

**Flux automat (recomandat):**
1. Angajatul primește link-ul: `go2fix.ro/invitare?token=inv-xxx`
2. Se autentifică cu Google sau Email OTP
3. Invitația se acceptă automat (token-ul din URL este procesat)
4. Redirecționare automată la `/worker`
5. Pe ecranul de succes: "Invitație acceptată! Ai fost adăugat la [Firma]"

**Flux manual (dacă link-ul nu funcționează):**
1. Accesează `/invitare` (fără token în URL)
2. Se autentifică
3. Introduce manual codul de invitație
4. Confirmă

### 5.3 Test personalitate (`/worker/test-personalitate`)

**Obligatoriu.** Blochează accesul la restul portalului până la finalizare.

- Evaluare multi-facet (integritate, calitate a muncii, comportament în echipă)
- Răspunsuri la un set de întrebări standardizate
- La finalizare, rezultatele se calculează automat (scoruri per fatetă)
- Adminul poate genera ulterior un raport de "insights" AI pe baza scorurilor

### 5.4 Documente obligatorii (`/worker/documente-obligatorii`)

**Documente necesare:**

| Document | Format | Dimensiune maximă |
|----------|--------|------------------|
| Fotografie profil (avatar) | JPEG/PNG/WebP | 10 MB |
| Cazier judiciar | PDF | 10 MB |
| Contract de muncă | PDF | 10 MB |

**Statusuri posibile:**

| Status | Semnificație |
|--------|-------------|
| Neîncărcat | Documentul nu a fost adăugat |
| `PENDING` | Trimis, în așteptare revizuire admin |
| `APPROVED` | Aprobat — nu mai poate fi șters |
| `REJECTED` | Respins — se afișează motivul, poate fi reîncărcat |

**Progres:** Bara de progres afișează câte documente au fost încărcate. Butonul "Continuă" se activează doar când toate documentele sunt încărcate (nu neapărat aprobate).

### 5.5 Dashboard angajat (`/worker`)

**Metrici principale:**
- Rating mediu (cu număr de recenzii)
- Joburi finalizate în luna curentă (cu total cumulat)

**Lista de verificare (setup checklist):**
1. Avatar — `/worker/profil`
2. Bio/Descriere — `/worker/profil`
3. Telefon verificat — `/worker/profil`
4. Test personalitate completat — `/worker/test-personalitate`
5. Documente obligatorii încărcate — `/worker/documente-obligatorii`
6. Program disponibilitate setat — `/worker/program`

**Joburile de azi:** Lista joburilor programate pentru ziua curentă (categorie, status, oră, locație). Clic → detaliu job.

**Recenzii recente:** Ultimele 3 recenzii de la clienți.

**Acțiuni rapide:** Comenzile mele, Program, Mesaje, Profil.

### 5.6 Comenzile mele (`/worker/comenzi`)

Lista completă a joburilor desemnate angajatului.

**Filtrare:** Status, dată. Căutare după cod referință.

**Card job:** Cod referință, tip serviciu, dată/oră, client, locație, status.

### 5.7 Detaliu job (`/worker/comenzi/:id`)

**Informații afișate:**
- Dată, oră, durată, locație (hartă adresă), client, tip serviciu
- Instrucțiuni speciale ale clientului

**Acțiunile angajatului (depind de status):**

| Status | Acțiune disponibilă |
|--------|-------------------|
| `ASSIGNED` | Confirmă disponibilitatea → status devine `CONFIRMED` |
| `CONFIRMED` | Marchează "Am ajuns" (Check-in) → status devine `IN_PROGRESS` |
| `IN_PROGRESS` | Marchează finalizat, adaugă note → status devine `COMPLETED` |
| `COMPLETED` | Vizualizează recenzia clientului |

**Chat:** Mesagerie directă cu clientul din pagina jobului.

### 5.8 Program (`/worker/program`)

**Disponibilitate săptămânală (read-only):**
- Tab-ul "Disponibilitate" afișează programul săptămânal setat de administratorul firmei (zilele active și orele de lucru per zi)
- Angajatul **nu poate modifica** programul săptămânal — acesta este controlat exclusiv de firmă
- Un banner informativ explică că programul este gestionat de companie

**Zile libere solicitate:**
- Angajatul poate solicita zile libere punctuale prin secțiunea "Zile libere solicitate" din același tab
- Ziua liberă aprobată funcționează ca un override pe data respectivă, blocând alocarea de joburi
- Override-urile per dată au prioritate față de programul săptămânal

### 5.9 Profil (`/worker/profil`)

- Editare date personale: nume, telefon, email, bio
- Upload avatar
- Categorii de servicii desemnate
- Arii de servicii active
- Statistici: rating, joburi finalizate
- Limbă preferată (RO/EN)

---

## 6. Fluxul Administratorului (`/admin`)

### 6.1 Dashboard (`/admin`)

**KPI-uri principale:**
- Clienți totali, firme active, angajați, comenzi (luna curentă)
- Venit total și comision platformă
- Rating mediu platformă
- Abonamente active și MRR

**Tendințe:** Comparație luna curentă vs. luna anterioară (badge +/-%).

**Grafice:**
- Venit pe ultimele 6 luni (comision vs. brut)
- Distribuția comenzilor pe statusuri (grafic pie)

**Secțiunea "Necesită atenție":**
Afișează elementele care necesită acțiune imediată, cu număr de itemi pending și link-uri directe:
- Aplicații firme în așteptare
- Documente firme de revizuit
- Documente angajați de revizuit
- Cereri categorii noi

Dashboard-ul se actualizează automat la fiecare 30 de secunde.

### 6.2 Coada de aprobare (`/admin/aprobari`)

Centrul operațional principal al adminului. Tab-uri cu contoare de itemi pending.

#### Tab 1: Aplicații firme

- Lista firmelor care au aplicat și nu sunt încă aprobate
- Informații: nume firmă, CUI, tip entitate, locație, reprezentant legal, dată aplicație
- **Progres documente:** afișează `X/Y documente aprobate`
- **Buton "Aprobă"** — activat DOAR când TOATE documentele obligatorii sunt aprobate
- **Buton "Respinge"** — modal cu câmp opțional pentru motiv de respingere
- Link direct la pagina de detaliu a firmei pentru revizuire documente

#### Tab 2: Documente firme

- Documentele încărcate de firme care necesită revizuire
- Informații: nume fișier, tip document (certificat înregistrare, cazier fiscal, copie CUI), firmă, dată upload
- Butoane **Aprobă** / **Respinge** (cu modal pentru motiv)
- Link extern pentru vizualizarea fișierului

#### Tab 3: Documente angajați

- Documentele încărcate de angajați (cazier judiciar, contract de muncă)
- Informații: nume fișier, tip document, angajat, firma angajatorului, dată upload
- Butoane **Aprobă** / **Respinge**

#### Tab 4: Activare angajați

- Angajații care au finalizat toți pașii de onboarding și sunt gata de activare:
  - Toate documentele aprobate
  - Test de personalitate completat
- Informații: nume angajat, firmă, dată înregistrare
- Status afișat în verde: "Toate documentele aprobate · Evaluare personalitate completă"
- **Buton "Activează"** → status angajat devine `ACTIVE`

> **Cum activezi profilul unui angajat?**
> 1. Mergi la `/admin/aprobari`
> 2. Selectează tab-ul **"Activare angajați"**
> 3. Verifică că angajatul are documentele aprobate și testul completat (badge verde)
> 4. Apasă butonul **"Activează"**
> 5. Statusul angajatului devine `ACTIVE` — angajatul poate acum primi joburi

#### Tab 5: Cereri categorii

- Firmele care solicită accesul la categorii noi de servicii (sau dezactivarea unora)
- Informații: firma, categoria solicitată (cu icon), tipul cererii (ACTIVATE/DEACTIVATE), dată
- Butoane **Aprobă** / **Respinge** (cu câmp opțional pentru notă)

### 6.3 Firme (`/admin/companii`)

**Tab "Pending":** Firme cu aplicații în așteptare — aprobare/respingere cu modal.

**Tab "Aprobate":** Firme active, căutare după nume.

**Tab "Toate":** Toate firmele cu filtru după status (`PENDING_REVIEW`, `APPROVED`, `SUSPENDED`, `REJECTED`). Căutare după nume/CUI. Paginare 20/pagină.

**Tab "Performanță":** Scorecard-uri firme, sortabile după venit, rating sau rată de finalizare. Rata de anulare >10% se marchează în roșu.

**Detaliu firmă (`/admin/companii/:id`):**
- Profil complet: CUI, tip, contact, adresă, categorii, arii
- Status firmă cu posibilitate de schimbare (aprobare, respingere, suspendare)
- Documente cu status per document
- Echipă: lista angajaților
- Comenzi asociate
- Recenzii clienți
- Situație financiară (viramente, facturi)
- **Acțiuni admin:** Aprobă, Respinge, Suspendă (cu modal pentru motiv), Verificare ANAF
- **Override comision:** Adminul poate seta un comision personalizat pentru firmă (diferit de cel standard al platformei)

### 6.4 Utilizatori (`/admin/utilizatori`)

Lista tuturor utilizatorilor platformei.

**Filtrare:** Rol (CLIENT, COMPANY_ADMIN, WORKER, GLOBAL_ADMIN), Status (ACTIVE/SUSPENDED). Căutare după nume/email. Paginare 20/pagină.

**Detaliu utilizator (`/admin/utilizatori/:id`):**
- Profil: nume, email, telefon, avatar, rol, dată înregistrare
- Profil asociat: firma sau profilul de angajat (dacă există)
- **Acțiuni admin:** Suspendare (cu motiv), Reactivare, Resetare parolă

### 6.5 Comenzi (`/admin/comenzi`)

Toate rezervările de pe platformă.

**Filtrare:** Status, firmă, dată (range), tip serviciu. Căutare după cod referință, client, firmă. Export CSV.

**Detaliu comandă (`/admin/comenzi/:id`):**
- Informații complete: client, firmă, serviciu, sumă, status
- Timeline creare → finalizare
- Flag dispută (dacă există)
- **Acțiuni admin:** Desemnare manuală angajat, Anulare cu motiv, Finalizare forțată, Vizualizare factură, Marcare ca plătit

### 6.6 Plăți (`/admin/plati`)

Tranzacțiile de plată ale platformei (Stripe Payment Intents). Filtrare după status și perioadă. Modal detaliu per tranzacție.

### 6.7 Viramente (`/admin/viramente`)

Viramentele către firmele partenere (din Stripe Connect).

- Status: `PENDING`, `PROCESSING`, `PAID`, `FAILED`, `CANCELLED`
- Generare virar lunar per firmă (selectare perioadă → calcul automat)
- Reîncercare viramente eșuate

### 6.8 Rambursări (`/admin/rambursari`)

Cererile de rambursare de la clienți.

- Status: `REQUESTED`, `APPROVED`, `PROCESSED`, `REJECTED`
- Aprobare sau respingere cerere
- Adminul poate emite rambursări directe (`adminIssueRefund`) cu sumă și motiv

### 6.9 Dispute (`/admin/dispute`)

Centrul de gestionare a disputelor deschise de clienți.

**Filtrare pe tab-uri:**
- `OPEN` — dispute nou deschise
- `COMPANY_RESPONDED` — firma a răspuns, în așteptare decizie admin
- `UNDER_REVIEW` — adminul a preluat cazul
- `RESOLVED_*` — dispute rezolvate (rambursare totală/parțială/nicio rambursare)
- `AUTO_CLOSED` — închise automat după 48h

**Vizualizare dispută (expandabil):**
- Detalii comandă, motivul disputei, descrierea clientului, dovezi (poze/documente)
- Răspunsul firmei (dacă există)
- Notele de rezoluție

**Rezolvare:**
- Selectare tip rezoluție: rambursare totală / rambursare parțială (cu sumă) / nicio rambursare
- Completare note de rezoluție
- Confirmare → status actualizat, rambursare procesată automat dacă se aplică

### 6.10 Recenzii (`/admin/recenzii`)

Moderarea tuturor recenziilor de pe platformă.

- Status: `PENDING` (necesită moderare), `APPROVED` (publicată), `REJECTED` (respinsă)
- Filtrare după rating (1-5 stele), tip recenzie (client → firmă/angajat)
- Acțiuni: Aprobă, Respinge (cu motiv), Șterge permanent

### 6.11 Coduri promoționale (`/admin/promo-coduri`)

Gestionarea codurilor de reducere.

**Creare cod promoțional:**
- Cod text (ex: `PRIMA5`)
- Tip reducere: `PERCENTAGE` (procent) sau `FIXED` (sumă fixă în lei)
- Valoare reducere
- Comandă minimă (valoare minimă pentru activare)
- Număr maxim de utilizări totale (opțional)
- Număr maxim de utilizări per utilizator
- Perioadă de valabilitate (dată start/end)
- Toggle activ/inactiv

**Vizualizare:** Număr utilizări curente vs. maxim, statistici per cod.

### 6.12 Abonamente (`/admin/abonamente`)

Toate abonamentele active/inactive ale platformei.

- Vizualizare: client, firmă, sumă, frecvență, status, număr comenzi viitoare
- Filtrare după status
- **Detaliu abonament (`/admin/abonamente/:id`):** Acțiuni admin: Pauză, Reluare, Anulare cu motiv

### 6.13 Facturi (`/admin/facturi`)

Toate facturile emise pe platformă.

- Filtrare: tip (`CLIENT_SERVICE`, `PLATFORM_COMMISSION`), status, firmă. Căutare după referință.
- Descărcare PDF
- **Acțiuni admin:** Generare nota de credit, Marcare ca plătit, Transmitere e-Factura

### 6.14 Rapoarte (`/admin/rapoarte`)

Analize și statistici ale platformei:
- Venit zilnic pe o perioadă selectată
- Venit per tip de serviciu
- Top firme după venit
- KPI-uri globale (clienți unici, firme active, rată de finalizare)
- Heatmap cerere (zi săptămână × oră)

### 6.15 Setări platformă (`/admin/setari`)

**Mod platformă:**
- `pre_release` — redirect `/rezervare` → `/lista-asteptare`
- `live` — funcționalitate completă

**Gestionare servicii:**
- Creare/editare definiții servicii (nume RO/EN, prețuri, formule calcul ore)
- Creare/editare extras (suplimente: preț, durată)
- Activare/dezactivare servicii

**Gestionare orașe:**
- Creare/editare orașe cu multiplicatorul de preț regional
- Adăugare cartiere per oraș
- Activare/dezactivare orașe

**Reduceri abonamente:**
- Configurarea procentului de reducere per tip de recurență (săptămânal, bisăptămânal, lunar)

**Statistici waitlist:**
- Numărul de persoane înscrise în lista de așteptare (clienți vs. firme)

---

## 7. Ciclul de Viață al Rezervărilor

### Statusuri și tranziții

```
PENDING → ASSIGNED → CONFIRMED → IN_PROGRESS → COMPLETED
                                              ↓
                    CANCELLED_BY_CLIENT / CANCELLED_BY_COMPANY / CANCELLED_BY_ADMIN
```

| Status | Semnificație | Cine face tranziția |
|--------|-------------|-------------------|
| `ASSIGNED` | Rezervare creată, firma a primit-o, angajat de desemnat | Sistem (la creare) |
| `CONFIRMED` | Angajat desemnat, ambele părți confirmate | Firma (desemnează angajat), Clientul (confirmă) |
| `IN_PROGRESS` | Angajatul a ajuns și a început lucrul | Angajatul (check-in) |
| `COMPLETED` | Jobul s-a finalizat | Angajatul (marchează finalizat) |
| `CANCELLED_BY_CLIENT` | Clientul a anulat | Clientul |
| `CANCELLED_BY_COMPANY` | Firma a anulat | Firma |
| `CANCELLED_BY_ADMIN` | Adminul a anulat | Adminul |

### Politica de anulare și reprogramare

Configurabilă din `platform_settings`:

- **Anulare gratuită:** Dacă se face cu X ore înainte (configurable `cancelFreeHoursBefore`)
- **Anulare tardivă:** Rambursare parțială (procent configurable `cancelLateRefundPct`)
- **Reprogramare gratuită:** Cu Y ore înainte (`rescheduleFreeHoursBefore`)
- **Număr maxim reprogramări:** Per comandă (`rescheduleMaxPerBooking`)

### Plata comenzii

Plata este procesată prin Stripe. Statusul de plată este independent de statusul comenzii:
- `PENDING` — plata în așteptare
- `PAID` — plată confirmată
- `REFUNDED` / `PARTIALLY_REFUNDED` — rambursare totală/parțială

---

## 8. Sistemul de Dispute

### Cine poate deschide o dispută

**Clientul**, din pagina de detaliu a unei comenzi finalizate (`COMPLETED`), în termen de 48 de ore de la finalizare.

### Motive posibile

| Cod | Descriere |
|-----|-----------|
| `POOR_QUALITY` | Calitate slabă a serviciului |
| `NO_SHOW` | Angajatul nu s-a prezentat |
| `PROPERTY_DAMAGE` | Daune la proprietate |
| `INCOMPLETE_JOB` | Job incomplet |
| `OVERCHARGE` | Sumă incorectă facturată |
| `OTHER` | Alt motiv |

### Procesul pas cu pas

1. **Clientul deschide disputa** — selectează motivul, descrie problema, poate atașa dovezi (poze)
2. **Firma este notificată** — poate răspunde la dispută cu propria versiune
3. **Adminul revizuiește** — vede ambele perspective (descriere client + răspuns firmă + dovezi)
4. **Adminul rezolvă** cu una dintre opțiuni:
   - `RESOLVED_REFUND_FULL` — rambursare totală
   - `RESOLVED_REFUND_PARTIAL` — rambursare parțială (adminul specifică suma)
   - `RESOLVED_NO_REFUND` — nicio rambursare
5. **Auto-închidere:** Dacă nimeni nu acționează în 48h, disputa se închide automat (`AUTO_CLOSED`)

### Acces admin

`/admin/dispute` — filtrare pe tab-uri după status, expandare detalii, modal de rezoluție.

---

## 9. Abonamente Recurente

### Tipuri de recurență

| Tip | Frecvență |
|-----|-----------|
| `WEEKLY` | Săptămânal (4 sesiuni/lună) |
| `BIWEEKLY` | La 2 săptămâni (2 sesiuni/lună) |
| `MONTHLY` | Lunar (1 sesiune/lună) |

### Reduceri per frecvență

Fiecare tip de recurență are un discount configurat de admin (în procente). Reducerea se aplică la prețul per sesiune:

```
Preț final per sesiune = Preț original × (1 - discount%)
Sumă lunară = Preț final per sesiune × Sesiuni pe lună
```

### Statusuri abonament

| Status | Semnificație |
|--------|-------------|
| `ACTIVE` | Activ, generează comenzi conform programului |
| `PAUSED` | În pauză (ex: client în vacanță), comenzile nu se generează |
| `PAST_DUE` | Plata eșuată — banner amber în interfața clientului |
| `CANCELLED` | Anulat definitiv |
| `INCOMPLETE` | Configurare incompletă (rar) |

### Schimbarea angajatului

1. **Clientul solicită schimbarea** — selectează motivul din pagina abonamentului
2. **Cererea ajunge la firmă/admin** — se verifică disponibilitatea angajatului alternativ
3. **Rezolvare:**
   - Per abonament: un singur angajat nou pentru toate sesiunile viitoare
   - Per sesiune: angajați diferiți pentru sesiuni diferite (admin poate aloca individual)

---

## 10. Plăți și Facturare

### Plăți client (Stripe)

**Tip plată:** Stripe Payment Intent (plată directă cu card)

- **Salvare card:** La prima plată, clientul poate salva cardul (Setup Intent) pentru utilizări viitoare
- **Carduri salvate:** Gestionate în `/cont/plati` — client poate adăuga, șterge, seta card implicit

### Plăți firmă (Stripe Connect)

Firmele primesc plățile prin **Stripe Connect**. Fiecare firmă trebuie să finalizeze onboarding-ul Stripe pentru a putea primi viramente.

**Flux virament:**
1. Adminul generează un virar lunar per firmă (selectează perioada)
2. Sistemul calculează: venit brut − comision platformă = net de primit
3. Viramentul se procesează prin Stripe Connect
4. Status: `PENDING` → `PROCESSING` → `PAID` (sau `FAILED` dacă e problemă)

### Structura prețului

```
Preț estimat = Tarif orar × Ore estimate
Ore estimate = ore_minime
             + (nr_camere × ore_per_cameră)
             + (nr_băi × ore_per_baie)
             + (mp / 100 × ore_per_100mp)
             + multiplicator tip proprietate (casă vs. apartament)
             + (animale_companie ? minute_animale / 60 : 0)
             + extras comandate

Total = Preț estimat + Extras
      − Discount abonament (dacă există)
      − Discount cod promoțional (dacă există)
      − Discount referral (dacă există)
```

**Modele de prețuri:** `HOURLY` (pe oră) sau `PER_SQM` (per mp) — configurat per definiție de serviciu.

### Facturare

**Prefix facturi:** `G2F` (ex: `G2F-2026-0001`)

**Tipuri de facturi:**

| Tip | Emitent | Destinatar |
|-----|---------|-----------|
| `CLIENT_SERVICE` | Firma prestoare | Clientul |
| `PLATFORM_COMMISSION` | Go2Fix SRL | Firma prestoare |

**Câmpuri fiscale:** TVA, număr registru comerț, IBAN, bancă — configurabile per firmă.

**e-Factura:** Facturi pot fi transmise electronic prin sistemul ANAF (`transmitInvoiceToEFactura`). Statusul transmiterii este monitorizat.

---

## 11. Gestionarea Prețurilor

### Categorii de servicii

Fiecare categorie de servicii poate avea un comision de platformă propriu (override față de comisionul global). Configurat din `/admin/setari`.

### Multiplicatori per oraș

Fiecare oraș activ are un multiplicator de preț regional (implicit 1.0). Ajustează prețul final pentru piețe cu costuri diferite.

### Extras (suplimente)

Servicii adiționale facturate separat:
- Preț fix per unitate sau per bucată
- Durată adițională estimată (minute)
- Pot fi configurate per categorie de serviciu

### Coduri promoționale

- Aplicate la momentul comenzii
- Tip: procent sau sumă fixă
- Limite: utilizări totale, utilizări per utilizator, valabilitate temporală, comandă minimă

### Discounturi referral

- Codul de referral al unui client devine activ după prima sa comandă finalizată
- Când cineva se înregistrează folosind codul și finalizează o comandă, referitorul câștigă un discount
- Discountul se aplică la o comandă viitoare

---

## 12. Întrebări Frecvente Operaționale

### Cum activezi profilul unui angajat?

1. Accesează `/admin/aprobari`
2. Selectează tab-ul **"Activare angajați"** (al 4-lea tab)
3. Verifică că angajatul apare în listă cu badge-ul verde: "Toate documentele aprobate · Evaluare personalitate completă"
4. Dacă angajatul nu apare, verifică în tab-ul "Documente angajați" dacă mai sunt documente de aprobat
5. Apasă **"Activează"** → angajatul devine `ACTIVE` și poate primi joburi

### Cum aprobați o firmă?

1. Accesează `/admin/aprobari` → tab **"Aplicații firme"**
2. Verifică progresul documentelor (trebuie să fie `X/X documente aprobate`)
3. Dacă documentele nu sunt aprobate, mergi în tab-ul "Documente firme" și aprobă-le individual
4. Revenin la "Aplicații firme" și apasă **"Aprobă"**
5. Dacă aplicația are probleme, apasă **"Respinge"** și completează motivul

### Cum procesezi o dispută?

1. Accesează `/admin/dispute`
2. Selectează tab-ul **"OPEN"** sau **"COMPANY_RESPONDED"**
3. Expandează disputa pentru a vedea: motivul clientului, răspunsul firmei, dovezile
4. Apasă **"Rezolvă"** și selectează tipul rezoluției:
   - Rambursare totală / parțială (specifici suma) / nicio rambursare
5. Completează notele de rezoluție
6. Confirmă — sistemul actualizează statusul și procesează rambursarea automat (dacă se aplică)

### Cum schimbi modul platformei (pre_release ↔ live)?

1. Accesează `/admin/setari`
2. Găsește câmpul **`platform_mode`** din secțiunea "Setări platformă"
3. Modifică valoarea în `live` (sau `pre_release` pentru a opri rezervările)
4. Salvează
5. Efectul este imediat: `/rezervare` va funcționa normal sau va redirecționa la `/lista-asteptare`

### Cum creezi un cod promoțional?

1. Accesează `/admin/promo-coduri`
2. Apasă **"+ Cod nou"**
3. Completează: cod text, tip (procent/sumă fixă), valoare, opțional: comandă minimă, utilizări maxime, perioadă de valabilitate
4. Confirmă crearea
5. Codul este imediat activ și poate fi aplicat de clienți la rezervare

### Cum adaugi un oraș nou?

1. Accesează `/admin/setari`
2. Secțiunea **"Gestionare orașe"**
3. Apasă **"+ Adaugă oraș"**: completează numele, județul, multiplicatorul de preț regional
4. Opțional: adaugă cartiere/zone pentru noul oraș
5. Activează orașul (toggle)
6. Firmele pot acum selecta noul oraș în ariile lor de servicii

### Cum verifici disponibilitatea unui angajat pentru o comandă?

Din pagina de detaliu a comenzii, secțiunea "Desemnare angajat", sistemul verifică automat disponibilitatea fiecărui angajat din echipa firmei pe baza:
- Programului săptămânal setat de administratorul firmei pentru angajat (editabil din `/firma/lucratori/:id`)
- Override-urilor pe date specifice (zile libere adăugate de firmă sau solicitate de angajat)
- Comenzilor deja desemnate (pentru a evita suprapuneri)
- Ariilor geografice de servicii ale angajatului

### Ce se întâmplă dacă plata unui abonament eșuează?

1. Statusul abonamentului devine `PAST_DUE`
2. Clientul vede un **banner amber** în pagina abonamentului și în contul său (`/cont/plati`)
3. Clientul trebuie să actualizeze metoda de plată sau să reîncerce plata
4. Dacă problema persistă, adminul poate investiga în `/admin/plati` sau `/admin/abonamente`

### Cum poate o firmă să solicite acces la o categorie nouă de servicii?

1. Firma accesează `/firma/setari` → secțiunea "Categorii de servicii"
2. Apasă "Solicită acces" lângă categoria dorită
3. Cererea ajunge la admin în `/admin/aprobari` → tab "Cereri categorii"
4. Adminul aprobă sau respinge cererea (cu notă opțională)
5. La aprobare, categoria devine disponibilă firmei imediat

---

*Acest document trebuie actualizat de fiecare dată când se aduc modificări la UX-ul sau funcționalitățile platformei. Fișier: `web/packages/client-web/public/docs/DOCUMENTATIE.md`. Vezi regula de documentare din `CLAUDE.md`.*
