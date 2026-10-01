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
| `npm test` | Jest suite over the persistence logic |
| `npm run smoke -- <url>` | checks a deployed build over HTTP |
| `npm run validate:data` | checks the dataset for duplicate ids, empty lists and blank items |
| `npm run build:web` | builds an installable PWA into `dist/`, ready for any static host |

### On a tablet without a PC

`npm start` needs a computer on the same network, so for a tablet on its own the web build is the
way in:

```bash
npm run build:web        # static PWA in dist/
```

Host `dist/` anywhere static (Vercel, Netlify, GitHub Pages, a Raspberry Pi), open the URL on the
tablet, then **Add to Home Screen**. It installs as a standalone app with its own icon, no browser
chrome, and a service worker that keeps it working with the tablet offline.

### Installable native builds

```bash
npx eas build -p android --profile preview   # APK you can sideload
npx eas build -p ios --profile preview       # TestFlight or an ad-hoc build
```

## The fleet

53 aircraft, 621 checklists, over 4,800 items, covering every category the sim flies:

| category | aircraft |
| --- | --- |
| Airliners | A320neo, A321LR, A330-200/-300, BelugaXL, A310-300, 737 MAX 8, 747-8 Intercontinental, 787-10 Dreamliner, 747-400 Supertanker |
| Business jets | Citation CJ4, Citation Longitude |
| Turboprops | TBM 930, 208B Grand Caravan EX, King Air 350i, King Air C90 GTx, 408 SkyCourier, Air Tractor AT-802 |
| Piston twins | Baron G58, DA62 |
| Piston singles | 152, 172 (G1000 and classic), SR22, Bonanza G36, DA40 NG, DA40 TDI, DV20 Katana |
| Light sport | XCub, NXCub, Savage Cub S, Shock Ultra, ICON A5, CTLS, VL-3, Virus SW 121 |
| Aerobatic | Pitts S2S, Extra 330LT, Cap 10 C, 152 Aerobat |
| Helicopters | H125, H225, Bell 407, Cabri G2, R22 Beta II, R44 Raven II |
| Gliders | DG-1001E neo, Discus-2c, LS8-18 |
| Military | F/A-18E Super Hornet, A-10C Thunderbolt II, C-17 Globemaster III, A400M Atlas |
| Vintage | Boeing 247D |

Each one carries its normal procedures in flight order plus its non-normal drills, kept in a
separate section so you never start one by accident. Where a published figure varies by weight,
serial or configuration, the entry says so rather than inventing precision it does not have.

Some checklists are type-specific in ways a generic template would miss: the SR22 fuel selector
having no BOTH position, PT6 hot-start abort criteria, blue line versus red line on the Baron,
per-helicopter autorotation entry speeds, CBSIFTCBE and the cable-break drill for the gliders,
HASELL before aerobatics, and on-speed angle of attack for a carrier approach.

## What is in the app

Laid out like an electronic flight bag: flat rows with hairline rules rather than floating cards,
tabular values in a monospaced face, and small-caps labels above every figure.

- **Fleet browser** with search across name, manufacturer, ICAO type code, avionics and tags, a
  segmented sim-version filter, category tabs, and favourites. Tablets deal the category panels
  into balanced columns.
- **Aircraft page** with a data strip (type code, powerplant, seats, sim), overall progress, then
  every checklist as a numbered row with its own completion state, alongside reference speeds and
  type data as proper right-aligned tables. Two panes on a tablet.
- **Checklist runner** with a dotted-leader layout that reads like a printed checklist, a phase
  tab strip so you can jump between checklists without going back, progress that survives closing
  the app, auto-scroll to the next open item, haptics, and a screen-on lock. On a wide screen the
  items flow into two columns so a whole checklist fits without scrolling, read down one column
  then down the next.
- **Search inside a checklist**, because the airliner lists run past forty items. Matching items
  keep their original numbers so you still know where you are, results collapse to one column, and
  if nothing in the current checklist matches it names the ones that do and takes you there with
  the search intact.
- **Flights, not just ticks.** Start a flight, work the lists in order, and finishing the last one
  offers to clear the aircraft for the next flight, so you never begin pre-ticked.
- **Your own items and notes.** Add checklist items for mod-specific steps or personal flows, and
  keep free-text notes per aircraft. Both are stored on the device against stable ids, so they
  survive updates to the built-in checklists.
- **Beginner mode**, on by default, which adds *where* a control physically sits in the cockpit and
  *why* the step exists, plus a panel-by-panel orientation on the aircraft page. Written only where
  it genuinely helps rather than padding every item, and currently covering the 152 and the 172
  G1000, the two aircraft people actually learn on. Turn it off in Settings for a clean EFB.
- **Backups.** Your own items, notes, favourites and progress export to a file and restore from one.
  All of it otherwise lives in per-origin browser storage that the OS can clear without warning.
- **Three themes**: Slate (dark, cyan accent), Night (red on black, to protect dark adaptation),
  and Day, all meeting WCAG AA for text. Four text sizes for a tablet clamped to a yoke mount.

## Checks

`.github/workflows/ci.yml` runs the typecheck, the dataset validator, the tests and a full web
build on every push. Pushes deploy straight to the host, so anything broken has to fail there
first.

The tests cover the persistence layer, which is the part that fails quietly: saved ticks, user
items and notes, favourites, recents, and the settings file. They run against an in-memory stand-in
for AsyncStorage (`src/test/asyncStorage.ts`) that can be told to fail on demand, because the store
is written to survive a storage layer that does.

A separate `smoke` job then checks the deployed site, because the SPA rewrite, the content types
and the PWA paths are host behaviour that a local build cannot prove. It treats an
authentication-protected deployment as "cannot check" rather than as a failure, and reads the URL
from a `DEPLOY_URL` repository variable so it can be pointed elsewhere without touching the
workflow.

The unit tests' cases are worth knowing about, since each one guards a decision rather than an
implementation detail:

- Ticks on user items are keyed by id, so deleting an earlier item cannot shift the rest onto the
  wrong rows.
- `resetAircraft('cessna-152')` must not touch `cessna-152-aerobat`. Both are real fleet ids and
  one is a prefix of the other.
- A settings file naming a theme that no longer exists still yields a usable palette. The default
  was renamed from `cockpit` to `slate` in the redesign, so older installs have exactly that.
- Corrupt stored JSON, and a storage layer that throws, both leave the app usable.

## Adding an aircraft

1. Write a data file under `src/data/aircraft/`, exporting an `Aircraft` (see `src/data/types.ts`
   for the shape and what each field means). Colour is entirely theme-driven, so there is nothing
   per-aircraft to choose.
2. Import it in `src/data/index.ts` and add it to the `AIRCRAFT` array.

To extend the beginner layer, add `where` and `why` to individual items and an `orientation` array
to the aircraft. Both are optional and hidden unless beginner mode is on, so partial coverage is
fine: write them where they help and leave the rest alone.

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
  theme/                 palettes, type scale and phase colours
```
