# Poké Lab v0.50

Poké Lab is a browser-based tool for enabling in-game cheat menus in supported GBA Pokémon ROM hacks. It also includes tools for money cheats, shop cheats, and item lookup.

In Patcher, type a game name or build version into the Game selector to narrow the list.
Use a `.gba` file already patched to one of the ROM hack versions shown under the selector.
The patcher checks the file contents and accepts ROM dumps with uniform padding after the cartridge data.
The looping 8-bit-style header logo features a Master Ball, Rare Candy, and gold coins. Reduced motion keeps it still.
The Lance banner keeps the original artwork in place while six waves of item sprites and aura effects loop around it.
Use the theme button in the header to switch between light and dark mode.
Use the page language flags in Patcher to switch the main controls, cheat notes, and feedback between English and Thai.

To patch SoulGold MegaXtream vTH.1.1.4-4, select **Pokémon SoulGold MegaXtream**, load your local `.gba` file, and choose **Patch & download**. Open the downloaded ROM and choose **Start > Cheat**.

For Pokémon Unbound, patch English v2.1.1.1 or TH Nonplae 2.0 and choose **Start > Cheat** while in the field. The patcher also accepts ROMs from the earlier R-button patch.

In Pokémon Theta Emerald: The Last Dance, choose **Start > Cheat** to fill your wallet and top up Rare Candies and Master Balls.

In Pokémon Generation 3 Evolved v1.0.26, the patcher adds **Start > Cheat** after the player card and opens the game's Debug menu. The user confirmed that Start > Cheat opens successfully in an emulator.

The Pokémon Emerald: Complete National Dex Edition catalog entry includes a short game description and a project-page link in English and Thai.

In Pokémon Emerald: Complete National Dex Edition (Standard or Lite), **Start > Cheat** sets money to 999,999 and tops up Rare Candies and Master Balls to 99 each when the bag has room. Both builds pass static checks. The user confirmed that Start > Cheat works in an emulator.

In Pokémon Heart & Soul Legends M9.8, **Start > Cheat** appears before **Exit** in the normal field menu and opens the game’s Debug menu. The supplied ROM passed static checks. The user confirmed that Start > Cheat works in mGBA.

For local ROM analysis, run `node tools/inspect-rom.mjs "<local ROM path>"` and follow the [new ROM workflow](AGENTS.md#new-rom-workflow).

## Support

Use [Support this project](https://easydonate.app/docxed) in the app footer to donate and include feedback with your donation.
The link label and its description follow the Patcher language setting.
