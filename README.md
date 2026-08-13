# Glimmerglen

A small, self-contained fantasy town builder for the browser. Guide an enchanted
vale through three story chapters by balancing food, folk, craft, magic, joy,
and renown.

## What is playable

- A 12 × 8 building map with protected forests, crags, and a pond
- Nine building types with terrain, road, well, shrine, and rank synergies
- Four seasons, recurring story visitors, town requests, and a Bloom Rite
- Three progression chapters, persistent achievements, score, and town rank
- Town charters that specialize the settlement for harmony, harvest, or magic
- Automatic local saving plus downloadable and restorable chronicle copies
- Desktop, tablet, and mobile layouts with keyboard and reduced-motion support

## Controls

- Select a building in the Builder's Folio, then choose an open map tile.
- Click an existing building to inspect and improve it.
- Use `1`–`9` to select buildings, arrow keys to cross the map, `Space` to
  pause, `B` to cast the Bloom Rite, and `Esc` to close panels.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run lint
npm test
```

`npm test` creates a production build and runs the game-logic, rendering,
accessibility, and responsive-layout checks.
