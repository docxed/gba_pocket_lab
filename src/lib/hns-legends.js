import { gbaText } from './emerald-cheat.js';

export const hnsLegendsPatch = {
  source: '30f6d6444ac0db1e624b5736fdd499cc00d77b546a1440e3d2a84236bd18af17',
  target: '0eb5b1e828771827b8adfc490cd1c7546c31726a265338d6452fcc6924aa6e32',
};

const menuTail = 0x2bc980;
const actionTable = 0xe65e88;
const debugId = 13;

async function sha256(bytes) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function patchHnsLegends(rom) {
  if (!globalThis.crypto?.subtle) throw Error('Open Poké Lab over HTTPS or localhost to patch the ROM.');
  if (rom.length !== 32 * 1024 * 1024 || await sha256(rom) !== hnsLegendsPatch.source) {
    throw Error('Choose the supported, unpatched Heart & Soul Legends M9.8 ROM.');
  }

  const view = new DataView(rom.buffer, rom.byteOffset, rom.byteLength);
  const word = offset => view.getUint32(offset, true);
  const debugAction = actionTable + 8 * debugId;
  const label = word(debugAction) - 0x08000000;
  const expectedTail = [0x1cda, 0x0612, 0x0e12, 0x18ba, 0x3304, 0x3220, 0x3101, 0x061b, 0x7011, 0x0e1b, 0xe616];
  if (word(0x2bc744) !== 0x08e65e88 || word(0x2bcd5c) !== 0x08e65e88 ||
      word(debugAction + 4) !== 0x082b9539 || word(0x2bcd74) !== 0x082b9539 ||
      word(0x2b95c0) !== 0x08b197d4 ||
      label < 192 || label + 6 > rom.length || !gbaText('DEBUG').every((byte, i) => rom[label + i] === byte) ||
      !expectedTail.every((opcode, i) => view.getUint16(menuTail + 2 * i, true) === opcode)) {
    throw Error('The expected Heart & Soul Legends Start menu and Debug callback could not be verified.');
  }

  const output = rom.slice();
  const patched = new DataView(output.buffer, output.byteOffset, output.byteLength);
  // r3 indexes the first of the four trailing stock actions. Replace the
  // final Exit write with Cheat, then write Exit in the next slot and update the count.
  const tail = [
    0x18fa, 0x3220,                     // r2 = menu + 0x20 + r3
    0x2100 | debugId, 0x70d1,           // actions[r3 + 3] = Debug
    0x2107, 0x7111,                     // actions[r3 + 4] = Exit
    0x3305, 0xe619,                     // count = r3 + 5, branch to stock finalization
    0x46c0, 0x46c0, 0x46c0,
  ];
  tail.forEach((opcode, i) => patched.setUint16(menuTail + 2 * i, opcode, true));
  output.set(gbaText('Cheat'), label);
  if (await sha256(output) !== hnsLegendsPatch.target) throw Error('Patched ROM checksum mismatch.');
  return { output, verified: true, filename: 'Pokemon Heart and Soul Legends M9.8-Cheat.gba' };
}
