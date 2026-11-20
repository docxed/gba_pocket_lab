export const shortcutHashes = {
  '7aa25bbf568f7cfcf6ee1cf2e9e6ff637350b3d0705c2375cabb6baa7d9739f7': '4619d6df7e3ec3a37bb8fd97e506da7b0687ddcb55f1475f76a0726121cdf1b7',
  'f793fa46f751ffbfc0ff4f2cd6dd4f0c8d0b95359715750c82c8d26a40e30250': '42d211176c1537c73fedec646c8925952f24507cdc91f0af64433f4055c0b80e'
};

export const startHashes = {
  '4619d6df7e3ec3a37bb8fd97e506da7b0687ddcb55f1475f76a0726121cdf1b7': '1cb911832c719bb72119293def174801e637130e5cefc5ad7dbd1e20aa217251',
  '42d211176c1537c73fedec646c8925952f24507cdc91f0af64433f4055c0b80e': '1d2049795e0d95a43eb91c4b8dfc55100e8e49284e4e2aa00d3ea3c50c6ce3df'
};
const base = 0x08000000;

const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
  byte => byte.toString(16).padStart(2, '0')).join('');
const fromHex = hex => Uint8Array.from(hex.match(/../g), byte => parseInt(byte, 16));

export async function patchUnbound(rom) {
  if (!globalThis.crypto?.subtle) throw Error('Open Poké Lab over HTTPS or localhost to patch the ROM.');
  const unsupported = () => Error('Choose Pokémon Unbound v2.1.1.1 or TH Nonplae 2.0, either original or with the R-button patch only.');
  if (rom.length !== 32 * 1024 * 1024) throw unsupported();
  const source = await sha256(rom);
  const shortcut = shortcutHashes[source];
  const target = startHashes[shortcut ?? source];
  if (!target) throw unsupported();
  const input = new DataView(rom.buffer, rom.byteOffset, rom.byteLength);
  const half = offset => input.getUint16(offset, true);
  const word = offset => input.getUint32(offset, true);
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

  function literalOffset(offset) {
    const opcode = half(offset);
    const pool = ((offset + 4) & ~3) + (opcode & 255) * 4;
    if ((opcode & 0xf800) !== 0x4800 || pool + 4 > rom.length) throw unsupported();
    return pool;
  }
  function callTarget(offset) {
    const hi = half(offset), lo = half(offset + 2);
    if ((hi & 0xf800) !== 0xf000 || (lo & 0xf800) !== 0xf800) throw unsupported();
    return offset + 4 + ((hi << 21) >> 9) + ((lo & 2047) << 1);
  }

  const sortCall = locate('2800fff75cfd9b4b049a19781278914201d300221a70') + 2;
  const sort = callTarget(sortCall);
  const dispatch = locate('1549184a0978525c174b1201d558174b9d4205d0164b1d60164b00f087facbe7');
  const tablePointer = word(literalOffset(dispatch + 8));
  const table = tablePointer - base;
  const rowSize = 16;
  const exit = 11, cheat = 12;
  if (!matches(sort, fromHex('f7b5a82706000c25')) || table < 192 || table % 4 ||
    table + cheat * rowSize > rom.length) throw unsupported();
  const exitCallback = word(table + exit * rowSize) - base - 1;
  if (!matches(exitCallback, fromHex('10b5fff7d5ff012010bd'))) throw unsupported();
  const close = callTarget(exitCallback + 2);
  const fadeSlot = literalOffset(dispatch + 24);
  const fade = word(fadeSlot);
  const rDebug = locate('0c4b00f09bf81948aee7');
  const script = word(literalOffset(rDebug + 6));
  const setupStub = rDebug + 12 + ((half(rDebug + 8) << 21) >> 20);
  if (!matches(setupStub, fromHex('344b00f0e7f820e0')) ||
    !matches(script - base, fromHex('6916068000000f00'))) throw unsupported();
  const order = word(literalOffset(dispatch + 2));
  const cursor = word(literalOffset(dispatch));
  const count = cursor + 1;
  // The builder uses the selection cursor immediately before count and order.
  if (word(literalOffset(sortCall + 4)) !== cursor || count + 1 !== order) throw unsupported();

  // Reserve an aligned portion of a large erased region within Thumb BL range.
  let space = Math.ceil(sortCall / 0x100000) * 0x100000;
  const erased = new Uint8Array(0x20000).fill(255);
  while (space < sortCall + 0x300000 && !matches(space, erased)) space += 0x10000;
  if (!matches(space, erased)) throw unsupported();

  const output = rom.slice();
  const view = new DataView(output.buffer);
  const writeWord = (offset, value) => view.setUint32(offset, value, true);
  function writeCall(offset, destination) {
    const delta = destination - offset - 4;
    if (delta % 2 || delta < -0x400000 || delta >= 0x400000) throw unsupported();
    view.setUint16(offset, 0xf000 | ((delta >> 12) & 2047), true);
    view.setUint16(offset + 2, 0xf800 | ((delta >> 1) & 2047), true);
  }

  const entry = space + cheat * rowSize;
  const name = entry + rowSize;
  const append = space + 0x100, callback = space + 0x160, fadeCheck = space + 0x190;
  output.set(rom.subarray(table, table + cheat * rowSize), space);
  output.set(rom.subarray(table + exit * rowSize, table + (exit + 1) * rowSize), entry);
  writeWord(entry, base + callback + 1);
  writeWord(entry + 4, base + name);
  output[entry + 14] = 1;
  output.set(fromHex('bddcd9d5e8ff'), name); // Cheat in the game's character encoding.

  // Run the stock sorter, then append Cheat only when Settings is present, Exit is
  // absent, and a slot fits. The reused Exit icon and ordering variable stay unique.
  output.set(fromHex('10b5000000000d490a78092a14d20c4800230024934204d2c45c0a2c0cd20133f8e70023934207d2c45c0133092cf9d10c23835401320a7010bd'), append);
  writeCall(append + 2, sort);
  writeWord(append + 0x3c, count);
  writeWord(append + 0x40, order);
  writeCall(sortCall, append);
  // Close the Start UI, then use the original script lock and debug script.
  output.set(fromHex('10b500000000054b00f006f80448054b00f002f8012010bd1847'), callback);
  writeCall(callback + 2, close);
  writeWord(callback + 0x1c, word(literalOffset(rDebug)));
  writeWord(callback + 0x20, script);
  writeWord(callback + 0x24, word(literalOffset(setupStub)));
  // Skip the field fade only for the new callback.
  output.set(fromHex('024b9d4201d0024b18477047'), fadeCheck);
  writeWord(fadeCheck + 12, base + callback + 1);
  writeWord(fadeCheck + 16, fade);
  writeWord(fadeSlot, base + fadeCheck + 1);
  let references = 0;
  for (let offset = 192; offset + 4 <= rom.length; offset += 4) {
    if (word(offset) !== tablePointer) continue;
    writeWord(offset, base + space);
    references++;
  }
  if (references !== 5) throw unsupported();

  if (shortcut) {
    const skipDebug = locate('032b03d1754801f0d8faf6e7052bcfd0dbe7') + 14;
    const resetDebug = locate('052803d10021834800f0c1fa0126') + 2;
    view.setUint16(skipDebug, 0x46c0, true);
    view.setUint16(resetDebug, 0xe003, true);
  }
  if (await sha256(output) !== target) throw Error('Patched ROM checksum mismatch.');
  return { output, verified: true };
}
