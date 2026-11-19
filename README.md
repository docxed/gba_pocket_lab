# Poké Lab v0.26

A browser-local GBA patcher by Psykedelik. The primary tool adds **Cheat** to the normal Start menu in Pokémon SoulGold while retaining **Docs**. **Misc** contains Money, Shop Cheats and Item Database.

## Run locally

Use Node.js 20.19 or later in the 20.x line, or Node.js 22.12 or later.

```sh
npm ci
npm run dev
```

Choose or drop an unpatched SoulGold `.gba` file, then click **Patch & download**. Open the separate `-Cheat.gba` file and choose **Start > Cheat** in game. Supported and emulator-tested builds are English **1.2.1** and **TH Nonplae 1.2**. Other input builds must pass the existing structural checks and are labeled as untested. ROMs and RAM dumps stay on the device.

Share the URL to open a specific game directly. For example, `?rom=soulgold` selects Pokémon SoulGold. The URL includes only the game ID. An unknown ID falls back to the first available game.

## Source layout

- `src/App.vue` is the Vue interface. Vuetify supplies controls, Tailwind supplies layout utilities, and Noto Sans is bundled.
- `src/lib/soulgold.js` applies the existing ROM patch.
- `src/data/catalog.sql` defines the game catalog. SQLite runs in the browser via sql.js and stores catalog metadata.
- `misc.html` is the existing tool surface embedded in the Misc tab. Its optional CDN assets and reference sprites may make external requests.

## Build and test

```sh
npm test
npm run build
npm run preview
```

Publish the contents of `dist/` on a static host such as GitHub Pages. The build uses relative asset paths for project subdirectories. Pass both local SoulGold ROM paths to `node tests/regression.cjs` to verify their output hashes.

## GitHub Pages

Set **Settings > Pages > Source** to **GitHub Actions**. The workflow in `.github/workflows/deploy.yml` runs the tests, builds the app, and deploys `dist/` on pushes to `main`. It can also be run manually from **Actions**.

## Release history

Earlier releases documented below included features that were removed in v0.21.

## v0.20 — ROM Validation Update

- Species discovery checks record bounds and padding, decodes gender symbols, and can resume after a run of up to 32 padded `?` placeholders when four valid names follow. IDs remain tied to their ROM record positions.
- Classic wild headers accept byte-sized group and map IDs through 254. Map discovery samples multiple IDs in small groups, validates optional pointers, uses ROM pointer references to resolve tied group tables, and withholds unresolved links and ambiguous name labels. Independent header candidates keep their address-based labels.
- Money detection validates the supported Thumb caller's register and branch layout and checks that its getter and setter use the same ROM-derived key expression. Inline XOR candidates require an in-bounds RAM-address literal. Plain wallet, price and fixed amount modes remain available.
- Pokédex scanning shows progress and accepts cancellation between stages. A slower file read cannot replace a newer ROM selection. Individual scan stages still run synchronously.

### v0.20 validation

Run `node tests/regression.cjs` and `node tests/money.cjs`. You can pass paths to local ROMs to `tests/money.cjs` for static inspection. The suites pass 29 synthetic assertions and cover padded species gaps, classic slots, map bounds and aliases, and Thumb wallet flow and patch generation.

The local 11-ROM check recovered one static money candidate per ROM. FireRed increased from 249 to 387 named species candidates, Anime Version from 250 to 1,160, and Radical Red 4.1 from 249 to 1,348. Radical Red also returned 1,651 classic wild slots where the previous version returned zero. Rocket Edition returned 130 encounter-linked map candidates and one independent header after resolving a shifted group table. Counts describe detected data and may include forms or other provisional records. See `context.md` for profile gaps and remaining work.

A headless Brave session at 390 CSS pixels exercised local ROM loading, Pokédex scanning, location selection, cancellation and a file-read race. CDN assets and reference sprites were out of scope. Cheat behavior and map graphics still need emulator verification.

# v0.19 — Money Analysis Update

Adds a register-validated plain wallet leaf signature (unsigned compare, zero fallback, subtract, store, return), preserving existing XOR paths. Manual/debugger entry also supports the new leaf. Static money scan yields periodically, displays progress, supports cancellation and discards results on ROM change. Purchase add patches for the plain leaf bypass insufficient-funds branching; fixed amounts must fit validated MOV/LSL encoding. All patches remain experimental; no emulator or browser verification.

