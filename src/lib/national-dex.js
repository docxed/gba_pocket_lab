import { patchEmeraldFieldMenu } from './emerald-field-menu.js';

export const nationalDexPatch = {
  sourceSize: 16 * 1024 * 1024,
  builds: [
    { name: 'Standard', source: '8a80807472ab4bc95f1e9e577873866849971cbe3d64b1d86475205b5be29836' },
    { name: 'Lite', source: '6c306f7e4de72f09006da2a76b08e66b8438d3cdcab8b06b9ec9280350821d50' }
  ]
};

const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
  byte => byte.toString(16).padStart(2, '0')).join('');

export async function patchNationalDex(rom) {
  if (!globalThis.crypto?.subtle) throw Error('Open Poké Lab over HTTPS or localhost to patch the ROM.');
  const inputHash = rom.length === nationalDexPatch.sourceSize ? await sha256(rom) : '';
  const build = nationalDexPatch.builds.find(({ source }) => source === inputHash);
  if (!build) {
    throw Error('Choose a supported, unpatched Pokémon Emerald: Complete National Dex Edition ROM (Standard or Lite).');
  }

  const output = patchEmeraldFieldMenu(rom, {
    game: 'Emerald: Complete National Dex Edition',
    walletCap: 999999,
    moneySetter: '034a1268ac3212684a4002607047',
    itemLimit: '00b50004010cbc204000814201d8081c00e0002002bc0847'
  });
  const suffix = build.name === 'Lite' ? ' Lite' : '';
  return { output, verified: true, filename: `Pokemon Emerald Complete National Dex Edition${suffix}-Cheat.gba` };
}
