# Project instructions

1. Read [context.md](context.md) and, if present, the local `CODEX_HANDOFF.md` before editing. Check Git status and continue the existing implementation.
2. Keep the app browser-local and compatible with GitHub Pages. Use English in the UI and docs, and Thai in user communication. Keep ROMs and saves off uploads and out of commits and builds.
3. When asked if a ROM can be supported, investigate first. For an approved cheat patch, prefer a **Cheat** option in the normal Start menu. Open the game's existing Debug menu if it can be validated. If a custom action is needed, agree on its effects first.
4. Resolve addresses and item or species IDs from the ROM. Validate bounds, structures, and opcodes. Label scan candidates and keep emulator results distinct from static checks.
5. Run `npm test` and `npm run build`. Add regression coverage for changes and use local ROM fixtures when available. Report actual results and keep README, context, and the app version current.
6. Commit, push, or deploy when requested. Update the handoff when the user asks to prepare for a new chat.
