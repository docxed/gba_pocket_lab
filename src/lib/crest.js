export const crestPatch = {
  source: '3ed3f02d6b2ed8a862551b5b169adcbe608077ab99009e1ca3702c2da2ab7e54',
  target: '4e4e157dede42798988bbddcff6c81944583d926dcec95635b0ba5084c5f8ddd',
};

const base = 0x08000000;
const fromHex = hex => Uint8Array.from(hex.match(/../g), byte => parseInt(byte, 16));
const signatures = {
  builder: '0a2c35d82148fef7fdf80006002801d1002c2dd086200001fef7f4f80006002803d1022c24d0052c22d01948fef7eaf80006002801d1032c1ad01648fef7e2f80006002801d1012c12d01348fef7daf80006002801d1072c0ad00a2c08d0201c0b380006000e042802d9201cfff776ff601c0006040e094801780131c800401a8442bddb',
  appendAction: '00b5021c1206120e0248034901f09efd01bc0047',
  dispatcher: '1f4b1a491b4a1b48007880180078c000043140180168',
  debugCallback: '00b5fff741fa00f011f8f5f73ff96ef13bfe012002bc0847',
  debugClose: '00b5052004f0b6fc19f1eefe0006000e012119f1fffb19f1edfe01bc0047',
  normalClose: '00b500f07bf919f1f3f80006000e012118f104fe19f1f2f8f5f7b2fbf6f79cf801bc0047',
  removeIcons: '70b500250a4e0b4c3c21605eb04202d1',
};

async function sha256(bytes) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function patchCrest(rom) {
  if (!globalThis.crypto?.subtle) throw Error('Open Poké Lab over HTTPS or localhost to patch the ROM.');
  if (rom.length < 192 || rom.length > 32 * 1024 * 1024 || await sha256(rom) !== crestPatch.source) {
    throw Error('Choose the supported, unpatched Emerald Crest v1.0.F ROM.');
  }

  const view = new DataView(rom.buffer, rom.byteOffset, rom.byteLength);
  const word = offset => view.getUint16(offset, true);
  const unsupported = () => Error('The expected Emerald Crest menu layout could not be verified.');
  const matches = (offset, bytes) => offset >= 192 && offset + bytes.length <= rom.length &&
    bytes.every((byte, i) => rom[offset + i] === byte);
  function locate(signature) {
    const bytes = fromHex(signature);
    let found = -1;
    for (let offset = rom.indexOf(bytes[0], 192); offset >= 0; offset = rom.indexOf(bytes[0], offset + 1)) {
      if (offset % 2 || !matches(offset, bytes)) continue;
      if (found !== -1) throw unsupported();
      found = offset;
    }
    if (found === -1) throw unsupported();
    return found;
  }
  function callTarget(offset) {
    const hi = word(offset), lo = word(offset + 2);
    if ((hi & 0xf800) !== 0xf000 || (lo & 0xf800) !== 0xf800) throw unsupported();
    return offset + 4 + ((hi << 21) >> 9) + ((lo & 2047) << 1);
  }

  const builder = locate(signatures.builder);
  const insertion = builder + 0x5e;
  const appendAction = callTarget(insertion + 14);
  const dispatcher = locate(signatures.dispatcher);
  const load = dispatcher + 2;
  const pool = ((load + 4) & ~3) + (word(load) & 255) * 4;
  if (!matches(appendAction, fromHex(signatures.appendAction)) || pool + 4 > rom.length) throw unsupported();

  const table = view.getUint32(pool, true) - base;
  const action = table + 16 * 8;
  if (table < 192 || table % 4 || action + 8 > rom.length) throw unsupported();
  const label = view.getUint32(action, true) - base;
  const callback = view.getUint32(action + 4, true) - base;
  if (!(callback & 1) || !matches(callback - 1, fromHex(signatures.debugCallback)) ||
    !matches(label, fromHex('bebfbccfc1ff'))) throw unsupported();

  const debugClose = callTarget(callback - 1 + 6);
  const normalClose = locate(signatures.normalClose);
  const removeIcons = callTarget(normalClose + 2);
  if (!matches(debugClose, fromHex(signatures.debugClose)) ||
    !matches(removeIcons, fromHex(signatures.removeIcons))) throw unsupported();

  const output = rom.slice();
  const patchedView = new DataView(output.buffer);
  // The right page already visits indices 7 through 13. Reuse its last visited
  // index for action 16, while retaining its existing actions and excluding 10-12.
  patchedView.setUint16(builder, 0x2c0d, true);
  output.set(fromHex('10200d2c03d00a2c03d8c046'), insertion);
  output.set(fromHex('bdc2bfbbce'), label); // CHEAT, using the ROM's existing alphabet.

  // Run the normal close routine's sprite cleanup before opening Debug.
  const call = debugClose + 2, delta = removeIcons - call - 4;
  if (delta % 2 || delta < -0x400000 || delta >= 0x400000) throw unsupported();
  patchedView.setUint16(call, 0xf000 | ((delta >> 12) & 2047), true);
  patchedView.setUint16(call + 2, 0xf800 | ((delta >> 1) & 2047), true);
  patchedView.setUint16(call + 4, 0x46c0, true);

  if (await sha256(output) !== crestPatch.target) throw Error('Patched ROM checksum mismatch.');
  return { output, verified: true };
}
