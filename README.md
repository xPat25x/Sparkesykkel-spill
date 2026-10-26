# Deathtrip – Sparkesykkel

Et spill om trafikksikkerhet fra Deathtrip-kampanjen og Ung i trafikken. Unngå biler, syklister og fotgjengere, samle power-ups og prøv å slå din egen rekord. Spillet simulerer hvordan alkohol svekker synet og kontrollen. Kjør alltid edru i virkeligheten.

**[Åpne spillet](https://xpat25x.github.io/Sparkesykkel-spill/)**

## Slik spiller du

1. Trykk på **Start spill** eller Enter.
2. Styr med piltastene eller WASD på PC/Mac. På en berøringsskjerm holder du pilknappene inne. Gli mellom pilene eller bruk to fingre for diagonal styring.
3. Unngå trafikken og samle power-ups: skjold beskytter mot en kollisjon, fart gir økt hastighet, og slow motion sakker ned hindringene.
4. Når turen er over, kan du lagre resultatet med navn og velge **Spill igjen**.

Rekorder og lagret navn tilhører denne nettleseren og enheten. Topplisten er lokal, ikke en felles nettbasert rangering.

## Skjermtilpasning

- Hele banen og styreknappene får plass samtidig, uten å bla eller zoome ut.
- På stående mobil ligger styringen under banen. På liggende skjermer og nettbrett ligger den ved siden av.
- Banen beholder det opprinnelige PC-formatet på **800 × 600**. Visningen skaleres med samme proporsjoner. Skjermrotasjon flytter ikke spilleren eller endrer kollisjonskoordinatene.
- Fargene, bevegelsen, hindringene, kollisjonene, poengreglene, beruselseseffektene og power-up-reglene er beholdt.
- Pilknappene støtter flere fingre og slipper styringen ved avbrutt berøring, slipp utenfor knappen eller bytte av vindu.
- Resultatvinduer har egen scrolling når det trengs. Navnefeltet åpner ikke mobiltastaturet før du selv velger det.

**Hjelp**, **innstillinger** og **toppliste** er tilgjengelige mellom rundene. Innstillinger inneholder mørkt tema og nullstilling av lokale spilldata. Fullskjerm vises bare i nettlesere som støtter det. Lyd er fortsatt under utvikling og er deaktivert.

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

Testene bruker Chromium til å sjekke 15 skjermstørrelser fra 320 × 568 til 1920 × 1080, flerberøring, tastatur, rotasjon, navnelagring, tema og nullstilling. En egen kontroll sammenligner den sentrale spillogikken med originalversjonen. Git-historikken må være tilgjengelig for denne kontrollen.

Du kan bruke en eksisterende Chromium-installasjon ved å sette `CHROMIUM_EXECUTABLE_PATH` til nettleserens programfil.

## Filer

- `index.html` – spillflate, kontroller og menyer
- `styles.css` – utforming og skjermtilpasning
- `interface.js` – visningsstørrelse, fullskjerm, menyer og fokus
- `game.js` – eksisterende spillmotor, tegning og inndata
- `tests/responsive.test.cjs` – nettlesertester og kontroll av bevart spillogikk
- `docs/previews/` – skjermbilder av oppsettet
