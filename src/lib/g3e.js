import { gbaText } from './emerald-cheat.js';

export const g3ePatch = {
  sourceSize: 32 * 1024 * 1024,
  source: '22151eb87b5337a5e1c5e2552fd99c872c34ea06d5fc4066bad56038b2abd2cb',
  target: '30c622e5170bbdc196270be0a20083a2dfc5915f29828b9302da0e2680a453df',
};

const base = 0x08000000;
const playerCardCall = 0x21b726;
const appendAction = 0x21ab28;
const appendStub = 0x2cf1d4;
const debugAction = 0xda4418;
const debugCallback = 0x21b0d4;
const debugOpen = 0x113198;
const debugId = 12;

async function sha256(bytes) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function patchG3e(rom) {
  if (!globalThis.crypto?.subtle) throw Error('Open Poké Lab over HTTPS or localhost to patch the ROM.');
  if (rom.length !== g3ePatch.sourceSize || await sha256(rom) !== g3ePatch.source) {
    throw Error('Choose the supported, unpatched Generation 3 Evolved v1.0.26 ROM.');
  }

  const view = new DataView(rom.buffer, rom.byteOffset, rom.byteLength);
  const label = view.getUint32(debugAction, true) - base;
  const matches = (offset, bytes) => offset >= 192 && offset + bytes.length <= rom.length &&
    bytes.every((byte, index) => rom[offset + index] === byte);
  const unsupported = () => Error('The expected Generation 3 Evolved menu layout could not be verified.');
  if (view.getUint32(debugAction + 4, true) !== base + debugCallback + 1 ||
      view.getUint32(0x21b1e4, true) !== base + debugCallback + 1 ||
      !matches(label, gbaText('DEBUG')) ||
      !matches(playerCardCall - 2, [4, 0x20, 0xff, 0xf7, 0xff, 0xf9]) ||
      !matches(appendAction, [0x10, 0xb5, 5, 0x28]) ||
      !matches(appendStub, new Uint8Array(16)) ||
      !matches(debugOpen, [0xbc, 0x20, 0, 0xb5])) throw unsupported();

  const output = rom.slice();
  const patched = new DataView(output.buffer);
  const word = (offset, value) => patched.setUint16(offset, value, true);
  function call(offset, target) {
    const delta = target - offset - 4;
    if (delta % 2 || delta < -0x400000 || delta >= 0x400000) throw unsupported();
    word(offset, 0xf000 | ((delta >> 12) & 0x7ff));
    word(offset + 2, 0xf800 | ((delta >> 1) & 0x7ff));
  }

  // Append Cheat after the player card on the normal field path.
  call(playerCardCall, appendStub);
  word(appendStub, 0xb500); // push {lr}
  call(appendStub + 2, appendAction);
  word(appendStub + 6, 0x2000 | debugId);
  call(appendStub + 8, appendAction);
  word(appendStub + 12, 0xbc01); // pop {r0}
  word(appendStub + 14, 0x4700); // bx r0
  output.set(gbaText('Cheat'), label);

  // Retain the stock DEBUG window cleanup and field input lock. Use the
  // six bytes occupied by the sound call to fit the native Debug opener.
  call(debugCallback + 6, 0x18db78);
  word(debugCallback + 10, 0x2101);
  call(debugCallback + 12, 0x18d9e0);
  call(debugCallback + 16, 0x18db84);
  call(debugCallback + 20, debugOpen);
  word(debugCallback + 24, 0x46c0); // nop over the old BL's second halfword
  if (await sha256(output) !== g3ePatch.target) throw Error('Patched ROM checksum mismatch.');
  return { output, verified: true };
}
