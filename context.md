# Project context — Poké Lab v0.47

The static app uses Vue, Vite, Vuetify, and Tailwind. Patcher and Misc share Noto Sans Thai Looped as the first choice for UI text, with system fallbacks for missing glyphs. Project communication uses Thai, and source documentation is in English.

## Current architecture

- The root Vite entry renders the ROM Patcher. The local SQL catalog provides game and build labels, cover images, menu paths, and per-game patch notes through SQLite (sql.js). The Complete National Dex Edition entry also shows a description and project link below the game selector.
- The header logo animates a CSS Master Ball, Rare Candy sprites, gold coins, and a purple burst in a continuous 8-bit-style loop. Reduced motion displays a static arrangement. The favicon uses a static Lance portrait.
- The Patcher hero layers six waves of Master Balls, Rare Candies, and gold coins over the original Lance artwork on a 5.6-second loop. A mask keeps the center clear and reduced motion hides the overlay.
- A decorative shower of Rare Candy, Master Ball, and Relic Gold sprites plays over the interactive page for 1.8 seconds on each page load. The sprites are bundled locally, and the animation is skipped when reduced motion is enabled.
- The `rom` query parameter follows the game selector and works with browser navigation. A change of game clears the selected file. The Misc view continues to use the URL fragment.
- The Game selector uses Vuetify autocomplete to filter catalog names and build labels. Search ignores case and accents. The list shows cover art, supported builds, and the current selection.
- The hint under the supported builds tells users to choose a ROM already patched to the selected hack version. The file chooser references the same hint for assistive technology.
- Patcher accepts any filename, trims uniform trailing zero or FF padding beyond the cartridge window (or the known Crest or Complete National Dex Edition input length), and still validates the selected game's ROM. Misc scans the first 32 MiB of larger files and reports when it does so.
- Patcher and Misc share a light/dark preference. The default follows the system setting. The header toggle saves a preference locally and updates the mounted Misc iframe in place.
- Patcher offers English and Thai for game search, ROM selection, the download action, cheat notes, and status messages. It uses the browser's primary language initially and saves the EN/TH selection locally. Game names, build labels, menu paths, technical errors, and Misc use their source wording.
- The SoulGold module validates the header, Thumb instructions, branches and menu tables. It resolves the Start-menu action table and checks the callback before selecting a layout, since TH Nonplae and MegaXtream share an Emerald header. It checks output hashes for English v1.2.1, TH Nonplae 1.2, and MegaXtream vTH.1.1.4-4. Other structural matches are labeled as untested in an emulator.
- MegaXtream vTH.1.1.4-4 has its own Patcher entry and cover. A fresh game in the mGBA Libretro core (0.11-212-7a12d6d) verified `Start > Cheat`, the Utilities submenu, returning to Start, and opening the existing Docs screen. Using `Give X > Max Money` raised the Trainer Card balance from 3,000 to 9,999,999. A local Edge check confirmed the catalog entry, cover, and download hash.
- The Emerald Crest v1.0.F patch matches an exact input hash, follows Start-menu action pointers and validates Thumb instructions. It adds CHEAT to the right menu page and calls the original icon cleanup before opening Debug. The output hash matches the ROM tested in mGBA.
- The Pokémon Unbound patch accepts exact hashes for English v2.1.1.1 and TH Nonplae 2.0 and the earlier R-button outputs. It appends Cheat after the stock Start-menu sort when Game Settings is available and there is room. The new callback closes the Start UI and launches the native debug script without fading the field. The optional R-button shortcut is still available. The mGBA Libretro core (0.11-212-7a12d6d) opened Cheat and reopened Start in both languages. Max Coinage increased the wallet in the English build.
- Theta Emerald: The Last Dance (Completo) adds Cheat to the normal Start menu for the verified input hash. It locates the wallet and bag routines and derives item IDs from the ROM records. The menu reserves a slot for Cheat when the original eight slots are full. A fresh game in the mGBA Libretro core (0.11-212-7a12d6d) showed 9,999,999 on the Trainer Card and 99 Rare Candies and 99 Master Balls in the Bag. A second use kept both item quantities at 99.
- Generation 3 Evolved v1.0.26 uses Start > Cheat to open the game's Debug menu. The patch matches the exact 32 MiB FireRed input, adds action 12 after the player card on the normal field path, and calls the native Debug opener after the original DEBUG window cleanup. The output SHA-256 is `30c622e5170bbdc196270be0a20083a2dfc5915f29828b9302da0e2680a453df`. The updated callback replaces the leftover Thumb BL halfword before the return sequence with a NOP. The final output has static fixture coverage, and the user confirmed that Start > Cheat opens successfully in an emulator.
- Wally Quest v1.1 adds MAX CHEATS for the verified build. The patch derives both item IDs from the ROM and uses its original wallet and bag functions. It sets money to 999,999 and tops up Rare Candies and Master Balls to 99 each, subject to bag capacity. mGBA verified the resulting balances and quantities and that using the action again did not add duplicates. The normal Start menu fits nine entries and omits EXIT when the original entries fill every slot.
- Pokémon Emerald: Complete National Dex Edition (Standard and Lite) accepts the exact 16 MiB builds. Static analysis traced the normal Start builder (`0x0809F4CC`), renderer and dispatcher to the same action table in both builds. No native Debug entry was validated. **Start > Cheat** uses the native wallet setter and bag functions with the verified 999,999 cap and ROM-resolved item IDs (Master Ball 1 and Rare Candy 68). Both outputs have static fixture coverage. The user confirmed that Start > Cheat works in an emulator.
- Vite builds `misc.html` as a second entry. The Vue shell loads it when a user opens Misc and keeps it mounted when switching tabs. This preserves the existing tools and their state.
- ROMs, RAM dumps, and pasted debugger logs stay in browser memory. The patcher produces a separate download and never opens emulator saves. The app has no upload endpoint or persistent tool storage.
- Misc requests Bootstrap and Tom Select from jsDelivr. Reference item icons are on by default and request sprites by item name from GitHub. Users can turn them off in the Item Database. Both HTML entries set `no-referrer`.
- Serve `dist/` as a static site. GitHub Pages project subdirectories are supported through relative asset URLs. Git ignores ROMs, dumps, and common save formats.

