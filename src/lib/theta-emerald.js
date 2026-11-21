import { patchEmeraldFieldMenu } from './emerald-field-menu.js';

export const thetaEmeraldPatch = {
  source: '6ee6f75e28a4f6f4a1d997d12f3ca97559265e7018850bdd63f8d34695688d3a',
  target: 'd64c7b300a5234117f9524cbea3c608616f88df47112f5bbfc515efcd3ac7604'
};

const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
  byte => byte.toString(16).padStart(2, '0')).join('');

export async function patchThetaEmerald(rom) {
  if (!globalThis.crypto?.subtle) throw Error('Open Poké Lab over HTTPS or localhost to patch the ROM.');
  if (rom.length !== 32 * 1024 * 1024 || await sha256(rom) !== thetaEmeraldPatch.source) {
    throw Error('Choose the supported, unpatched Pokémon Theta Emerald: The Last Dance ROM.');
  }

  const output = patchEmeraldFieldMenu(rom, {
    game: 'Theta Emerald', walletCap: 9999999, moneySetter: '034a1268ac3212684a4002607047'
  });
  if (await sha256(output) !== thetaEmeraldPatch.target) throw Error('Patched ROM checksum mismatch.');
  return { output, verified: true };
}