Real ROM static scan: Crest v1.0.F: 1 getter/setter candidate; Quetzal Alpha 9v1: 1 getter/setter candidate; Anime Version v2.0.5: 1 plain candidate (0813A410, store 0813A41A). No game-specific addresses are used in the scanner. Run `node tests/regression.cjs` and `node tests/money.cjs` (optional local ROM paths). Other analyzer systems unchanged.

## v0.13 — ROM Explorer Edition

A lightweight, browser-based GBA ROM exploration and cheat utility. Built on v0.12, with no emulator or backend required. ROM and RAM files are read locally; they are not uploaded by the application.

### Historical quick start

1. Extract the ZIP and open `index.html` in a modern browser, or serve it over HTTPS.
2. Select a `.gba` ROM (up to 32 MiB). RAM Finder also works without a ROM.
3. Choose Money Cheat, Buy Any Item, Item Database or Pokédex.
4. Use browser translation if you prefer another language.
5. Back up the in-game save before testing any candidate cheat. Enable one candidate at a time.

## Money Cheat

### Persistent (recommended)

Load ROM → Scan ROM (no debugger) → Show candidate cheats. The scanner looks for supported Thumb subtraction flows, including inline XOR and getter/setter callers. No fixed game addresses are used for detection. A candidate is not proof of a money function.

Purchase Add Money defaults to **Purchase price**. Choose **Fixed amount** to add a fixed value per subtraction call. The generator uses available Thumb instruction slots without injecting a code cave. Small immediates may fit a single patch; larger values require an exact `n << shift` representation (`1 ≤ n ≤ 255`). Examples: 1,000; 10,240; 51,200; 102,400. Unsupported values are explicitly rejected. Multi-patch fixed mode replaces the internal comparison/branch and may bypass an insufficient-funds check; the shop's external check can still apply. Balance caps and other callers are not guaranteed. Prefer VBA for multi-patch testing. Never combine Infinite Money and Purchase Add Money.

### RAM Finder

In mGBA: Tools → Memory Viewer → Save memory range. Bank -1; start 0x02000000; byte count 0x40000; uncheck Dump across banks. Save before.bin, buy an item, record the balance and save after.bin. For IWRAM use 0x03000000 and 0x8000. Enter both exact displayed balances and target. Scan, then refine with a third dump if needed. XOR codes can depend on current session address/key.

Debugger fallback remains optional. If watchpoint or breakpoint crashes mGBA, stop and use static analysis. Copy commands only after checking the ROM/RAM address.

## Buy Any Item / Item Database

Load ROM → Auto find shops → select shop and item → Generate cheat. Test a single shop first. Item Database supports search and online reference item sprites. If automatic detection fails, use a known table layout or shop stock sequence; the tool does not invent unknown addresses.

Cheat format defaults to GameShark RAW (Unencrypted); VBA, GameShark encrypted and Action Replay are available as before. Conversion is inherited and not validated on all engines; a ROM patch is not a generic CodeBreaker RAM write. Hardware patch slots and emulator support vary.

## Pokédex (experimental)

Load ROM → Pokédex → Scan Pokédex → search by name, decimal ID or hex ID → select a species. The detector finds ordered starter names with a consistent record stride. For a supported expanded 264-byte layout, it also reads candidate base stats, numeric type/ability IDs and catch rate. Internal species IDs include possible forms and placeholders and are not National Dex numbers. Reference normal/shiny sprites are requested by name from PokeAPI when a species is selected; they are not ROM graphics. Unrecognized names may have no image.

**Scan Pokédex** also searches for a structurally valid classic Gen III wild header table and slots. If a compatible table is found, the result shows map group:number, encounter method, level range and standard slot weights (not verified overall encounter probabilities). The location filter accepts group:number. Map names, gifts, events, evolution methods, learnsets and custom encounter layouts are not decoded yet. No match does not mean a species is unobtainable.

## Deployment

Upload `index.html`, `README.md` and `context.md` to a GitHub repository. Settings → Pages → Deploy from a branch → select main / root. No build step. Bootstrap 5 and Tom Select are optional CDN enhancements; without them the local stylesheet and native controls remain. Online sprites need internet and send the requested item/species names to the external provider, not the ROM bytes. Mobile UI has responsive grids, touch targets and horizontally scrollable tables.

