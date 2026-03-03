export type BlogCategory = 'sfaturi' | 'ghid-orase' | 'cum-sa';

export type BlogLanguage = 'ro' | 'en';

export interface BlogPost {
  slug: string;
  lang: BlogLanguage;
  linkedSlug?: string;
  title: string;
  excerpt: string;
  content: string; // Markdown
  category: BlogCategory;
  tags: string[];
  author: string;
  publishedAt: string; // ISO date
  readTimeMinutes: number;
  metaTitle: string;
  metaDescription: string;
}

export const CATEGORY_LABELS: Record<BlogCategory, string> = {
  sfaturi: 'Sfaturi',
  'ghid-orase': 'Ghid Orașe',
  'cum-sa': 'Cum să',
};

export const CATEGORY_COLORS: Record<BlogCategory, string> = {
  sfaturi: 'bg-blue-100 text-blue-700',
  'ghid-orase': 'bg-emerald-100 text-emerald-700',
  'cum-sa': 'bg-amber-100 text-amber-700',
};

export const BLOG_POSTS: BlogPost[] = [
  // ─── ROMANIAN POSTS ───────────────────────────────────────────────────────

  {
    slug: 'cum-sa-alegi-firma-curatenie-bucuresti',
    lang: 'ro',
    linkedSlug: 'how-to-choose-a-cleaning-company-in-bucharest',
    title: 'Cum să alegi firma de curățenie potrivită în București',
    excerpt:
      'Un ghid complet pentru alegerea unei firme de curățenie de încredere în capitală. De la verificarea documentelor la evaluarea recenziilor.',
    category: 'sfaturi',
    tags: ['firma curatenie bucuresti', 'servicii curatenie', 'curatenie apartament'],
    author: 'Echipa Go2Fix',
    publishedAt: '2026-01-15',
    readTimeMinutes: 6,
    metaTitle: 'Cum alegi firma de curățenie în București | Go2Fix',
    metaDescription:
      'Ghid complet pentru alegerea firmei de curățenie potrivite în București. Verifică documentele, recenziile și prețurile înainte să rezervi.',
    content: `## De ce contează alegerea firmei de curățenie

Bucureștiul are peste 2.000 de firme care oferă servicii de curățenie, de la microîntreprinderi cu unul sau doi angajați până la companii naționale cu sute de echipe. Această abundență e binevenită, dar îngreunează decizia clientului. O alegere greșită înseamnă bani pierduți, dezamăgiri și, în cazuri extreme, bunuri deteriorate sau furturi. Un ghid structurat îți economisește timp și îți protejează locuința.

## 1. Verifică actele firmei înainte de orice altceva

Prima regulă: nu angaja niciodată o firmă care nu poate prezenta dovada că funcționează legal. Cere:

- **Certificatul de înregistrare la Registrul Comerțului** — verificabil gratuit pe portalul ONRC. Un CUI valid și activ e semnul că firma plătește taxe și poate fi trasă la răspundere.
- **Dovada asigurării de răspundere civilă** — esențială dacă un angajat sparge un obiect de valoare sau provoacă daune accidentale. Fără această asigurare, recuperarea pagubei devine un coșmar juridic.
- **Contractul scris** — orice firmă serioasă oferă un contract care specifică serviciile incluse, prețul total, condițiile de anulare și politica în caz de daune. Evită acordurile verbale.

Firmele din rețeaua Go2Fix trec printr-un proces de verificare a documentelor înainte de a putea primi comenzi. Îți economisim efortul de a verifica fiecare firmă individual — [înscrie-te pe lista de așteptare](/lista-asteptare) pentru acces timpuriu.

## 2. Analizează recenziile cu ochi critic

Recenziile online sunt valoroase, dar trebuie citite inteligent. Câteva semne de alarmă:

- **Toate recenziile sunt de 5 stele și au fost postate în aceeași săptămână** — pattern-ul sugerează recenzii plătite sau solicitate în mod agresiv.
- **Firma nu răspunde la recenziile negative** — lipsa de reacție indică o atitudine față de client care se va repeta și în relația cu tine.
- **Recenziile menționează detalii specifice** (durata serviciului, echipa cu nume, un incident rezolvat) — sunt mult mai credibile decât laudele generice.

Caută recenzii pe Google Maps, pe platforme specializate și în grupurile de Facebook dedicate cartierului tău din București. Recomandările de la vecini sau colegi rămân cel mai de încredere filtru.

## 3. Cere un deviz detaliat, nu un preț la telefon

Prețurile pentru curățenie în București variază enorm: de la 15 lei/oră pentru munca la negru până la 80–120 lei/oră pentru firme profesionale cu echipamente industriale. Diferența de preț reflectă deseori diferența de calitate, dar nu întotdeauna. Solicită un deviz scris care să detalieze:

- Suprafața estimată și numărul de ore incluse
- Produsele de curățenie folosite (ecologice, profesionale sau de uz casnic)
- Echipamentele incluse (aspiratoare industriale, mop cu abur, etc.)
- Ce nu este inclus în preț (geamuri exterioare, balcon, spații greu accesibile)
- Costul eventualelor materiale consumabile suplimentare

## 4. Întreabă despre echipa care vine efectiv

Mulți clienți semnează contractul cu o firmă, dar nu știu nimic despre persoanele care le intră în casă. Pune direct aceste întrebări:

- Angajații sunt direct ai firmei sau subcontractați? (Preferabil angajați direcți — responsabilitate mai clară)
- Au cazier judiciar verificat? Fac parte dintr-un sistem de identificare intern?
- Se respectă continuitatea echipei — adică aceleași persoane vin de fiecare dată?

Continuitatea echipei este importantă mai ales pentru curățenia periodică: o echipă care cunoaște locuința lucrează mai eficient și observă mai ușor dacă ceva lipsește sau s-a deteriorat.

## 5. Testează cu o singură curățenie înainte de abonament

Indiferent cât de bune par recenziile, programează mai întâi o singură curățenie generală. Evaluează:

- Punctualitatea — au venit la ora stabilită?
- Comunicarea — au confirmat programarea, au anunțat dacă au întârziat?
- Calitatea rezultatului — verifică locurile greu accesibile: spatele toaletei, colțurile dulapurilor, grilele ventilatorului.
- Atitudinea față de obiecte personale — le-au mutat cu grijă sau cu neglijență?

Abia după această primă experiență poți decide dacă merită un abonament lunar sau dacă cauți altă firmă.

## Concluzie

Alegerea unei firme de curățenie în București nu trebuie să fie o loterie. Cu documentele verificate, recenziile citite corect, un deviz detaliat și un test inițial, reduci dramatic riscul de a fi dezamăgit. Pe [Go2Fix](/lista-asteptare) colectăm toate aceste informații pentru tine și afișăm doar firme verificate, cu recenzii reale și prețuri transparente.
`,
  },
  {
    slug: 'curatenie-apartament-ghid-complet',
    lang: 'ro',
    linkedSlug: 'apartment-cleaning-complete-guide',
    title: 'Curățenie apartament: ghid complet pas cu pas',
    excerpt:
      'Tot ce trebuie să știi despre curățenia profesională a apartamentului: ordine, produse, frecvență și cât durează.',
    category: 'cum-sa',
    tags: ['curatenie apartament', 'curatenie generala', 'curatenie profesionala'],
    author: 'Echipa Go2Fix',
    publishedAt: '2026-01-22',
    readTimeMinutes: 8,
    metaTitle: 'Curățenie Apartament: Ghid Complet Pas cu Pas | Go2Fix',
    metaDescription:
      'Ghid complet pentru curățenia apartamentului: ordinea corectă, produse profesionale, durata estimată și frecvența recomandată.',
    content: `## De ce ordinea contează în curățenia profesională

Cel mai comun greșeală pe care o fac oamenii când curăță singuri este să înceapă aleator — azi baia, mâine bucătăria, poimâine aspiratul. Rezultatul: murdăria dintr-o zonă migrează în alta, iar unele suprafețe sunt curățate de două ori inutil. Profesioniștii urmează întotdeauna un protocol: de sus în jos, de la uscat la umed, de la mai puțin murdar la mai murdar.

## 1. Pregătirea — 10 minute bine investite

Înainte de a începe efectiv curățenia, fă următoarele:

- **Aerisire** — deschide ferestrele cel puțin 10 minute. Produsele de curățenie funcționează mai bine la temperaturi moderate și aerul proaspăt accelerează uscarea suprafețelor.
- **Strângerea dezordinii** — curățenia nu înseamnă și ordonarea. Mută obiectele personale la locul lor înainte ca echipa să sosească, altfel pierd timp și riscă să pună lucruri în locul greșit.
- **Pregătirea produselor** — un kit profesional include: detergent multisuprafețe, degresant pentru bucătărie, dezinfectant pentru baie, soluție pentru geamuri, laveta din microfibră (minim 4 bucăți diferit colorate pentru zone diferite), mop cu torsion.

## 2. Dormitoarele și camera de zi — ordinea corectă

Începe întotdeauna cu zonele uscate și continuă spre cele umede. Într-un dormitor sau living, ordinea este:

- **Praful de la înălțime** — tavan (colțuri de pânze de păianjen), corpuri de iluminat, vârfurile dulapurilor, tocurile ușilor. Un ștergător cu mâner lung e indispensabil.
- **Mobila și suprafețele orizontale** — mese, rafturi, aparate electrocasnice. Folosește laveta umedă cu detergent multisuprafețe și șterge în mișcări drepte, nu circulare, pentru a evita lăsarea urmelor.
- **Oglinjile și geamurile interioare** — soluție specială pentru geamuri aplicată cu laveta de microfibră curată, ștearsă cu mișcări în formă de S de sus în jos.
- **Aspiratul** — inclusiv colțurile, marginile mochetei sau parchetului, spațiul de sub pat și de sub canapea.
- **Spălatul pardoselii** — ultimul pas, cu mop bine stors pentru a nu lăsa apă în exces care poate deteriora parchetul.

## 3. Bucătăria — zona cea mai solicitantă

Bucătăria acumulează cel mai mult grăsime și necesită produse specifice. Un profesionist alocă 45–90 de minute pentru o bucătărie standard, în funcție de gradul de murdărie.

- **Hota și aragazul** — degresantul se aplică și se lasă să acționeze 5–10 minute înainte de a freca. Filtrele de la hotă se pot spăla în chiuvetă cu apă fierbinte și detergent de vase concentrat.
- **Exteriorul aparatelor** — frigider, cuptorul cu microunde, mașina de spălat vase — se șterg cu detergent multisuprafețe. Interiorul frigiderului necesită produse alimentare-safe.
- **Faianța și blatul** — spray degresant, frecat cu burete abraziv în zone cu depuneri, clătit cu laveta umedă curată.
- **Chiuveta și robinetul** — detartrant dacă există calcar, lustruit cu laveta uscată pentru efect lucios.

## 4. Baia — igiena înainte de aspect

Baia se curăță ultima, pentru că echipamentele (mop, lavete) se clătesc ulterior. Protocoalele de dezinfecție sunt mai stricte:

- **Vasul de toaletă** — dezinfectantul se aplică în interiorul vasului și se lasă să acționeze. Exteriorul, inclusiv baza și zona de prindere, se dezinfectează separat cu laveta dedicată exclusiv băii.
- **Cada sau cabina de duș** — detartrant pentru calcar (frecvent în apa din București), urmat de clătire abundentă. Garniturile de silicon se curăță cu bicarbonat de sodiu și periuță veche de dinți.
- **Lavaboul și robinetele** — același tratament ca chiuveta din bucătărie. Oglinda se curăță cu soluție specială.
- **Pardoseala** — ultimul pas, cu dezinfectant diluat conform instrucțiunilor.

## 5. Cât durează o curățenie profesională

Estimări realiste pentru o echipă de doi oameni:

- Garsonieră (30–40 mp): 1,5–2 ore
- Apartament 2 camere (50–65 mp): 2,5–3 ore
- Apartament 3 camere (75–90 mp): 3–4 ore
- Curățenie generală (post-renovare sau sezonieră): adaugă 30–50% față de curățenia standard

## 6. Frecvența recomandată

Frecvența optimă depinde de stilul de viață, nu de un calendar arbitrar:

- **Săptămânal** — familii cu copii mici sau animale de companie, persoane cu alergii
- **Bi-săptămânal** — cupluri sau persoane singure active, fără copii
- **Lunar** — persoane care locuiesc singure și mențin curățenia zilnică
- **Sezonier (de 4 ori/an)** — curățenie generală profundă ca supliment al celei periodice

## Concluzie

O curățenie profesională bine executată nu înseamnă să freci mai tare, ci să urmezi un protocol logic cu produsele potrivite. Dacă vrei să externalizezi această activitate, [Go2Fix](/lista-asteptare) conectează clienții din România cu firme de curățenie verificate, cu prețuri transparente și recenzii reale de la alți clienți.
`,
  },
  {
    slug: 'beneficiile-curatenie-profesionala-birou',
    lang: 'ro',
    linkedSlug: 'benefits-professional-office-cleaning',
    title: 'De ce merită să angajezi o firmă de curățenie pentru birou',
    excerpt:
      'Un birou curat crește productivitatea cu 15% și reduce absenteismul. Descoperă beneficiile curățeniei profesionale pentru afacerea ta.',
    category: 'sfaturi',
    tags: ['curatenie birou', 'firma curatenie', 'curatenie profesionala birou'],
    author: 'Echipa Go2Fix',
    publishedAt: '2026-02-01',
    readTimeMinutes: 5,
    metaTitle: 'Beneficii Curățenie Profesională Birou | Go2Fix',
    metaDescription:
      'Descoperă de ce curățenia profesională a biroului este o investiție rentabilă pentru productivitate, sănătate și imaginea firmei.',
    content: `## Curățenia la birou nu e un cost — e o investiție

Mulți antreprenori și manageri tratează curățenia biroului ca pe un cost operațional minor pe care îl pot optimiza prin reducere: „ne curățăm singuri", „o dată pe săptămână e suficient", „angajăm o doamnă care vine când are timp". Această mentalitate ignoră datele: un studiu publicat de **Harvard Business Review** arată că angajații dintr-un spațiu curat și organizat sunt cu 15% mai productivi față de cei care lucrează într-un mediu dezordonat. Înmulțit cu salariile lunare, câștigul depășește cu mult costul unui contract de curățenie profesional.

## 1. Sănătatea angajaților — impactul direct asupra absenteismului

Un birou cu 20 de angajați este, din punct de vedere microbiologic, unul dintre cele mai contaminate spații de interior. Tastatura unui calculator conține în medie de 400 de ori mai mulți germeni decât un capac de toaletă. Clanțele, aparatul de cafea, butoanele liftului — toate sunt vectori de transmitere a virozelor.

- **Dezinfecția regulară** a suprafețelor de contact redus cu până la 80% transmiterea virozelor sezoniere
- **Curățarea sistemelor de aer condiționat** — filtrele murdare recirculează alergeni, praf și spori de mucegai; curățarea trimestrială reduce simptomele alergice la angajați
- **Igiena grupurilor sanitare** — o baie murdară este prima sursă de îmbolnăviri gastro-intestinale într-un colectiv

Reducerea absenteismului cu o zi pe angajat pe an înseamnă, la un echipaj de 20 de oameni, 20 de zile-om recuperate anual. Calculul e simplu.

## 2. Imaginea firmei — prima impresie contează

Clienții, partenerii de afaceri și candidații la angajare judecă profesionalismul unei companii și după starea biroului. Un spațiu curat, bine mirosit și ordonat transmite un mesaj implicit: *această echipă îngrijește detaliile*. Un birou plin de pahare murdare pe birouri, coșuri de gunoi negolit și geamuri cu amprente digitale trimite mesajul opus.

- Candidații de top resping ofertele de angajare și din cauza mediului fizic de lucru
- Clienții din domeniile financiar, juridic și medical au așteptări ridicate de igienă — un birou murdar poate bloca o colaborare
- Spațiile curate fotografiază mai bine pentru prezentări, site-uri și materiale de marketing

## 3. Productivitatea și claritatea mentală

Dezordinea vizuală compete pentru atenția cognitivă. Cercetările în psihologia mediului arată că suprafețele aglomerate și spațiile murdare activează răspunsul la stres și reduc capacitatea de concentrare. Angajații care își petrec o parte din zi curățând sau ordonând propriul spațiu de lucru folosesc timp și energie care ar trebui dedicate muncii.

- Biroul curat reduce nivelul de cortizol (hormonul stresului) la angajați
- Un mediu ordonat accelerează găsirea documentelor și a materialelor de lucru
- Curățenia stimulează sentimentul de control și autonomie — factori direct legați de satisfacția la locul de muncă

## 4. De ce un contract profesional e mai eficient decât soluțiile improvizate

O firmă de curățenie profesională aduce trei avantaje pe care soluțiile improvizate nu le pot oferi:

- **Consistență** — același standard de curățenie la fiecare vizită, indiferent de fluctuațiile de personal ale furnizorului
- **Echipament industrial** — aspiratoare cu filtre HEPA, aparate de abur, produse dezinfectante profesionale inaccesibile unui client individual
- **Responsabilitate contractuală** — dacă ceva nu este la standard, există un contract și o procedură de reclamație; cu o doamnă angajată informal nu există niciun mecanism de protecție

## 5. Cât costă curățenia profesională pentru birou în România

Prețurile variază în funcție de suprafață, frecvență și complexitate:

- Spații mici (sub 100 mp): 150–300 lei/vizită
- Birouri medii (100–500 mp): 300–800 lei/vizită
- Spații mari sau open-space-uri (peste 500 mp): contract personalizat, deseori cu tarif lunar fix

Raportul cost-beneficiu devine favorabil chiar și pentru birouri mici când se ia în calcul productivitatea recuperată și reducerea absenteismului.

## Concluzie

Curățenia profesională a biroului nu este un lux rezervat corporațiilor mari — este o decizie de business rațională pentru orice companie care vrea să reducă absenteismul, să atragă și să rețină talente și să lase o impresie bună partenerilor. Dacă ești antreprenor sau manager în căutarea unui furnizor verificat, [Go2Fix](/lista-asteptare) se lansează cu o rețea de firme de curățenie certificate, cu recenzii reale și prețuri transparente.
`,
  },

  // ─── NEW ROMANIAN POSTS ───────────────────────────────────────────────────

  {
    slug: 'cat-costa-curatenie-profesionala-bucuresti-2026',
    lang: 'ro',
    linkedSlug: 'how-much-does-cleaning-cost-in-bucharest-2026',
    title: 'Cât costă o curățenie profesională în București în 2026?',
    excerpt:
      'Ghid de prețuri actualizat pentru 2026: cât plătești pentru curățenie în garsonieră, 2, 3 sau 4 camere și ce influențează tariful.',
    category: 'sfaturi',
    tags: ['pret curatenie bucuresti', 'cost curatenie apartament', 'tarife firma curatenie'],
    author: 'Echipa Go2Fix',
    publishedAt: '2026-02-10',
    readTimeMinutes: 5,
    metaTitle: 'Cât costă curățenia profesională București 2026 | Go2Fix',
    metaDescription:
      'Prețuri actualizate pentru curățenie profesională în București în 2026. Tabel cu tarife pe tipuri de apartament și factori care influențează costul.',
    content: `## Prețurile curățeniei profesionale în București în 2026

Unul dintre cele mai frecvente lucruri pe care oamenii le caută înainte să sune o firmă de curățenie este prețul. Răspunsul onest este: depinde. Dar depinde de factori bine definiți — nu e o loterie. Acest ghid îți explică ce să aștepți să plătești și de ce.

## Tabel de prețuri orientative — curățenie standard

| Tip apartament | Suprafață estimată | Preț minim | Preț maxim | Durată echipă 2 pers. |
|---|---|---|---|---|
| Garsonieră | 25–40 mp | 180 lei | 280 lei | 1,5–2 ore |
| 2 camere | 45–65 mp | 280 lei | 420 lei | 2,5–3 ore |
| 3 camere | 70–90 mp | 380 lei | 560 lei | 3–4 ore |
| 4 camere | 90–130 mp | 500 lei | 800 lei | 4–5 ore |

> **Notă importantă:** Prețurile de mai sus sunt pentru curățenie standard de întreținere. Curățenia generală profundă (post-mutare, post-renovare, sezonieră) costă cu 40–70% mai mult față de prețul standard.

## Ce influențează prețul final

### 1. Tipul de curățenie

Nu toate curățeniile sunt egale. Există trei niveluri principale:

- **Curățenie de întreținere (standard)** — praful, aspiratul, mopping, baia și bucătăria la suprafață. Cel mai accesibil tarif.
- **Curățenie generală (deep cleaning)** — include interiorul aparatelor, dulapuri, jaluzele, zona de sub mobilă, grilele de ventilație. Costă 40–60% mai mult.
- **Curățenie post-renovare sau post-mutare** — necesită echipamente speciale și timp dublu față de curățenia standard.

### 2. Starea apartamentului

O firmă profesionistă face o inspecție vizuală (sau cere fotografii) înainte să ofere un preț fix. Dacă apartamentul nu a fost curățat de luni sau ani, depunerile de grăsime, calcarul și praful acumulat necesită produse și timp suplimentar — și se reflectă în preț.

### 3. Frecvența serviciului

Clienții care contractează curățenie periodică (săptămânală sau bi-lunară) beneficiază de reduceri de 10–20% față de prețul per vizită ocazional. Logica e simplă: un apartament curățat regulat rămâne mai ușor de întreținut.

### 4. Echipamentele și produsele

Firmele care aduc propriile echipamente industriale (aspiratoare cu filtre HEPA, aparate de abur, produse profesionale concentrate) justifică prețuri mai ridicate față de cele care lucrează cu produsele clientului. Calitatea echipamentului face diferența mai ales în curățenia profundă.

### 5. Zona și accesibilitatea

Deplasarea în zone periferice sau apartamentele la etaje înalte fără lift pot atrage un mic supliment logistic. Unele firme percep și o taxă minimă de deplasare pentru locații în afara inelului central.

## De ce ieftinul poate costa mai mult

O ofertă de 80–100 lei pentru curățenia unui apartament cu 3 camere ar trebui să ridice imediat un semnal de alarmă. Aceste prețuri sunt posibile doar în câteva scenarii:

- Munca la negru (nicio asigurare, niciun contract, nicio răspundere dacă ceva e deteriorat)
- Produse de calitate slabă sau diluate excesiv (rezultate proaste, potențial daunatoare suprafețelor)
- Timp insuficient alocat (curățenie superficială care bifează vizual câteva suprafețe)

> **Regula de aur:** Nu plăti cel mai mic preț din piață dacă lași accesul la locuința ta. Plătești și pentru încredere, nu doar pentru ore de muncă.

## Cum să ceri un deviz corect

Când contactezi o firmă, oferă-i următoarele informații pentru un preț precis:

1. Tipul apartamentului (număr de camere, suprafață aproximativă)
2. Tipul de curățenie dorit (standard, generală, post-mutare)
3. Data ultimei curățenii profesionale
4. Dacă există animale de companie (influențează aspiratul și produsele)
5. Zone cu atenție specială (oven, geamuri, baie cu calcar sever)

Un deviz serios vine în scris, detaliază ce e inclus și ce nu, și nu se modifică semnificativ față de prețul convenit inițial.

## Transparența prețurilor pe Go2Fix

Pe [Go2Fix](/lista-asteptare), toate firmele afișează prețurile pe tipuri de serviciu înainte să rezervi. Nu există surprize la final — prețul afișat este cel pe care îl plătești. Înscrie-te pe lista de așteptare pentru acces la platforma noastră de curățenie verificată.
`,
  },
  {
    slug: 'curatenie-la-mutare-ghid-chiriasi',
    lang: 'ro',
    linkedSlug: 'move-out-cleaning-guide-renters',
    title: 'Curățenie la mutare: ghidul complet pentru chiriași',
    excerpt:
      'Recuperează-ți depozitul de garanție: lista completă de curățenie la predarea apartamentului și când merită să angajezi o firmă profesională.',
    category: 'cum-sa',
    tags: ['curatenie la mutare', 'predare apartament', 'depozit garantie'],
    author: 'Echipa Go2Fix',
    publishedAt: '2026-02-15',
    readTimeMinutes: 7,
    metaTitle: 'Curățenie la Mutare: Ghid Complet Chiriași | Go2Fix',
    metaDescription:
      'Ghid complet de curățenie la predarea apartamentului. Listă de verificare completă și sfaturi pentru recuperarea depozitului de garanție.',
    content: `## De ce curățenia la mutare e mai importantă decât crezi

Depozitul de garanție — echivalentul a 1–3 chirii lunare — este adesea cea mai mare sumă de bani pe care o chiriași o lasă la proprietar. Cel mai frecvent motiv pentru care proprietarii rețin depozitul (sau o parte din el) nu este uzura normală a apartamentului, ci **curățenia insatisfăcătoare la predare**.

Un apartament predat murdar sau cu zone ignorate poate justifica legal reținerea depozitului. Un apartament predat impecabil, cu dovadă fotografică, îți dă dreptul legal și moral să îți recuperezi banii integral.

## Lista completă de curățenie la mutare

### Bucătărie

- [ ] Interior și exterior cuptor (inclusiv grătar, tăvi și garnitura ușii)
- [ ] Interior și exterior frigider (inclusiv rafturile de plastic și sertarele)
- [ ] Hotă: filtru curățat sau înlocuit, interior și exterior degresate
- [ ] Interior și exterior cuptorul cu microunde
- [ ] Mașina de spălat vase: interior (inclusiv filtrul), exterior, garnitura ușii
- [ ] Blat de lucru: degresare completă, inclusiv spațiul de lângă aragaz
- [ ] Faianță: calcar și grăsime eliminate, rosturi curate
- [ ] Chiuvetă și robinet: luciu, fără calcar sau rugină
- [ ] Dulapuri: interior și exterior, inclusiv balamalele și mânerele
- [ ] Pardoseala: spălată inclusiv în colțuri și sub mobilier

### Baie

- [ ] Vas WC: interior (inclusiv sub ramă), exterior, rezervor, baza de prindere
- [ ] Cadă sau cabină duș: calcar eliminat complet, garniturile de silicon curate sau înlocuite
- [ ] Lavoar și robinet: strălucitor, fără calcar sau pete
- [ ] Oglindă: fără urme sau picături
- [ ] Faianță și fugă: igienizate complet
- [ ] Dulapuri de baie: interior și exterior
- [ ] Ventilator: grila curățată
- [ ] Pardoseala: dezinfectată inclusiv în spatele vasului WC

### Camere și living

- [ ] Geamuri interioare: fără urme de degete sau praf
- [ ] Tocuri uși și ferestre: șterse de praf și pete
- [ ] Întrerupătoare și prize: degresate
- [ ] Corpuri de iluminat: fără insecte acumulate sau praf
- [ ] Plinte: șterse pe toată lungimea
- [ ] Dulapuri fixe (dacă există): interior și exterior
- [ ] Pardoseala: aspirată și spălată, inclusiv sub mobilă rămasă

### Zone uitate frecvent

- [ ] Grilele de ventilație din tavan sau pereți
- [ ] Spatele ușilor (petele de la mâner)
- [ ] Termostatele și butoanele de aer condiționat
- [ ] Balconul: inclusiv pardoseala, balustrada și ghivecele rămase
- [ ] Interiorul casei de lift (dacă e locuință) — responsabilitate comună, dar impresionează

## DIY vs. firmă profesională — comparație sinceră

| Criteriu | Curățenie singur | Firmă profesională |
|---|---|---|
| Cost | 0–80 lei (produse) | 300–600 lei |
| Timp necesar | 8–16 ore | 3–5 ore |
| Calitate finală | Variabilă | Constantă, verificabilă |
| Echipamente | Limitate (fără abur, fără HEPA) | Complete |
| Dovadă pentru proprietar | Fotografii proprii | Factură + garanție scrisă |
| Stres | Ridicat (ești și obosit, și stresat de mutare) | Scăzut |

Dacă chiria lunară e 1.500 lei și depozitul e 3.000 lei, o curățenie profesională de 450 lei care îți asigură returnarea depozitului este o investiție cu un randament de 567%. Calculul e evident.

## Sfaturi practice pentru ziua predării

**Programează curățenia în ziua predării sau cu o seară înainte.** Un apartament curățat cu trei zile înainte poate acumula praf până la inspecție.

**Fotografiază totul după curățenie.** Fă fotografii clare ale fiecărei camere, focalizate pe zonele critice (baia, bucătăria, geamurile). Dacă există un litigiu ulterior, fotografiile cu timestamp sunt dovada ta.

**Cere factură de la firma de curățenie.** O chitanță sau factură de la o firmă autorizată arată proprietarului că predarea a fost luată în serios și poate fi folosită în caz de dispută.

**Fă predarea împreună cu proprietarul.** Nu lăsa cheia în cutie și nu pleca fără un proces-verbal semnat de ambele părți.

## Du-te la predare pregătit

[Go2Fix](/lista-asteptare) lucrează cu firme specializate în curățenie la mutare din București și alte orașe. Rezervă o curățenie verificată, cu garanție de satisfacție și factură legală — exact ce ai nevoie pentru o predare fără stres.
`,
  },
  {
    slug: '5-greseli-curatenie-acasa',
    lang: 'ro',
    linkedSlug: 'five-cleaning-mistakes-everyone-makes',
    title: '5 greșeli pe care le faci când curăț singur apartamentul',
    excerpt:
      'De la ordinea greșită a camerelor la excesul de detergent — 5 greșeli comune de curățenie care îți dublează munca fără rezultate mai bune.',
    category: 'sfaturi',
    tags: ['greseli curatenie', 'curatenie corecta', 'sfaturi curatenie'],
    author: 'Echipa Go2Fix',
    publishedAt: '2026-02-20',
    readTimeMinutes: 4,
    metaTitle: '5 Greșeli de Curățenie pe Care le Faci Acasă | Go2Fix',
    metaDescription:
      'Descoperi cele 5 greșeli clasice de curățenie care îți dublează munca. Sfaturi practice de la profesioniști pentru rezultate mai bune în mai puțin timp.',
    content: `## De ce curăță mulți oameni mult și obțin puțin

Curățenia nu e rocket science, dar are o logică internă pe care profesioniștii o urmează instinctiv și pe care majoritatea oamenilor o ignoră. Rezultatul: ore de muncă pentru un efect vizual mediocru, suprafețe care se murdăresc rapid și epuizare nejustificată. Iată cele 5 greșeli pe care le face aproape oricine curăță singur.

## Greșeala 1: Începi cu podeaua

Aceasta este cea mai răspândită greșeală și o face cel puțin jumătate din gospodari. Logica aparentă e că podeaua e cea mai murdară, deci o curăță prima. Problema: orice vei șterge sau aspira ulterior (mobilă, rafturi, corpuri de iluminat) va disloca praf și particule care cad direct pe podeaua curată.

**Regula profesioniștilor:** întotdeauna de sus în jos.

1. Tavane și colțuri (pânze de păianjen)
2. Corpuri de iluminat și vârfurile dulapurilor
3. Rafturi, mobilă, suprafețe orizontale
4. Geamuri și oglinzi
5. Plinte
6. Podea — abia la final

## Greșeala 2: Folosești o lavetă umedă pe praf uscat

Intuiția spune: ud = mai curat. Practica spune altceva. O lavetă umedă aplicată pe praf uscat transformă praful în noroi care se întinde pe suprafață în loc să fie ridicat. Rezultatul: amprente gri pe mobilă și o lavetă murdară rapid.

**Soluția corectă:** șterge praful uscat cu o lavetă de microfibră uscată sau ușor umezită (stoarsă bine). Microfibra reține particulele prin aderență electrostatică, nu prin umiditate. Abia după ce praful e îndepărtat, poți șterge cu o lavetă mai umedă cu detergent.

## Greșeala 3: Folosești prea mult detergent

Mai mult detergent = mai curat. Greșit. Excesul de detergent lasă un reziduu lipicios pe suprafețe care atrage praful mai rapid decât înainte de curățenie. Ai văzut vreodată că blatul de bucătărie sau podeaua par „murdare" imediat după ce le-ai curățat? Asta e reziduul de detergent.

**Cantitățile corecte pentru soluțiile de uz casnic:**
- Detergent multisuprafețe: 1–2 ml la 500 ml apă (1/4 linguriță la 0,5 litru)
- Degresant bucătărie: conform instrucțiunilor — de obicei 5–10 ml la litru
- Detergent pardoseală: 1 capac la o găleată de 5 litri

Clătirea cu apă curată după degresant este obligatorie, nu opțională.

## Greșeala 4: Ignori zonele pe care nu le vezi

Există zone din apartament pe care le incluzi mental în „apartamentul curat" fără să le fi curățat vreodată sau de ani de zile:

- **Spatele toaletei** (zona de prindere de perete și baza)
- **Vârfurile și interiorul dulapurilor** (un centimetru de praf solidificat e frecvent)
- **Grilele de ventilație** din baie și bucătărie (acumulează grăsime și praf care afectează calitatea aerului)
- **Garniturile de silicon** ale căzii și cabinei de duș (mucegai negru ascuns)
- **Filtrele aparatelor de aer condiționat** (curățate ideal o dată la 2–3 luni)
- **Zona de sub și din spatele frigiderului** (praf + condensuri + resturi alimentare)

O curățenie completă include aceste zone. Dacă le-ai ignorat ani de zile, o curățenie profesională o dată pe an le resetează.

## Greșeala 5: Folosești aceeași lavetă pentru tot

Dacă ștergi chiuveta din bucătărie, apoi blatul, apoi chiuveta din baie cu aceeași lavetă, nu curăți — muți bacteriile dintr-un loc în altul. Același principiu se aplică mopului și bureților.

> **Sistemul profesional cu 4 lavete colorate:** Firmele de curățenie serioase folosesc un cod de culori — câte o lavetă dedicată pentru bucătărie, baie, suprafețe generale și podele. Investiția în 8–12 lavete de microfibră de calitate (diferit colorate) este cel mai ușor upgrade pe care îl poți face curățeniei tale.

**Rezumatul regulilor de bază:**
1. De sus în jos, de la uscat la umed
2. Praful uscat cu lavetă uscată
3. Puțin detergent, clătit bine
4. Nu uita zonele ascunse
5. O lavetă per zonă, nu una pentru tot

Dacă vrei să lași munca asta pe mâna cuiva care respectă aceste reguli profesional, [Go2Fix](/lista-asteptare) conectează clienții cu firme de curățenie verificate din București și din toată țara.
`,
  },
  {
    slug: 'curatenie-post-renovare-ghid-complet',
    lang: 'ro',
    linkedSlug: 'post-renovation-cleaning-complete-guide',
    title: 'Curățenie post-renovare: ghidul complet',
    excerpt:
      'Praful de construcție nu dispare cu aspiratorul obișnuit. Ghid complet pentru curățenia după renovare: protocol, echipamente și costuri.',
    category: 'cum-sa',
    tags: ['curatenie post renovare', 'praf constructie', 'curatenie generala dupa renovare'],
    author: 'Echipa Go2Fix',
    publishedAt: '2026-03-01',
    readTimeMinutes: 6,
    metaTitle: 'Curățenie Post-Renovare: Ghid Complet 2026 | Go2Fix',
    metaDescription:
      'Cum faci corect curățenia după renovare: protocol pas cu pas, echipamente necesare, prețuri și de ce e diferită față de curățenia obișnuită.',
    content: `## De ce curățenia post-renovare e o categorie separată

Ai terminat renovarea. Meșterul a plecat. Te uiți în jur și realizezi că praful de construcție a acoperit absolut totul — pereți, geamuri, mobilier rămas, prize, corpuri de iluminat. Acest praf nu e praful obișnuit de casă. Este un amestec de particule fine de ciment, var, gips, polistiren, lemn și vopsea care penetrează crăpăturile, se depune stratificat pe suprafețe și, dacă e inhalat repetat, poate irita grav căile respiratorii.

**Curățenia standard nu rezolvă problema.** Un aspirator obișnuit recirculă o parte din particulele fine în aer. Produsele de curățenie de uz casnic nu degresează vopseaua sau adezivul de gresie. Echipamentele industriale și protocoalele specifice sunt esențiale.

## Standard vs. post-renovare — comparație

| Criteriu | Curățenie standard | Curățenie post-renovare |
|---|---|---|
| Tip praf | Casnic (fibră, piele moartă) | Mineral fin (ciment, var, gips) |
| Echipamente necesare | Aspirator casnic, mop | Aspirator industrial cu filtru HEPA, mop cu abur |
| Produse | Detergent multisuprafețe | Degresanți specializați, soluții anti-calcar industriale |
| Durata (3 camere) | 3–4 ore | 6–10 ore |
| Dificultate | Medie | Ridicată |
| Poate fi DIY? | Da | Parțial |

## Protocolul pas cu pas pentru post-renovare

### Pasul 1: Aerisire intensivă (1–2 ore)

Deschide toate ferestrele și ușile. Dacă ai ventilatoare, pune-le să extragă aerul din interior. Particulele fine rămân suspendate în aer ore întregi — aerisirea le reduce concentrația înainte să începi lucrul.

### Pasul 2: Colectarea resturilor mari

Înainte de orice altceva, strânge manual sau cu mătură grosieră resturile mari: bucăți de gresie, mortar uscat, saci de la materiale, folii. Nu lăsa echipamentele de aspirare să tragă obiecte mari — se blochează.

### Pasul 3: Aspirarea cu filtru HEPA (etapă critică)

> **Important:** Un aspirator obișnuit fără filtru HEPA va sufla o parte din praful de construcție înapoi în aer prin sacul sau filtrul său. Folosește exclusiv un aspirator industrial cu filtru HEPA certificat pentru particule fine (clasa H13 sau H14).

Aspiră în această ordine:
1. Plafoanele și cornișele
2. Pereții (de sus în jos)
3. Suprafețele orizontale ale mobilierului rămas
4. Pervazele și tocurile ferestrelor
5. Pardoselile — aspirare completă, inclusiv colțuri și spații sub mobilier

### Pasul 4: Spălarea suprafețelor

Fiecare suprafață se spală cu produse adecvate materialului:
- **Gresie și faianță nouă:** îndepărtarea imediată a resturilor de adeziv cu soluție acidă diluată, urmată de spălare neutră
- **Parchet:** ușor umezit, nu ud — excesul de apă poate provoca umflarea lamelor
- **Pereți vopsiți:** lavetă bine stoarsă, mișcări drepte, schimb frecvent al apei
- **Geamuri:** soluție profesională pentru geamuri, frecvență dublă față de standard

### Pasul 5: Spălarea finală a pardoselilor

Ultima etapă este o spălare completă a tuturor pardoselilor cu apă curată, pentru a ridica orice reziduu de detergent sau praf rămas. Schimbă apa de câte ori e necesar — apa murdară nu curăță.

## Prețuri orientative pentru curățenie post-renovare

| Tip apartament | Preț minim | Preț maxim | Echipă recomandată |
|---|---|---|---|
| Garsonieră | 350 lei | 500 lei | 2 persoane |
| 2 camere | 500 lei | 750 lei | 2–3 persoane |
| 3 camere | 700 lei | 1.100 lei | 3 persoane |
| 4 camere sau casă | 1.000 lei | 1.800 lei | 3–4 persoane |

Prețurile variază în funcție de tipul renovării (zugravit vs. renovare completă cu demolări), starea geamurilor și dacă firma aduce propria apă și echipamente industriale.

## De ce merită o firmă specializată

O renovare costă mii sau zeci de mii de lei. O curățenie post-renovare nefăcută corect poate lăsa reziduri de mortar pe gresia nouă, zgarieturi pe parchetul proaspăt pus sau pete de var pe vopseaua delicată. Prețul unei firme specializate e neglijabil față de costul reparării daunelor.

[Go2Fix](/lista-asteptare) lucrează cu firme care au echipamente industriale și experiență specifică în curățenie post-renovare. Înscrie-te pentru a accesa serviciul imediat ce ne lansăm.
`,
  },
  {
    slug: 'curatenie-sezoniera-primavara',
    lang: 'ro',
    linkedSlug: 'spring-cleaning-romania-diy-vs-outsource',
    title: 'Curățenia sezonieră de primăvară: ce faci singur și ce externalizezi',
    excerpt:
      'Ghid practic pentru curățenia de primăvară: ce poți face DIY în weekend și ce are sens să delegi unui profesionist pentru rezultate reale.',
    category: 'cum-sa',
    tags: ['curatenie primavara', 'curatenie sezoniera', 'curatenie generala'],
    author: 'Echipa Go2Fix',
    publishedAt: '2026-03-05',
    readTimeMinutes: 5,
    metaTitle: 'Curățenie de Primăvară: DIY vs Profesionist | Go2Fix',
    metaDescription:
      'Ce faci singur și ce externalizezi la curățenia de primăvară. Plan de weekend + ghid pentru servicii profesionale care merită investiția.',
    content: `## De ce primăvara e momentul ideal pentru resetarea casei

Iarna înseamnă ferestre închise, aer recirculat, sisteme de încălzire active și mai mult timp petrecut în interior. Până în martie, un apartament tipic a acumulat luni de praf, microorganisme și grăsimi pe suprafețe rar atinse. Primăvara aduce temperaturi moderate — ideale pentru produsele de curățenie, ventilație naturală și uscarea rapidă a suprafețelor — și ziua mai lungă, care te ajută să vezi murdăria pe care lumina de iarnă o ascundea.

O curățenie de primăvară bine planificată nu înseamnă o zi de tortură. Înseamnă o redistribuire inteligentă a sarcinilor: ce faci tu și ce delegi.

## Ce poți face singur (DIY)

Aceste sarcini nu necesită echipamente speciale și se pot rezolva în câteva ore de weekend cu produse accesibile:

- **Declutter și sortare haine** — donează ce nu ai purtat în ultimele 12 luni, organizează pe sezoane
- **Curăță frigiderul complet** — scoate toate rafturile, spală cu apă caldă și bicarbonat, verifică termenele de valabilitate
- **Sortează dulapurile din bucătărie** — aruncă condimentele expirate, reorganizează după frecvență de utilizare
- **Filtrele de la aparatul de aer condiționat** — se scot și se spală sub jet de apă sau se șterg cu lavetă umedă. Fă asta înainte de primul sezon de răcire
- **Cadru și pervazuri ferestre** — praf acumulat peste iarnă, ușor de șters cu lavetă umedă
- **Curățarea mașinii de spălat** — un program de curățare cu oțet alb la 60°C o dată pe sezon

## Ce merită să externalizezi unui profesionist

Acestea sunt sarcinile unde diferența de calitate între DIY și profesionist este majoră și unde echipamentele contează decisiv:

- **Geamuri exterioare** — imposibil de curățat corect din interior (mai ales la etaje mai mari). Firmele au echipamente și asigurări pentru lucrul la înălțime
- **Covoare și carpete** — extracția profesională cu apă fierbinte sub presiune elimină alergenul și bacteriile pe care aspiratorul le lasă în fibră
- **Curățenie profundă bucătărie** — cuptor (interior), hotă completă (inclusiv filtrul de carbon), spatele și sub aparatele electrocasnice
- **Tapițerie și saltele** — extracția umedă profesională elimină acarienii, petele vechi și mirosurile absorbite în iarnă
- **Prima curățenie sezonieră generală** — dacă vrei să „resetezi" apartamentul complet, o echipă de doi oameni face într-o zi ceea ce ar dura un weekend întreg și mai mult

## Plan de weekend pentru curățenia de primăvară

| Moment | Activitate | DIY / Pro |
|---|---|---|
| Sâmbătă dimineață | Declutter haine și dulap | DIY |
| Sâmbătă dimineață | Sortare bucătărie + curățat frigider | DIY |
| Sâmbătă după-amiază | Filtre AC, pervazuri, curățare mașină spălat | DIY |
| Duminică | Curățenie generală profesională (echipa externă) | Pro |
| Luni | Geamuri exterioare + covor living | Pro |

Dacă ai rezervat echipa profesională pentru duminică, fă tot DIY-ul sâmbătă — echipa va găsi un apartament deja declutterat și organizat, ceea ce înseamnă că poate aloca tot timpul curățeniei propriu-zise, nu ordonării.

## Cât costă curățenia de primăvară profesională

O curățenie generală de primăvară pentru un apartament cu 2 camere costă între 350 și 550 lei pentru echipa de bază. Adaugă:

- Extracție covor: 80–150 lei/bucată, în funcție de dimensiune
- Saltea: 100–200 lei/bucată
- Tapițerie canapea: 150–300 lei

Prețul total pentru un reset complet al unui apartament de 2 camere se situează între 600 și 1.000 lei — o dată pe an, o investiție rezonabilă pentru 12 luni de confort.

## Înscrie-te pe Go2Fix pentru acces timpuriu

[Go2Fix](/lista-asteptare) se lansează cu servicii de curățenie generală și sezonieră pentru București și alte orașe din România. Rezervă-ți locul pe lista de așteptare și vei fi primul care primește acces și oferta de lansare pentru curățenia ta de primăvară.
`,
  },

  // ─── ENGLISH POSTS ────────────────────────────────────────────────────────

  {
    slug: 'how-to-choose-a-cleaning-company-in-bucharest',
    lang: 'en',
    linkedSlug: 'cum-sa-alegi-firma-curatenie-bucuresti',
    title: 'How to Choose the Right Cleaning Company in Bucharest',
    excerpt:
      'A complete guide to choosing a reliable cleaning company in Bucharest. Learn what documents to check, how to read reviews, and what questions to ask.',
    category: 'sfaturi',
    tags: ['cleaning company bucharest', 'cleaning services', 'professional cleaning'],
    author: 'Go2Fix Team',
    publishedAt: '2026-01-15',
    readTimeMinutes: 6,
    metaTitle: 'How to Choose a Cleaning Company in Bucharest | Go2Fix',
    metaDescription:
      'Complete guide to choosing the right cleaning company in Bucharest. Check documents, read reviews and know what to ask before booking.',
    content: `## Why choosing the right cleaning company matters

Finding a reliable cleaning company in Bucharest can feel overwhelming — there are thousands of options, ranging from freelancers to established firms. A wrong choice can mean unreliable staff, property damage, or hidden costs. This guide helps you make the right decision.

## 1. Verify their legal registration

Always check that the company is legally registered in Romania. Ask for their **CUI (Unique Identification Code)** and verify it on the ANAF website. A legitimate company will have no issues providing this information.

Additionally, check that they have **civil liability insurance**. This protects you in case of accidental damage during the cleaning service.

## 2. Check reviews and ratings

Look for reviews on multiple platforms — Google Maps, Facebook, and specialised cleaning marketplaces. Pay attention to:

- Consistency of positive feedback across different dates
- How the company responds to negative reviews
- Specific mentions of punctuality, professionalism, and results
- Whether reviewers are verified customers

## 3. Ask the right questions

Before booking, ask these essential questions:

- What cleaning products do you use? Are they safe for children and pets?
- Are your employees background-checked?
- What happens if something is damaged during cleaning?
- Do you provide all equipment and supplies?
- What is your cancellation policy?

## 4. Compare prices transparently

Reputable companies provide clear pricing — either per hour or per service type. Be wary of unusually low prices, which often indicate either poor quality or hidden additional costs. On Go2Fix, all prices are transparent and displayed before you book.

## 5. Use a verified marketplace

The safest way to find a cleaning company in Bucharest is through a platform that pre-screens all companies. Go2Fix verifies every partner company's documents, insurance, and reviews before approving them on the platform.

This means you can book with confidence, knowing every company you see has passed our verification process. [Join the waitlist](/en/waitlist) for early access.
`,
  },
  {
    slug: 'apartment-cleaning-complete-guide',
    lang: 'en',
    linkedSlug: 'curatenie-apartament-ghid-complet',
    title: 'Apartment Cleaning: A Complete Step-by-Step Guide',
    excerpt:
      'Everything you need to know about apartment cleaning — from choosing the right service to preparing your home and what to expect from professional cleaners.',
    category: 'cum-sa',
    tags: ['apartment cleaning', 'house cleaning guide', 'professional cleaning'],
    author: 'Go2Fix Team',
    publishedAt: '2026-01-22',
    readTimeMinutes: 8,
    metaTitle: 'Apartment Cleaning: Complete Step-by-Step Guide | Go2Fix',
    metaDescription:
      'Complete guide to apartment cleaning — how to prepare, what to expect, and how to get the best results from professional cleaning services.',
    content: `## Types of apartment cleaning services

Before booking, it's important to understand the different types of cleaning available:

- **Standard cleaning**: Regular maintenance cleaning — dusting, vacuuming, mopping, bathroom and kitchen cleaning. Ideal for weekly or bi-weekly appointments.
- **Deep cleaning**: Thorough cleaning that reaches neglected areas — behind appliances, inside cupboards, grout cleaning, window sills. Recommended every 3–6 months.
- **Move-in/move-out cleaning**: Intensive cleaning for empty apartments before or after tenancy.
- **Post-construction cleaning**: Specialised cleaning to remove construction dust, debris, and residue after renovation work.

## How to prepare for professional cleaners

Getting the most from your cleaning session starts before the cleaners arrive:

1. **Declutter surfaces**: Clear countertops, tables, and floors of personal items. Cleaners can't clean around piles of objects.
2. **Secure valuables**: Put away jewellery, cash, and important documents.
3. **Communicate specific needs**: Note any areas requiring special attention or products to avoid (e.g., wood floors, marble surfaces).
4. **Ensure access**: Make sure cleaners can access all rooms, including storage areas if needed.
5. **Put pets somewhere safe**: Some pets get stressed by strangers; it's kinder to keep them in a separate room or with a neighbour.

## What professional cleaners do (and don't do)

Professional cleaning companies typically include:

- Dusting all accessible surfaces
- Vacuuming carpets and mopping hard floors
- Cleaning bathrooms (toilet, sink, bath/shower, mirrors)
- Kitchen cleaning (countertops, exterior of appliances, sink)
- Emptying bins

Standard cleaning usually excludes: interior of ovens, fridge cleaning, window exteriors, heavy furniture moving, and laundry.

## How many hours does apartment cleaning take?

As a general guide:

- Studio / 1-room apartment: 2–3 hours
- 2-room apartment: 3–4 hours
- 3-room apartment: 4–5 hours
- 4+ rooms: 5–7 hours

Deep cleaning typically takes 50–100% longer than standard cleaning.

## Getting the best results

To ensure consistently great results: book the same team regularly, provide specific feedback after each session, and maintain your home between professional cleanings with basic daily tidying. [Join the Go2Fix waitlist](/en/waitlist) to access verified cleaning companies in Romania.
`,
  },
  {
    slug: 'benefits-professional-office-cleaning',
    lang: 'en',
    linkedSlug: 'beneficiile-curatenie-profesionala-birou',
    title: 'Why Hiring a Professional Office Cleaning Company Is Worth It',
    excerpt:
      'Discover the real benefits of professional office cleaning — from employee productivity and health to client impressions and cost savings.',
    category: 'sfaturi',
    tags: ['office cleaning', 'professional cleaning', 'workplace hygiene'],
    author: 'Go2Fix Team',
    publishedAt: '2026-02-01',
    readTimeMinutes: 5,
    metaTitle: 'Why Hire a Professional Office Cleaning Company | Go2Fix',
    metaDescription:
      "Professional office cleaning improves employee health, productivity and client impressions. Find out why it's worth the investment.",
    content: `## The true cost of a dirty office

A messy, unhygienic workplace costs more than you might think. Studies show that employees take more sick days in poorly maintained offices, productivity drops when workspaces are cluttered, and potential clients often form negative first impressions based on office cleanliness.

Professional cleaning is not a cost — it's an investment that pays for itself.

## Health and reduced sick days

Offices are hotspots for bacteria and viruses. Shared keyboards, door handles, phones, and kitchen areas can harbour hundreds of thousands of germs. Professional cleaners use appropriate disinfectants and techniques to significantly reduce bacterial load.

Companies with regular professional cleaning report fewer sick days, lower staff turnover due to health issues, and better overall workplace wellbeing.

## Employee productivity

Research consistently shows that a clean, organised workspace improves focus and productivity. When employees don't have to worry about tidying up or cleaning common areas, they can concentrate fully on their work.

Moreover, professional cleaning improves air quality by removing dust and allergens — reducing headaches, eye irritation, and respiratory issues that impair concentration.

## Professional image for clients

Your office is your brand's physical manifestation. A clean, well-maintained office communicates professionalism, attention to detail, and respect for visitors.

In contrast, dusty surfaces, dirty toilets, or overflowing bins can undermine even the most polished business presentation.

## Cost efficiency vs. in-house cleaning

Many companies assume hiring in-house cleaning staff is cheaper. When you factor in employment costs, equipment, supplies, supervision time, holiday cover, and sick pay, professional cleaning services often prove more cost-effective — with the added benefit of accountability and consistent quality standards.

## Choosing the right office cleaning partner

Look for a company that offers flexible scheduling (after hours or at weekends), uses eco-friendly products, has verifiable insurance, and provides a dedicated account manager. On Go2Fix, all partner companies are pre-verified for exactly these criteria. [Join the waitlist](/en/waitlist) for early access.
`,
  },

  // ─── NEW ENGLISH POSTS ────────────────────────────────────────────────────

  {
    slug: 'how-much-does-cleaning-cost-in-bucharest-2026',
    lang: 'en',
    linkedSlug: 'cat-costa-curatenie-profesionala-bucuresti-2026',
    title: 'How Much Does Professional Cleaning Cost in Bucharest in 2026?',
    excerpt:
      'Updated pricing guide for expats in Bucharest: what you pay for a studio, 1-, 2- or 3-bedroom apartment and what drives the final cost.',
    category: 'sfaturi',
    tags: ['cleaning cost bucharest', 'apartment cleaning price', 'professional cleaning rates'],
    author: 'Go2Fix Team',
    publishedAt: '2026-02-10',
    readTimeMinutes: 5,
    metaTitle: 'Professional Cleaning Prices in Bucharest 2026 | Go2Fix',
    metaDescription:
      'Up-to-date cleaning prices in Bucharest for 2026. Price table by apartment size, key cost factors, and tips for getting a fair quote.',
    content: `## What does professional cleaning actually cost in Bucharest?

If you're an expat living in Bucharest, navigating local service prices can be confusing. Cleaning companies rarely publish their rates online, and asking around yields wildly different answers. This guide gives you a clear, realistic picture of what you should expect to pay in 2026 — and how to avoid overpaying or hiring someone who'll disappoint.

## Price table — standard cleaning

| Apartment type | Approximate size | Min price | Max price | Approx. EUR* |
|---|---|---|---|---|
| Studio | 25–40 m² | 180 RON | 280 RON | 36–56 € |
| 1-bedroom | 45–65 m² | 280 RON | 420 RON | 56–84 € |
| 2-bedroom | 70–90 m² | 380 RON | 560 RON | 76–112 € |
| 3-bedroom | 90–130 m² | 500 RON | 800 RON | 100–160 € |

*EUR conversion at approximately 0.20 €/RON (check current rates)

> **Note:** These prices are for standard maintenance cleaning. Deep cleaning (end-of-tenancy, post-renovation, seasonal) costs 40–70% more than standard rates.

## What affects the final price

### Type of cleaning

The single biggest price driver is what you actually need done:

- **Standard cleaning** — dusting, vacuuming, mopping, bathroom and kitchen surface cleaning. The base price.
- **Deep cleaning** — includes inside appliances, inside cupboards, ventilation grilles, behind furniture. Adds 40–60% to standard price.
- **Move-out / end-of-tenancy** — empty apartment, all surfaces, often with a handover guarantee. Priced separately.
- **Post-renovation** — specialist equipment required. Priced per job, not per hour.

### Apartment condition

Reputable companies will ask for photos or do a brief inspection before quoting. An apartment not cleaned professionally in 12+ months will take longer — and the price reflects that. This is normal and honest, not a rip-off.

### Service frequency

Recurring clients (weekly or bi-weekly bookings) typically get 10–20% discounts. This is standard practice — a regularly maintained apartment takes less time to clean.

### Equipment and products

Companies that bring their own industrial-grade equipment (HEPA-filter vacuums, steam cleaners, professional-concentration detergents) are more expensive than those using your own supplies. The quality difference is real, especially for deep cleaning.

## Red flags for unusually cheap quotes

Offers of 80–120 RON for a full 3-bedroom apartment should raise immediate concerns. This price point is only possible if:

- The work is undeclared (no insurance, no contract, no recourse if something goes wrong)
- Products are heavily diluted or low quality
- Insufficient time is allocated (surfaces are wiped, not cleaned)

> **Practical rule:** In Romania, as anywhere, you're not just paying for hours of labour. You're paying for trustworthiness, insurance, and accountability. Cheap cleaning of your home carries real risk.

## How to request a proper quote

When contacting a company, give them this information for an accurate price:

1. Apartment type and approximate size in m²
2. Type of cleaning needed (standard, deep, move-out)
3. Date of last professional cleaning
4. Pets in the household (affects vacuuming requirements and product choices)
5. Any specific areas of concern (heavy limescale, oven, exterior windows)

A professional quote comes in writing, lists what is and is not included, and doesn't change significantly on the day.

## Transparent pricing on Go2Fix

On [Go2Fix](/en/waitlist), every partner company displays its prices upfront before you book. No surprises, no negotiation stress, no hidden fees. [Join the waitlist](/en/waitlist) to be among the first to book through our verified network.
`,
  },
  {
    slug: 'move-out-cleaning-guide-renters',
    lang: 'en',
    linkedSlug: 'curatenie-la-mutare-ghid-chiriasi',
    title: 'Move-Out Cleaning in Romania: Complete Guide for Renters',
    excerpt:
      'Get your security deposit back in full. Complete move-out cleaning checklist for renters in Romania, plus when to hire a professional.',
    category: 'cum-sa',
    tags: ['move out cleaning', 'tenant checklist romania', 'security deposit'],
    author: 'Go2Fix Team',
    publishedAt: '2026-02-15',
    readTimeMinutes: 7,
    metaTitle: 'Move-Out Cleaning Romania: Complete Renter Guide | Go2Fix',
    metaDescription:
      'Complete move-out cleaning checklist for renters in Romania. Protect your security deposit with this room-by-room guide and professional tips.',
    content: `## Why move-out cleaning matters more in Romania

In Romania, rental security deposits are typically **1 to 3 months' rent**. On a 1,000 EUR/month apartment in central Bucharest, that means 1,000–3,000 EUR sitting with your landlord. The most common reason Romanian landlords retain deposits — fully or partially — is unsatisfactory cleanliness at handover.

Romanian rental law allows landlords to deduct cleaning costs from the deposit if the property is returned in worse condition than it was handed over (accounting for normal wear and tear). The definition of "worse condition" is broad and often disputed. A thorough, documented move-out clean is your strongest protection.

## Complete move-out cleaning checklist

### Kitchen

- [ ] Oven interior (including rack, trays, and door seal)
- [ ] Oven exterior (control panel, sides, top)
- [ ] Refrigerator interior (all shelves, drawers, door seals) and exterior
- [ ] Extractor hood: filter cleaned or replaced, interior and exterior degreased
- [ ] Microwave interior and exterior
- [ ] Dishwasher interior (filter, door seal) and exterior
- [ ] Worktop: fully degreased including areas around hob
- [ ] Wall tiles: limescale and grease removed, grout clean
- [ ] Sink and taps: limescale-free, polished
- [ ] Cupboards: interior and exterior including hinges and handles
- [ ] Floor: scrubbed including corners and under appliances

### Bathroom

- [ ] Toilet: inside bowl (including under the rim), outside, base, cistern
- [ ] Bath or shower: limescale fully removed, silicon seals clean or replaced
- [ ] Basin and taps: limescale-free, polished
- [ ] Mirror: streak-free
- [ ] Wall tiles and grout: fully cleaned
- [ ] Bathroom cabinet: interior and exterior
- [ ] Extractor fan: grille cleaned
- [ ] Floor: disinfected, including behind the toilet

### Bedrooms and living room

- [ ] Interior windows: no fingerprints or dust
- [ ] Door frames and window frames: wiped down
- [ ] Light switches and sockets: degreased
- [ ] Light fittings: no dead insects or dust
- [ ] Skirting boards: wiped along full length
- [ ] Built-in wardrobes (if present): interior and exterior
- [ ] Floor: vacuumed and mopped, including under any remaining furniture

### Easily forgotten zones

- [ ] Ventilation grilles (ceiling and walls)
- [ ] Backs of doors (handle area marks)
- [ ] Thermostat and AC controls
- [ ] Balcony: floor, railing, any left-behind planters
- [ ] Hallway and entrance area

## DIY vs professional cleaning — honest comparison

| Factor | DIY | Professional company |
|---|---|---|
| Cost | 0–80 RON (products) | 300–600 RON |
| Time needed | 8–16 hours | 3–5 hours |
| Final quality | Variable | Consistent, verifiable |
| Equipment | Limited | Industrial (steam, HEPA) |
| Proof for landlord | Your photos | Invoice + written guarantee |
| Stress level | High (you're already moving) | Low |

If your monthly rent is 1,000 EUR and your deposit is 2,000 EUR, a professional clean at 100 EUR that secures the full return of your deposit is an obvious investment.

## Practical tips for handover day

**Schedule cleaning for handover day or the evening before.** An apartment cleaned three days early will gather dust before the inspection.

**Photograph everything after cleaning.** Take clear photos of each room focusing on key areas — bathroom, kitchen, windows. Photos with timestamps are your primary evidence if a dispute arises.

**Get a receipt from the cleaning company.** An official invoice from a registered business shows the landlord the handover was taken seriously. It can also be used in any formal dispute.

**Do the handover with the landlord present.** Don't drop the keys in the post box. Insist on a signed handover report (proces-verbal de predare-primire) documenting the apartment's condition at handover.

## Book a verified move-out clean

[Go2Fix](/en/waitlist) works with companies specialised in end-of-tenancy cleaning across Bucharest and major Romanian cities. Book a verified clean with a satisfaction guarantee and official invoice — exactly what you need for a stress-free move.
`,
  },
  {
    slug: 'five-cleaning-mistakes-everyone-makes',
    lang: 'en',
    linkedSlug: '5-greseli-curatenie-acasa',
    title: "5 Cleaning Mistakes You're Probably Making Right Now",
    excerpt:
      'From cleaning the floor first to using too much detergent — 5 universal cleaning mistakes that double your effort without better results.',
    category: 'sfaturi',
    tags: ['cleaning mistakes', 'home cleaning tips', 'professional cleaning tips'],
    author: 'Go2Fix Team',
    publishedAt: '2026-02-20',
    readTimeMinutes: 4,
    metaTitle: '5 Cleaning Mistakes Everyone Makes at Home | Go2Fix',
    metaDescription:
      'Discover the 5 classic cleaning mistakes that double your workload. Practical tips from professionals for better results in less time.',
    content: `## Why most people clean a lot and achieve little

Cleaning isn't rocket science, but it does have an internal logic that professionals follow instinctively and most people ignore. The result: hours of effort for a mediocre finish, surfaces that get dirty faster than expected, and unnecessary exhaustion. Here are the five mistakes almost everyone makes when cleaning their own home.

## Mistake 1: Starting with the floor

This is the most widespread cleaning mistake — at least half of households do it. The apparent logic: the floor is the dirtiest part, so clean it first. The problem: everything you wipe or vacuum afterwards (furniture, shelves, light fittings) dislodges dust and particles that fall directly onto your freshly cleaned floor.

**The professional rule:** always top to bottom.

1. Ceilings and corners (cobwebs)
2. Light fittings and tops of wardrobes
3. Shelves, furniture, horizontal surfaces
4. Windows and mirrors
5. Skirting boards
6. Floor — only last

## Mistake 2: Using a wet cloth on dry dust

Intuition says wet = cleaner. Practice says otherwise. A wet cloth applied to dry dust turns it into a grey smear that spreads across the surface instead of being lifted. Result: grey fingerprints on furniture and a cloth that gets dirty almost immediately.

**The correct approach:** remove dry dust with a dry or barely damp microfibre cloth. Microfibre lifts particles through electrostatic attraction, not moisture. Only once the dust is gone should you wipe with a damp cloth and detergent.

## Mistake 3: Using too much detergent

More detergent = cleaner. Wrong. Excess detergent leaves a sticky residue on surfaces that attracts dust faster than before cleaning. Have you noticed your kitchen worktop or floor looks "dirty" almost immediately after cleaning? That's detergent residue.

**Correct quantities for household solutions:**
- Multi-surface cleaner: 1–2 ml per 500 ml water
- Kitchen degreaser: per label instructions — typically 5–10 ml per litre
- Floor detergent: one cap per 5-litre bucket

Rinsing with clean water after degreaser is mandatory, not optional.

## Mistake 4: Ignoring zones you can't see

There are areas of your home that you include mentally in "the clean apartment" without ever actually cleaning them:

- **Behind the toilet** (fixing point at the wall and the base)
- **Tops and inside of wardrobes** (a centimetre of compacted dust is common)
- **Ventilation grilles** in bathroom and kitchen (accumulate grease and dust that affect air quality)
- **Silicon seals** on the bath and shower cubicle (hidden black mould)
- **Air conditioning filters** (clean every 2–3 months)
- **Under and behind the fridge** (dust, condensation, food debris)

A thorough clean includes these zones. If you've ignored them for years, a professional clean once a year resets them.

## Mistake 5: Using the same cloth for everything

If you wipe the kitchen sink, then the worktop, then the bathroom sink with the same cloth, you're not cleaning — you're moving bacteria from one place to another. The same applies to mops and sponges.

> **The professional four-cloth colour system:** Reputable cleaning companies use colour-coded cloths — one dedicated to the kitchen, one to the bathroom, one to general surfaces, one to floors. Investing in 8–12 quality microfibre cloths in different colours is the single easiest upgrade you can make to your cleaning routine.

**The core rules to remember:**
1. Top to bottom, dry before wet
2. Dry dust with a dry cloth
3. Small amounts of detergent, always rinse
4. Don't forget the hidden zones
5. One cloth per area, not one for everything

If you'd rather leave this to someone who follows these rules professionally, [Go2Fix](/en/waitlist) connects clients with verified cleaning companies across Romania.
`,
  },
  {
    slug: 'post-renovation-cleaning-complete-guide',
    lang: 'en',
    linkedSlug: 'curatenie-post-renovare-ghid-complet',
    title: 'Post-Renovation Cleaning: How to Handle Construction Dust Properly',
    excerpt:
      'Construction dust is not ordinary household dust. A step-by-step guide to post-renovation cleaning, the right equipment, and realistic costs.',
    category: 'cum-sa',
    tags: ['post renovation cleaning', 'construction dust', 'after renovation cleaning'],
    author: 'Go2Fix Team',
    publishedAt: '2026-03-01',
    readTimeMinutes: 6,
    metaTitle: 'Post-Renovation Cleaning Guide: Handle Dust Safely | Go2Fix',
    metaDescription:
      'Step-by-step guide to cleaning after renovation. Learn why standard cleaning fails, what equipment you need, and what it costs in Romania.',
    content: `## Why post-renovation cleaning is a different discipline

Your renovation is finished. The builders have left. You look around and realise that a fine grey layer of dust has settled on absolutely everything — walls, windows, remaining furniture, sockets, light fittings. This is not ordinary household dust.

Construction dust is a mixture of fine particles: cement, plaster, gypsum, polystyrene, wood fibres, and paint residue. It penetrates cracks, settles in compacted layers on surfaces, and — if repeatedly inhaled — can seriously irritate the respiratory system. Fine silica particles from cement and plaster carry a long-term health risk with chronic exposure.

**Standard cleaning does not solve the problem.** A regular household vacuum recirculates a significant fraction of fine particles back into the air. Standard household cleaning products won't dissolve tile adhesive or degrease fresh paint overspray. Industrial equipment and a specific protocol are essential.

## Standard cleaning vs. post-renovation — comparison

| Factor | Standard cleaning | Post-renovation cleaning |
|---|---|---|
| Dust type | Domestic (fibre, skin cells) | Mineral fine particles (cement, plaster, gypsum) |
| Equipment required | Household vacuum, mop | Industrial vacuum with HEPA filter, steam cleaner |
| Products required | Multi-surface cleaner | Specialist degreasers, industrial descalers |
| Duration (2-bedroom) | 3–4 hours | 6–10 hours |
| Difficulty | Medium | High |
| Possible as DIY? | Yes | Partially |

## Step-by-step post-renovation cleaning protocol

### Step 1: Intensive ventilation (1–2 hours)

Open all windows and doors. If you have fans, use them to extract air from inside. Fine particles remain suspended in the air for hours — ventilation reduces the concentration before you start working.

### Step 2: Remove large debris

Before any vacuuming, collect large waste manually or with a rough broom: tile pieces, hardened mortar, packaging, protective sheeting. Don't let your vacuum attempt to draw in large objects — it will clog.

### Step 3: HEPA vacuum — the critical step

> **Important:** A standard household vacuum without a HEPA filter will blow a portion of fine construction dust back into the air through its bag or filter. Use only an industrial vacuum with a certified HEPA filter (class H13 or H14) for this type of dust.

Vacuum in this order:
1. Ceilings and ceiling corners
2. Walls (top to bottom)
3. Horizontal surfaces of remaining furniture
4. Window sills and door frames
5. Floors — thorough pass including corners and under furniture

### Step 4: Surface washing

Each surface type requires appropriate products:
- **New tiles and grout:** remove adhesive residue immediately with diluted acid solution, followed by neutral cleaning
- **New parquet flooring:** lightly damp, not wet — excess water causes boards to swell
- **Painted walls:** well-wrung cloth, straight strokes, frequent water changes
- **Windows:** professional glass solution, double the normal frequency

### Step 5: Final floor wash

The last step is a complete floor wash with clean water to lift any remaining detergent residue or fine dust. Change the water as often as needed — dirty water doesn't clean.

## Cost estimates for post-renovation cleaning in Romania

| Apartment type | Min price | Max price | Recommended team |
|---|---|---|---|
| Studio | 350 RON | 500 RON | 2 people |
| 1-bedroom | 500 RON | 750 RON | 2–3 people |
| 2-bedroom | 700 RON | 1,100 RON | 3 people |
| 3-bedroom or house | 1,000 RON | 1,800 RON | 3–4 people |

Prices vary depending on the type of renovation (painting only vs. full structural renovation with demolition), window condition, and whether the company brings its own water supply and industrial equipment.

## Why a specialist company is worth it

A renovation costs thousands or tens of thousands of RON. Post-renovation cleaning done incorrectly can leave mortar residue on new tiles, scratches on freshly laid parquet, or lime stains on delicate paint. The cost of a specialist company is negligible compared to repairing those damages.

[Go2Fix](/en/waitlist) partners with companies that have industrial equipment and specific experience in post-renovation cleaning. Join the waitlist to access the service as soon as we launch.
`,
  },
  {
    slug: 'spring-cleaning-romania-diy-vs-outsource',
    lang: 'en',
    linkedSlug: 'curatenie-sezoniera-primavara',
    title: 'Spring Cleaning in Romania: What to DIY and What to Outsource',
    excerpt:
      'Practical spring cleaning guide for Romania: what you can handle yourself in a weekend and what is genuinely worth hiring a professional for.',
    category: 'cum-sa',
    tags: ['spring cleaning romania', 'home deep cleaning', 'professional cleaning service'],
    author: 'Go2Fix Team',
    publishedAt: '2026-03-05',
    readTimeMinutes: 5,
    metaTitle: 'Spring Cleaning Romania: DIY vs Professional | Go2Fix',
    metaDescription:
      'What to DIY and what to outsource for spring cleaning in Romania. Weekend plan + guide to professional services worth the investment.',
    content: `## Why spring is the ideal time for a home reset

Winter in Romania means months of closed windows, recirculated air, active heating systems, and more time spent indoors. By March, a typical apartment has accumulated months of dust, microorganisms, and grease on rarely-touched surfaces.

Spring brings moderate temperatures — ideal for cleaning products, natural ventilation, and fast surface drying — and longer daylight hours that reveal the dirt winter light was hiding.

A well-planned spring clean is not a day of drudgery. It's an intelligent redistribution of tasks: what you do yourself, and what you hand off to someone better equipped for it.

## What you can do yourself (DIY)

These tasks don't require specialist equipment and can be done over a weekend with accessible products:

- **Declutter and sort seasonal clothes** — donate what you haven't worn in 12 months, reorganise by season
- **Full refrigerator clean** — remove all shelves, wash with warm water and bicarbonate of soda, check expiry dates
- **Kitchen cupboards** — discard expired spices and condiments, reorganise by frequency of use
- **Air conditioning filters** — remove and rinse under running water or wipe with a damp cloth; do this before the first cooling season
- **Window frames and sills** — accumulated winter dust, easy to wipe with a damp cloth
- **Washing machine drum** — run a cleaning cycle with white vinegar at 60°C once a season

## What is genuinely worth outsourcing

These are the tasks where the quality difference between DIY and professional is significant — and where equipment makes all the difference:

- **Exterior windows** — impossible to clean properly from inside (especially above the ground floor). Professional companies have the equipment and insurance for working at height.
- **Carpets and rugs** — professional hot-water extraction eliminates the allergens and bacteria that vacuuming leaves behind in the fibre.
- **Deep kitchen clean** — inside the oven, complete extractor hood (including carbon filter), behind and under appliances.
- **Upholstery and mattresses** — professional wet extraction eliminates dust mites, old stains, and odours absorbed through winter.
- **Full seasonal deep clean** — if you want to reset the entire apartment, a two-person team does in one day what would take you a full weekend and more.

## Weekend spring cleaning plan

| Time | Task | DIY / Pro |
|---|---|---|
| Saturday morning | Declutter clothes and wardrobe | DIY |
| Saturday morning | Kitchen sort + fridge clean | DIY |
| Saturday afternoon | AC filters, window frames, washing machine | DIY |
| Sunday | Professional deep clean (external team) | Pro |
| Monday | Exterior windows + living room rug | Pro |

If you have the professional team booked for Sunday, complete all DIY tasks on Saturday. The team will arrive at a decluttered, organised apartment — meaning they spend all their time on actual cleaning, not tidying.

## How much does professional spring cleaning cost in Romania?

A full deep clean for a 1-bedroom apartment costs between 350 and 550 RON (roughly 70–110 EUR) for the base service. Add:

- Carpet extraction: 80–150 RON per piece, depending on size
- Mattress: 100–200 RON per piece
- Sofa upholstery: 150–300 RON

The total cost of a complete reset for a 1-bedroom apartment runs between 600 and 1,000 RON. Done once a year, it's a reasonable investment for 12 months of comfort.

## Get early access on Go2Fix

[Go2Fix](/en/waitlist) is launching with deep cleaning and seasonal cleaning services in Bucharest and other Romanian cities. Join the waitlist and you'll be among the first to get access — plus our early-launch offer for spring cleaning.
`,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getPostsByLanguage(lang: BlogLanguage): BlogPost[] {
  return BLOG_POSTS.filter((p) => p.lang === lang);
}

export function getLinkedPost(post: BlogPost): BlogPost | undefined {
  if (!post.linkedSlug) return undefined;
  return BLOG_POSTS.find((p) => p.slug === post.linkedSlug);
}

export function getRelatedPosts(currentSlug: string, limit = 2, lang?: BlogLanguage): BlogPost[] {
  return BLOG_POSTS.filter((p) => p.slug !== currentSlug && (!lang || p.lang === lang)).slice(
    0,
    limit,
  );
}
