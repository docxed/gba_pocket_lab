# Project instructions

1. Read [context.md](context.md) and, if present, the local `CODEX_HANDOFF.md` before editing. Check Git status and continue the existing implementation.
2. Keep the app browser-local and compatible with GitHub Pages. Use English in the UI and docs, and Thai in user communication. Keep ROMs and saves off uploads and out of commits and builds.
3. When asked if a ROM can be supported, investigate first. For an approved cheat patch, prefer a **Cheat** option in the normal Start menu. Open the game's existing Debug menu if it can be validated. If a custom action is needed, agree on its effects first.
4. Resolve addresses and item or species IDs from the ROM. Validate bounds, structures, and opcodes. Label scan candidates and keep emulator results distinct from static checks.
5. Run `npm test` and `npm run build`. Add regression coverage for changes and use local ROM fixtures when available. Report actual results and keep README, context, and the app version current.
6. Commit, push, or deploy when requested. Update the handoff when the user asks to prepare for a new chat.

## New ROM workflow

A local ROM path plus a request to analyze it, make a cheat, and add it to the app authorizes analysis and implementation within the agreed scope. A request about feasibility alone starts with read-only analysis.

1. Run `node tools/inspect-rom.mjs "<local ROM path>"`. Use the JSON report for the header, size, SHA-256, known build, and menu, wallet, and item candidates. Trace the normal Start-menu builder, renderer, and action dispatcher from the relevant references. If the local handoff is present, see **Copy-ready instructions for another AI** for the detailed workflow.
2. Prefer **Start > Cheat** backed by the game's validated Debug callback. An explicit Wally Quest fallback authorizes a custom **Start > Cheat** action if no native Debug entry can be validated. Set money to 999,999 within the verified wallet limit, and top up Rare Candy and Master Ball to 99 each when the bag has room. Resolve limits and item IDs from the ROM and use its native wallet and bag routines. Ask before adding custom effects beyond that request. If the custom action cannot be validated, report the blocker.
3. Run `node tools/inspect-rom.mjs "<local ROM path>" --at 0x08XXXXXX` with an aligned candidate address for a short Thumb decode. Use a disassembler when more instructions or context are needed. See `src/lib/soulgold.js`, `src/lib/crest.js`, and `src/lib/unbound.js` for native Debug shortcuts, and `src/lib/wally-quest.js`, `src/lib/theta-emerald.js`, and `src/lib/emerald-cheat.js` for custom actions.
4. Add the supported build and note to `src/data/catalog.sql`, wire up the patcher in `src/App.vue`, and cover the output in `tests/regression.cjs`. Run the tests and build, check the browser output, and verify the action in mGBA on a separate ROM copy when possible.

## Nintendo DS ROM workflow

For a local `.nds` request, use the [NDS workflow in context.md](context.md#nintendo-ds-rom-workflow). The GBA inspector and its 32 MiB input handling are specific to GBA. Keep NDS prototypes as separate local ROM copies until browser integration is requested.