## Validation and limitations

- Node: actual Generation 3 Evolved v1.0.24 ROM yielded 1,568 species-name candidates, stride 264, first name at 087CAC9C. Bulbasaur stats 45/49/49/45/65/65 and catch rate 45 were read from ROM.
- Classic wild table scan returned zero supported slots on that ROM; custom encounters and map names remain unresolved.
- Static money scan returned one candidate at 08194230. Fixed +1,000 emitted VBA patches 0819423C:21FA, 0819423E:0089, 08194240:1859. These were not tested in an emulator.
- Chromium 390px viewport smoke test (HTML injected, network blocked): ROM load, Dex scan, first species details, Thai switch and static money candidate display worked without page errors or page-level horizontal overflow. CDN/sprites, real mobile devices and cheat runtime compatibility not tested. Existing RAM/shop code retained, not fully regression-tested.

No ROM or copyrighted game assets are bundled. PokeAPI reference sprites are external; Pokémon belongs to its respective rights holders.

## v0.14 — One-click Pokédex and locations

Open `index.html`, load a GBA ROM, open Pokédex and press **Scan Pokédex** once. Species, conventional wild encounter headers, linked map layouts and location-name candidates are scanned locally. Select a location to reverse-search encounters, or click a location in a species detail. The layout preview colors metatile IDs; the optional experimental Emerald-style tileset preview decodes 4bpp graphics and LZ77 but can render incorrectly on modified engines. Encounter weights assume standard Gen III slots, not absolute encounter probabilities. Fishing slots are split by rod. Names and IDs are candidates, not verified against gameplay. No result does not mean a Pokémon is unobtainable. Gifts, scripts, evolution and learnsets are not decoded.

English-only UI; use the browser's built-in page translation if desired. No translation API or key. External reference sprites remain optional. Existing cheat features are retained. No ROMs are shipped.

The independent detector validates header/layout and tileset pointer shapes; false positives remain possible. Names require English encoded seed strings and a plausible pointer table. Rendering, browser interactions and cheats were not emulator/browser-tested for this release. No ROMs distributed. See LICENSE and THIRD_PARTY_NOTICES.md. Design inspiration: savDex and CalicoDex; no source or assets copied from those sites.

## v0.16 — Detection & Validation Edition

The historical sections above describe earlier releases. Current UI is English-only. Open index.html, load a ROM and press Scan Pokédex. The scan labels the species layout candidate, cross-checks classic wild slots against detected species IDs (80% minimum coverage when species candidates exist), and merges encounter-linked and independent map headers by address. Map details identify the candidate source and section; location names remain unverified. Base stat total is shown when the expanded stats profile is detected. A truncated map layout is rejected before reading its fields.

Run `node tests/regression.cjs` for five synthetic assertions. No ROMs were supplied for this release; real-ROM compatibility, browser responsiveness and emulator behavior remain untested. The species coverage rule may reject valid tables when species detection is incomplete. Custom encounter layouts, name decoding, worker/cancellation, evolutions and learnsets remain future work. Existing cheat code is unchanged. Deploy the application files to GitHub Pages as before; tests are optional for deployment.


## v0.17 — Item & Shop Update
Added anchor-validated inline explicit-ID and padded indexed-name tables; legacy detection retained. No per-ROM addresses used. Static tests: Crest v1.0.F: 580 items, 24 shop candidates; Quetzal Alpha 9v1: 631 provisional indexed items, 32 shop candidates. Indexed IDs and shop script matches are not runtime verified. Price unavailable for indexed names. Test one shop before using patches; all-shop patches require confirmation. No ROM files distributed.


## v0.18 — Indexed Item Records

Adds a candidate scanner for index-based item records with inline names, description pointers at +24 and price at +18, validated by ordered ball names and a table-base reference. No game-specific ROM addresses. Undecodable names are omitted without shifting IDs. Real-ROM static checks: Anime Version v2.0.5: 360 named item candidates, 54 shop candidates; Crest: 580/24; Quetzal: 631/32. Anime Master Ball 0x0001, Rare Candy 0x0044. IDs inferred from record order; emulator and browser tests not performed. Shop results remain heuristic.
