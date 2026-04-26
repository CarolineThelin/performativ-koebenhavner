# Performativ Københavner App

## Hvad er appen?
En app hvor brugere kan konkurrere om at være den mest performative københavner.
Brugere scorer point ved at logge aktiviteter og dele oplevelser, som er defineret som "typisk københavnsk".
Brugerens samlede antal point beregnes ud fra brugerens aktivitet den seneste måned. Brugerne mister altså point, hvis de ikke kontinuerligt logger aktiviteter.

App'en skal have 4 faner:
Aktivitet (som "startside"): Her kan brugerne se opslag med deres egen, og deres venners seneste aktivitet. Disse opslag kan likes og kommenteres af venner.
Tilføj: Her ser brugeren en liste over prædefinerede aktiviteter, der kan tilføjes (se listen "pointsystem"). Brugeren ser først de overordnede kategorier "mad", "træning/sport" osv. Og man kan ved at klikke på én af disse se en fuld liste over aktiviteter under den valgte kategori. Hvis en aktivitet har tilhørende ekstrapoint, kan disse yderligere klikkes af, når aktiviteten er valgt. 
Performance: Her kan brugeren tilføje venner og se notifikationer, hvis en anden bruger har tilføjet dem som ven. Brugeren kan desuden se et leaderboard over deres venner, hvor scorerne sammenlignes med streger, der er fyldt ud fra venstre til højre. 
Profil: Her kan brugeren se sin samlede score og hvor meget den er steget i den seneste uge.
De kan desuden se deres niveau og hvor langt der er op til næste niveau.
De kan også se hvilke aktiviteter der har bidraget mest til deres samlede score.

## Sprog
- Alt UI-tekst er på DANSK
- Kode, kommentarer og variabelnavne er på ENGELSK
- Claude Code svarer på dansk i denne session

## Tech Stack
- Frontend: React Native med Expo
- Backend: Node.js + Express
- Database: PostgreSQL
- Auth: Supabase
- Design: Figma (se /design/figma-link.md)

## Figma
- Figma fil er linket i /design/figma-link.md
- Eksporterede assets ligger i /assets
- Følg altid Figma designet — lav ikke egne designbeslutninger

## Folder Struktur
/assets
  /icons          → UI ikoner fra Figma
  /images         → Billeder og illustrationer
  /app-icon       → App ikon fra Figma (icon.png, 1024x1024px)
/design
  figma-link.md   → Link til Figma filen
  pointsystem.md  → Pointsystem og niveauer

## App Funktioner (prioriteret)
1. Bruger login / profil
2. Aktivitets-logger (kaffe, løbeture, kulturelle events osv.)
3. Point-system og leaderboard
4. Feed hvor man kan se andres aktiviteter
5. Reaktioner / vurderinger fra andre brugere

## App Ikon
- Ligger i /assets/app-icon/icon.png
- Skal være 1024x1024px PNG
- Expo sætter det op automatisk via app.json

## Kode Regler
- TypeScript strict mode altid
- Komponentnavne på engelsk, tekst-indhold på dansk
- Følg Figma komponentstrukturen når du navngiver komponenter
- Ingen hardcodede farver eller fonts

## Må IKKE
- Lave designbeslutninger uden at tjekke Figma filen
- Hardcode farver eller fonts
- Skrive UI-tekst på engelsk
