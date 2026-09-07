# Checkride

Aircraft checklists for Microsoft Flight Simulator, on Android and iOS phones and tablets.

Every default aircraft in the sim gets the same treatment a real crew gets: challenge-and-response
checklists broken into the phases you actually fly them in, reference speeds, type data, and the
non-normal procedures kept separate so you never run one by accident.

> **Simulator use only.** These are not approved procedures and must never be used to operate a
> real aircraft. Not affiliated with Microsoft, Asobo Studio, or any aircraft manufacturer.

## Running it

```bash
npm install
npm start          # then scan the QR code with Expo Go, or press a / i / w
```

| command | what it does |
| --- | --- |
| `npm start` | Expo dev server for phones and tablets |
| `npm run android` | open on a connected Android device or emulator |
| `npm run ios` | open on an iOS simulator (macOS only) |
| `npm run web` | run in a browser, handy for quick layout checks |
| `npm run typecheck` | TypeScript, no emit |

Building installable binaries uses EAS:

```bash
npx eas build -p android --profile preview
npx eas build -p ios --profile preview
```

## What is in the app

- **Fleet browser** with search across name, manufacturer, ICAO type code, avionics and tags, plus
  filters for sim version, aircraft category and favourites.
- **Aircraft page** listing every checklist with its own progress, alongside reference speeds, type
  data and notes about how the aircraft behaves in the sim. Tablets get a two-pane layout.
- **Checklist runner** with a dotted-leader layout that reads like a printed checklist, tap to tick,
  progress that survives closing the app, auto-scroll to the next open item, haptics, and a
  screen-on lock so the tablet does not sleep mid-flow.
- **Three themes**: cockpit dark, a red-on-black night mode that protects dark adaptation, and a
  day mode for bright rooms. Four text sizes for tablets clamped to a yoke mount.

## Adding an aircraft

1. Write a data file under `src/data/aircraft/`, exporting an `Aircraft` (see `src/data/types.ts`
   for the shape and what each field means).
2. Import it in `src/data/index.ts` and add it to the `AIRCRAFT` array.

That is the whole job. Every screen is driven off that array, so the new type appears in search,
the category groups, the filters and the progress tracking with no further wiring.

Checklist items are deliberately terse:

```ts
{ c: 'FUEL SELECTOR', r: 'BOTH', note: 'Left and right feed together' }
```

`c` is the challenge, `r` is the response, and the optional `note`, `warn` and `cond` fields add
guidance, a caution, and a conditional prefix respectively.

## Layout

```
app/                     expo-router routes
  _layout.tsx            providers, themed navigator, first-run disclaimer
  index.tsx              fleet browser
  aircraft/[id]/         aircraft page and the checklist runner
  settings.tsx
src/
  data/                  aircraft dataset and the types behind it
  components/            layout primitives, cards, the checklist row
  state/                 settings and progress, persisted to AsyncStorage
  theme/                 palettes and phase colours
```
