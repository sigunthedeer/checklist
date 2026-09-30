# Publishing to the App Store and Google Play

Everything in the repo is ready. What is left is account setup, store listings and the
submissions themselves, most of which only you can do.

**You do not need a Mac.** EAS builds both platforms in the cloud.

## Accounts you need first

| | cost | notes |
| --- | --- | --- |
| [Expo](https://expo.dev) | free | runs the builds |
| [Apple Developer Program](https://developer.apple.com/programs/) | $99/year | individual enrolment is fastest; a company account needs a D-U-N-S number and takes longer |
| [Google Play Console](https://play.google.com/console) | $25 once | see the testing requirement below |

### Google Play's 14-day testing rule

Personal developer accounts created since late 2023 cannot publish straight to production. You
must first run a **closed test with at least 12 testers who stay opted in for 14 continuous
days**, then apply for production access. Budget three weeks or more for the Android release, and
start the closed test early. Apple has no equivalent rule.

## Building

```bash
npm install -g eas-cli
eas login
eas init                                   # links the project, writes its id into app.json
```

```bash
eas build -p android --profile preview     # APK you can sideload and test on a device
eas build -p all --profile production      # AAB for Play, IPA for the App Store
```

```bash
eas submit -p android --latest             # uploads to Play Console
eas submit -p ios --latest                 # uploads to App Store Connect
```

`eas.json` sets `appVersionSource: "remote"` with `autoIncrement`, so build numbers look after
themselves. Bump `version` in `app.json` only for releases you want users to see as a new version.

## What the stores will ask for

- **Icon** — 1024×1024, already in `assets/icon.png`, with no alpha channel, which App Store
  Connect rejects.
- **Screenshots** — iPhone 6.7", iPad 12.9", and Android phone plus tablet. Capture them from a
  simulator or a real device. The two-pane tablet layout and the checklist runner show the app
  best.
- **Privacy policy URL** — `https://checklist-rkhv.vercel.app/privacy.html`, already deployed.
  Put your contact address into `public/privacy.html` first; both stores require a working one.
- **Support URL** — the same site is fine.
- **Age rating** — 4+ on Apple, Everyone on Google.
- **App Store privacy labels** — select **Data Not Collected**. That is accurate: nothing leaves
  the device.
- **Android permissions** — the build requests only `INTERNET` and `VIBRATE`. The storage and
  overlay permissions React Native adds by default are blocked in `app.json`, which keeps review
  straightforward.

## Wording the listing

The app identifies real aircraft and a real simulator by name. That is fine for describing what
it is, but keep it to identification:

- Do **not** put "Microsoft Flight Simulator" in the app name or subtitle. Keep the name
  **Checkride** and describe compatibility in the body text.
- Do not use Microsoft, Asobo or aircraft manufacturer logos, artwork or cockpit screenshots.
  Every screenshot should be of this app's own interface.
- Keep the "not affiliated" line and the simulator-use-only warning in the description.

### A description you can start from

> Checkride is a checklist reference for flight simulator pilots, laid out the way real
> challenge-and-response checklists read.
>
> 46 aircraft. 519 checklists. Every one broken into the phases you actually fly, from cockpit
> preparation through to shutdown, with the non-normal and emergency drills kept separate so you
> never start one by accident.
>
> • Search by name, type code or avionics
> • Reference speeds and type data for every aircraft
> • Step-by-step flight management guides, key by key, for the airliner, business jet and GPS avionics
> • Practice trainers for the Airbus MCDU, the Boeing CDU and the CJ4 FMS: press the real keys through a whole setup, with feedback on every press
> • Progress that survives closing the app, and a new-flight reset when you are done
> • Add your own items and notes for the aircraft you fly
> • Beginner mode explains what each control is and where to find it
> • Two-column layout on tablets, so a whole checklist fits on screen
> • Works offline, with a red night mode for flying after dark
>
> Simulator use only. These are not approved procedures and must never be used to operate a real
> aircraft. Not affiliated with, endorsed by, or connected to Microsoft, Asobo Studio, or any
> aircraft manufacturer.

## Before you submit

```bash
npm run typecheck && npm run validate:data && npm test && npm run build:web
```

CI runs all of that on every push, plus a smoke test against the live site.
