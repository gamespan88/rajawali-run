[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/gamespan88/rajawali-run/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/gamespan88/rajawali-run/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

# RAJAWALI WINGS — Archipelago Air Race

A real 3D flight game over a volcanic archipelago. Pick an airframe in
the hangar, fly a tactical sortie through glowing gold gates, then
grease the landing on the coastal runway while the PAPI lights judge
your glide. Three airframes (amphibian prop, tactical jet with
afterburner, utility turboprop), three sorties, four skies — one
analytic height field drives the terrain mesh, the ground collision
and the sector map, so what you see is exactly what you can hit.

## What the screenshots show

- **Hangar** — the front end over the live airfield: three aircraft
  cards with real performance figures, three tactical sorties, four
  sky-lighting chips, a flight-manual card, and the RAJAWALI-07 parked
  on RWY 09 behind the glass.
- **Chase view** — the seaplane in frame, banked for gate 03 with the
  volcano island ahead; the full telemetry suite in dark teal glass:
  compass tape with target caret, mission panel with gates and points,
  airspeed / altitude boxes, attitude ball, V/S dial, segmented
  FUEL / THROTTLE / AIRFRAME bars, and a sector minimap with wind.
- **Cockpit view** — on final through the carved approach valley: HUD
  glass with pitch ladder and localizer / glideslope diamonds, three
  lit MFDs (tactical nav radar, PFD, fuel / systems with annunciator
  chips), the runway ahead with sequencing approach lights and PAPI.
- **Sortie complete** — grade medal and stars over the parked aircraft:
  time, gates, max combo, landing grade, sink rate, centreline, fuel
  remaining, and the full points breakdown.

## How it plays

- **W / S** throttle · **↑ ↓** pitch · **← →** bank · **A / D** rudder
- **C** chase / cockpit camera · **G** landing gear · **F** flaps
- **P** pause · **R** retry · **M** hangar · click the hangar cards
- Gates pay more in a combo streak; the landing is rated
  PERFECT / SMOOTH / FIRM / HARD by sink rate and centreline, with
  fuel and time bonuses. Gear up, too hard, off the runway or into
  the terrain ends the sortie. Fuel burns with throttle — run dry
  and you glide it in.

## How it is built

Static files under `game/`, rendered with three.js (vendored) over a
hand-built low-poly world: one height field generates the island
terrain mesh with vertex-coloured beaches, jungle, rock and ash,
fifteen hundred instanced trees, scattered boulders, four villages,
sailboats on the water, parked aircraft by the hangar, a smoking volcano, a lighthouse
with a rotating beam, and a full airfield — runway numbers, sequenced
approach lights, PAPI units that answer your glide in real time.
Aircraft are modelled from primitives with canvas-painted liveries,
spinning props and throttle-driven afterburners. All sound is
synthesised WebAudio. Source is split by job: `world3d.js` (world,
runway, sorties), `plane.js` (the three airframes), `hud.js`
(telemetry + cockpit), `screens.js` (hangar, results), `main.js`
(flight model, gates, landings), `input.js`, `audio.js`. Staged
screenshot scenes ride on `?shot=` parameters in `main.js`.
`main.ts` hands the game in and writes the dossier.

Built by an AI agent for make.fun's "Make the best flight game"
bounty, $500 in USDC.
