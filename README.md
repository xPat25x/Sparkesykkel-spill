# Deathtrip – Sparkesykkel

Et spill om trafikksikkerhet fra Deathtrip-kampanjen og Ung i trafikken. Unngå biler, syklister og fotgjengere, samle power-ups og prøv å slå din egen rekord. Spillet simulerer hvordan alkohol svekker synet og kontrollen. Kjør alltid edru i virkeligheten.

**[Åpne spillet](https://xpat25x.github.io/Sparkesykkel-spill/)**

## Slik spiller du

1. Trykk på **Start spill** eller Enter.
2. Styr med piltastene eller WASD på PC/Mac. På en berøringsskjerm holder du pilknappene inne. Gli mellom pilene eller bruk to fingre for diagonal styring.
3. Unngå trafikken og samle power-ups: skjold beskytter mens effekten er aktiv, fart gir økt hastighet, og slow motion sakker ned hindringene.
4. Bruk **Pause**, P, mellomrom eller Escape for å ta en pause. Velg **Fortsett turen** når du er klar. Spillet pauses automatisk når du bytter vindu.
5. Når turen er over, kan du lagre resultatet med navn og velge **Spill igjen**.

Rekorder og lagret navn tilhører denne nettleseren og enheten. Topplisten er lokal, ikke en felles nettbasert rangering.

## Skjermtilpasning

- Hele banen og styreknappene får plass samtidig, uten å bla eller zoome ut.
- På stående mobil ligger styringen under banen. På liggende skjermer og nettbrett ligger den ved siden av.
- Banen beholder det opprinnelige PC-formatet på **800 × 600**. Visningen skaleres med samme proporsjoner. Skjermrotasjon flytter ikke spilleren eller endrer kollisjonskoordinatene.
- Fargene, bevegelsen, hindringene, kollisjonene, poengreglene, beruselseseffektene og power-up-reglene er beholdt.
- Pilknappene støtter flere fingre og slipper styringen ved avbrutt berøring, slipp utenfor knappen eller bytte av vindu.
- Resultatvinduer har egen scrolling når det trengs. Navnefeltet åpner ikke mobiltastaturet før du selv velger det.

**Hjelp**, **innstillinger** og **toppliste** er tilgjengelige mellom rundene og mens spillet er satt på pause. Innstillinger inneholder mørkt tema og nullstilling av lokale spilldata. Fullskjerm vises bare i nettlesere som støtter det. Korte lydeffekter kan slås på i innstillingene og er av som standard. De genereres i nettleseren uten nedlasting av lydfiler.

## Underveis i turen

- Veibanen har asfaltstruktur, kantstein, fortausheller og grønne veikanter. Banestørrelse, felt og kollisjonsområder er bevart.
- Power-ups har tydelige tegnede symboler. En kort melding bekrefter hva du har samlet, og ny personlig rekord markeres underveis.
- En lesbar måler viser tid på veien og påvirkning i simuleringen. Resultatvinduet viser turens tid og antall power-ups.
- Spillklokken kjører med 60 faste simuleringsteg per sekund. Bevegelse, hindringer og varighet på effekter følger samme tempo på skjermer med ulik oppdateringsfrekvens.
- Styringen har en roligere toppfart (6,5 i stedet for 11), gradvis akselerasjon og mykere oppbremsing når du slipper pilene. Diagonal bevegelse er normalisert.
- Beruselsessimuleringen beholder gradvis svekket kontroll, men erstatter tilfeldig skjermglitch, brå zoom, fargeblink og rykkvis bevegelse med roligere, kontinuerlig svai. Dette gjør det enklere å følge veien og oppdage hindringer.
- Farts-power-upen fungerer fortsatt som før og øker den nye grunnfarten midlertidig med 1,8×.
- En ny pickup av samme type fornyer varigheten. Farts- og slow-motion-effekter blir riktig fjernet når tiden er ute, og en ny tur starter med grunnfarten.

## Kjør lokalt

Spillet bruker HTML, CSS og vanlig JavaScript. Ingen byggetrinn eller serverlogikk er nødvendig.

```sh
python3 -m http.server 8000
```

Åpne `http://localhost:8000`.

## Kontroller endringer

Med Node.js 20 eller nyere:

```sh
npm ci
npx playwright install chromium
npm run check
npm test
```

Testene bruker Chromium til å sjekke 15 skjermstørrelser fra 320 × 568 til 1920 × 1080, flerberøring, tastatur, rotasjon, navnelagring, tema og nullstilling. Testene kontrollerer også pause, lik simulering på 30–144 Hz, power-up-fornying, lydvalg og håndtering av ødelagte lokale rekorder. Klokken testes separat på opptil 240 Hz. En egen kontroll sammenligner kollisjonsområder, progresjon og power-up-verdier med en tidligere versjon. Styringen har egne tester for akselerasjon, bremsing og diagonal fart. Git-historikken må være tilgjengelig for denne kontrollen.

Du kan bruke en eksisterende Chromium-installasjon ved å sette `CHROMIUM_EXECUTABLE_PATH` til nettleserens programfil.

## Filer

- `index.html` – spillflate, kontroller og menyer
- `styles.css` – utforming og skjermtilpasning
- `interface.js` – visningsstørrelse, fullskjerm, menyer og fokus
- `game.js` – spillmotor, runder, pause, power-ups og inndata
- `loop.js` – fast spillklokke
- `scene.js` – tegning av vei og pickups
- `experience.js` – tilbakemeldinger, målere og valgfrie lydeffekter
- `tests/responsive.test.cjs` – nettlesertester og kontroll av bevarte grunnverdier
- `tests/clock.test.cjs` – kontroll av spillklokken
- `docs/previews/` – skjermbilder av oppsettet
