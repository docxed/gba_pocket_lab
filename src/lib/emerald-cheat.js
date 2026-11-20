const base = 0x08000000;
const fromHex = hex => Uint8Array.from(hex.match(/../g), byte => parseInt(byte, 16));
export const gbaText = text => Uint8Array.from([...text].map(char =>
  char === ' ' ? 0 : char.charCodeAt(0) + (char >= 'a' ? 116 : 122)).concat(255));

export function applyEmeraldCheat(rom, layout) {
  const {
    payload, table, renderTable, dispatchTable, builder, actions, count,
    cheatId, maxEntries, exitId, exitCallback, name, saveBlock, walletOffset, cap,
    setMoney, masterBall, rareCandy, hasItem, addItem, fade, startFade, unsupported
  } = layout;
  const appendStub = payload + 128, callback = payload + 168, fadeStub = payload + 324, label = payload + 360;
  const labelBytes = gbaText(name);
  if (label + labelBytes.length > rom.length || cheatId * 8 + 8 > appendStub - payload) throw unsupported();
  const output = rom.slice();
  const patched = new DataView(output.buffer);
  const words = (offset, values) => values.forEach((value, i) => patched.setUint16(offset + 2 * i, value, true));
  const pointers = (offset, values) => values.forEach((value, i) => patched.setUint32(offset + 4 * i, value, true));
  const thumb = offset => base + offset + 1;

  const tableSize = cheatId * 8;
  output.set(rom.subarray(table, table + tableSize), payload);
  pointers(payload + tableSize, [base + label, thumb(callback)]);
  pointers(renderTable, [base + payload]);
  pointers(dispatchTable, [base + payload]);
  output.set(labelBytes, label);

  // Reserve the final normal menu slot for the cheat action if space is tight.
  words(builder, [0x4b01, 0x4718, 0x46c0, 0x46c0]);
  pointers(builder + 8, [thumb(appendStub)]);
  words(appendStub, [0x4907, 0x4a08, 0x7813, 0x18c9, 0x2b00 | (maxEntries - 1), 0xd203, 0x2000 | exitId, 0x7008,
    0x3101, 0x3301, 0x2000 | cheatId, 0x7008, 0x3301, 0x7013, 0xbc01, 0x4700]);
  pointers(appendStub + 32, [actions, count]);

  // Set the wallet, top up both items, then tail-call the normal exit.
  const cheatCallback = '00b51b48006800280bd01a4940181a491a4b00f00af81a4800f008f8194800f005f801bc8646184b18471847';
  // Binary-search the current quantity via CheckBagHasItem, then use AddBagItem
  // for the difference up to 99. The game manages bag capacity and encryption.
  const topUpRoutine = 'f0b5040000256326154fb5420ed2a81901304008010001b4200000f012f802bc002801d00d00f0e74e1eeee7632d05d06321491b20000b4f00f003f8f0bc08bc18473847';
  const cheatCode = fromHex(cheatCallback + topUpRoutine);
  output.set(cheatCode, callback);
  pointers(callback + cheatCode.length, [
    saveBlock, walletOffset, cap, thumb(setMoney), masterBall, rareCandy,
    exitCallback, thumb(hasItem), thumb(addItem)
  ]);

  // Preserve the original fade for every existing action and skip it for MAX CHEATS.
  words(fade, [0x4800, 0x4700]);
  pointers(fade + 4, [thumb(fadeStub)]);
  words(fadeStub, [0x4805, 0x4281, 0xd004, 0x2001, 0x2100, 0x4b04,
    0xf000, 0xf802, 0x4b03, 0x4718, 0x4718, 0x46c0]);
  pointers(fadeStub + 24, [thumb(callback), thumb(startFade), thumb(fade + 8)]);

  return output;
}