## Development and deployment

Start local ROM investigations with `node tools/inspect-rom.mjs "<local ROM path>"`. The read-only CLI reports build identity and a bounded selection of menu, money, and item candidates as JSON. It hashes the whole file and scans at most the first 32 MiB. Use `--at 0x08XXXXXX` for up to 12 partially decoded Thumb instructions at an aligned ROM address. Menu reference fields `before` and `after` indicate candidate Thumb targets from the adjacent words. Follow the validation and implementation steps in [AGENTS.md](AGENTS.md).

- Use Node.js 20.19+ in the 20.x line or 22.12+. Run `npm ci` and `npm run dev` for local development.
- Run `npm test` and `npm run build`, then `npm run preview` to check the static build. Pass supported local ROM paths to `node tests/regression.cjs` to verify output hashes.
- Set GitHub Pages source to **GitHub Actions**. The workflow builds and publishes `dist/` when `main` receives a push or the workflow runs manually. After upload, it waits for the Pages artifact ID to appear in the current run before deploying.

## Radical Red 4.1 investigation

Read-only inspection of a local 32 MiB FireRed-based ROM found game-encoded strings for `Woyaopp`, `EZCatch`, `DexAll`, `SO2Toxic`, and `TeamPreview`, each with an aligned ROM pointer reference. The [developer's 4.1 changelog](https://docs.google.com/document/d/1--HIABJp7iekqgFAYEN4To1EGdy8GkBMRT6HD1bTYeE/edit) identifies the bedroom NES as the entry point for `Woyaopp`. The string scan found no matching Cheat or Debug menu label. The existence of a callable Start-menu debug feature remains unverified. Radical Red is outside the current Patcher catalog, and this investigation did not modify the ROM or run it in an emulator.

## Remaining roadmap

1. Validate more SoulGold layouts when local ROM fixtures are available.
2. Confirm more money and shop patches in an emulator.
3. Improve item and shop layout validation with ROM cross-references.

## Historical notes

# v0.19 — Money Analysis Update

Adds a register-validated plain wallet leaf signature (unsigned compare, zero fallback, subtract, store, return), preserving existing XOR paths. Manual/debugger entry also supports the new leaf. Static money scan yields periodically, displays progress, supports cancellation and discards results on ROM change. Purchase add patches for the plain leaf bypass insufficient-funds branching; fixed amounts must fit validated MOV/LSL encoding. All patches remain experimental; no emulator or browser verification.

Real ROM static scan: Crest v1.0.F: 1 getter/setter candidate; Quetzal Alpha 9v1: 1 getter/setter candidate; Anime Version v2.0.5: 1 plain candidate (0813A410, store 0813A41A). No game-specific addresses are used in the scanner. Run `node tests/regression.cjs` and `node tests/money.cjs` (optional local ROM paths). Other analyzer systems unchanged.

## Historical context — Pocket Lab v0.13

## Purpose
A local-first static browser ROM explorer, primarily for Pokémon Gen III ROM hacks. No emulator embedded, no Lua required, no backend. Keep existing RAM/XOR and shop tools. Prefer persistent ROM patches and copy-ready formats, with GameShark RAW default. English/Thai UI, mobile-friendly, GitHub Pages deployment.

## Architecture
Single index.html: HTML/CSS and vanilla JS; optional Bootstrap and Tom Select CDN. ROM stored in Uint8Array `r` and DataView `d`, mapped from 0x08000000. RAM snapshots separate. `code` renders format selector and copy action. `staticCandidates`, `callerAnalysis`, `inspectFunction` implement limited Thumb analysis; no fixed ROM address lookup. `purchasePatches` handles price/fixed amounts. `findDex` anchors a species table using sequential names and stride; expanded 264-byte profile has stats at name offset -44 and ability candidates at stats offset +24/+26/+28. `findEncounters` is classic Gen III structural heuristic. `translations` covers common UI strings; some dynamic text remains English.

## Ground rules
- Never claim a candidate works unless emulator-tested. Distinguish actual ROM bytes, inferred structure, synthetic fixtures and runtime confirmation.
- No fixed game-address hardcoding for discovery. Layout profiles and heuristics are okay if labeled and validated.
- Never map a ROM hack species ID to National Dex blindly. External images are references, not ROM data.
- Preserve existing features and make debugger opt-in; watch/w has crashed for the user immediately.
- Multi-halfword patches have format limits. Verify exact cheat engine encoding before asserting cross-device support.

## Test observations (not detection constants)
Generation 3 Evolved v1.0.24: existing known money function 08194230 with subtraction 08194240 and store 08194244. Static scan reproduced it. Dex candidate name base 087CAC9C, stride 264, 1568 records with readable names including possible forms/placeholders. No classic encounter table detected. A separate earlier debugger example used getter 080E5114, setter 080E5128, subtraction caller 080E518C, SUB 080E51A0, store 080E5132; these are examples, not universal addresses.

## Next priorities
1. Decode custom encounter layout and map group/map name linkage using ROM pointers; report provenance and ambiguity. Add evolution/learnset parsing with layout validation.
2. Expand fixed amount generation only with safe, verified instruction space; avoid guessed code caves. Add runtime tests on mGBA/VBA and verify conversion engines.
3. Complete translation of dynamic diagnostics and test on real mobile browsers; preserve copy/selector behavior and test CDN fallback.
4. Add regression fixtures for classic and expanded ROM layouts without redistributing ROM files.

## v0.14 handoff

Single scan: findDex → findEncounters → scanLocations → renderDex. `detectMaps` finds a candidate group-pointer table by validating headers and dimensions across encounter maps; `detectNames` searches English Gen III-encoded location strings and pointer-table layouts. Unknown names fall back to group:map. `showLocation` provides reverse lookup, rod/method separation and metatile-ID canvas; `graphicPreview` assumes Emerald 512/512 tile and metatile boundaries, six primary palettes, standard 8-entry metatiles and 4bpp/LZ77 graphics. Never treat rendered colors as confirmed game graphics. No ROM-specific fixed offsets are used. Tests in README; three expanded ROMs still lack supported encounter tables. Need inspect expanded wild headers, species info and separate map name tables, and verify in emulator. English only; rely on browser translation. Keep ROM bytes local.

## v0.15 handoff
Explorer-first navigation, local drop zone, responsive split view, credits footer. `detectIndependentMaps` enumerates referenced map headers when encounter-linked discovery fails, validates tileset pointer shapes, labels maps by header address, and passes them to existing name and preview heuristics. Does not infer group/map ID or link encounters to independent headers. See README for four-ROM regression. Next: verify name mapping, improve Quetzal name decoder and custom encounter layouts; test canvas output against emulator screenshots. English only; previous translation notes are historical.

## v0.16 handoff

Incremental validation release: findEncounters ranks classic tables by unique map count, terminator and species coverage, requiring at least 80% coverage if a species candidate table exists. This is a heuristic, not proof; incomplete species detection can cause false negatives. scanLocations merges linked and independent headers, preserving linked IDs and suppressing duplicate independent addresses. mapHeader rejects truncated layouts. Candidate source, section, species profile and BST are displayed. Independent scanning now retains only accepted header addresses in its seen set to bound memory; repeated rejected pointers may increase CPU work. Tests: Node syntax check and five synthetic assertions in tests/regression.cjs passed. No ROMs supplied; no browser/emulator tests. Next: real-ROM calibration of coverage, alternative encounter layouts, independent group-pointer validation, Quetzal names, workers and cancellation. No cheat algorithms changed.


## v0.17 — Item & Shop Update
Added anchor-validated inline explicit-ID and padded indexed-name tables; legacy detection retained. No per-ROM addresses used. Static tests: Crest v1.0.F: 580 items, 24 shop candidates; Quetzal Alpha 9v1: 631 provisional indexed items, 32 shop candidates. Indexed IDs and shop script matches are not runtime verified. Price unavailable for indexed names. Test one shop before using patches; all-shop patches require confirmation. No ROM files distributed.


## v0.18 — Indexed Item Records

Adds a candidate scanner for index-based item records with inline names, description pointers at +24 and price at +18, validated by ordered ball names and a table-base reference. No game-specific ROM addresses. Undecodable names are omitted without shifting IDs. Real-ROM static checks: Anime Version v2.0.5: 360 named item candidates, 54 shop candidates; Crest: 580/24; Quetzal: 631/32. Anime Master Ball 0x0001, Rare Candy 0x0044. IDs inferred from record order; emulator and browser tests not performed. Shop results remain heuristic.
