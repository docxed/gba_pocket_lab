export const wallyQuestPatch = {
  source: 'e43512df384d2c7cf9f697bc024487c243ee48f43eb530678b5de3abb4afc2c7',
  target: '06e73d932827d072ced16d00ce9e8621550d545794bd1332b2872aaee91ff4ea'
};

const base = 0x08000000;
const signatures = {
  builder: '0520fff7b6ff0a48fef713f90006002802d10620fff7adff0720fff7aaff0820fff7a7ff01bc00470000',
  appendAction: '00b5021c1206120e0248034901f078fa01bc0047',
  renderer: '83b080460e1c02781148814611498a4611481206141625182878c300484604301818',
  dispatcher: '134b1049104a0e48007880180078c00004314018016819600e48814226d00e48814223d00d48814220d00d4881421dd0012000210cf0ccf818e00000',
  exit: '00b5fff7effc00f0e3fd012002bc0847',
  walletScript: '304e30689222d20080189621890060f0defc',
  moneySetter: '044a126892235b00d21812684a4002607047',
  moneyCap: '70b5061c0c1cfff7d7ff051c2819094d',
  hasItem: 'f0b50004070c09040d0c381c00f068ff000600283dd0',
  addItem: 'f0b557464e464546e0b482b00004000c814609040d0c00f05bfe0006002801d10020a2e0',
  itemPocket: '10b50004000c064cfff760ff0004000c2c2148430019807e10bc02bc08470000',
  itemIdLimit: '00b50004010cbe208000814201d8081c00e0002002bc0847'
};
const fromHex = hex => Uint8Array.from(hex.match(/../g), byte => parseInt(byte, 16));
const gbaText = text => Uint8Array.from([...text].map(char =>
  char === ' ' ? 0 : char.charCodeAt(0) + (char >= 'a' ? 116 : 122)).concat(255));
const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
  byte => byte.toString(16).padStart(2, '0')).join('');

export async function patchWallyQuest(rom) {
  if (!globalThis.crypto?.subtle) throw Error('Open Poké Lab over HTTPS or localhost to patch the ROM.');
  if (rom.length !== 32 * 1024 * 1024 || await sha256(rom) !== wallyQuestPatch.source) {
    throw Error('Choose the supported, unpatched Pokémon Wally Quest v1.1 ROM.');
  }

  const view = new DataView(rom.buffer, rom.byteOffset, rom.byteLength);
  const u16 = offset => view.getUint16(offset, true);
  const u32 = offset => view.getUint32(offset, true);
  const unsupported = () => Error('The expected Wally Quest menu layout could not be verified.');
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

  function literal(instruction) {
    const op = u16(instruction);
    const pool = ((instruction + 4) & ~3) + (op & 255) * 4;
    if ((op & 0xf800) !== 0x4800 || pool + 4 > rom.length) throw unsupported();
    return pool;
  }

  function callTarget(offset) {
    const hi = u16(offset), lo = u16(offset + 2);
    if ((hi & 0xf800) !== 0xf000 || (lo & 0xf800) !== 0xf800) throw unsupported();
    const target = offset + 4 + ((hi << 21) >> 9) + ((lo & 2047) << 1);
    if (target < 192 || target + 2 > rom.length || u16(target) === 0xffff) throw unsupported();
    return target;
  }

  const builder = locate(signatures.builder) + 30;
  const append = callTarget(builder + 2);
  if (!matches(append, fromHex(signatures.appendAction))) throw unsupported();
  const actions = u32(literal(append + 8)), count = u32(literal(append + 10));
  if (actions !== count + 1 || count < 0x02000000 || actions + 9 > 0x02040000) throw unsupported();

  const renderer = locate(signatures.renderer);
  const dispatcher = locate(signatures.dispatcher);
  const renderTable = literal(renderer + 8), dispatchTable = literal(dispatcher + 2);
  const table = u32(renderTable) - base;
  const cheatId = 15, tableSize = cheatId * 8;
  if (table < 192 || table % 4 || table + tableSize > rom.length || u32(dispatchTable) !== base + table) throw unsupported();
  const exit = table + 8 * 8;
  const exitCallback = u32(exit + 4);
  if (!(exitCallback & 1) || !matches(exitCallback - base - 1, fromHex(signatures.exit)) ||
      !matches(u32(exit) - base, gbaText('EXIT'))) throw unsupported();

  const script = locate(signatures.walletScript);
  const saveBlock = u32(literal(script));
  const walletOffset = (u16(script + 4) & 255) << ((u16(script + 6) >> 6) & 31);
  const setMoney = callTarget(script + 14);
  const cap = u32(literal(locate(signatures.moneyCap) + 14));
  if (saveBlock < 0x03000000 || saveBlock + 4 > 0x03008000 || saveBlock % 4 ||
      !matches(setMoney, fromHex(signatures.moneySetter)) || cap !== 999999) throw unsupported();

  const hasItem = locate(signatures.hasItem), addItem = locate(signatures.addItem);
  const pocketLookup = callTarget(hasItem + 12);
  if (pocketLookup !== callTarget(addItem + 22) ||
      !matches(pocketLookup, fromHex(signatures.itemPocket)) ||
      u16(addItem + 0x80) !== 0x2263) throw unsupported(); // Ordinary pockets cap each stack at 99.
  const sanitizeId = callTarget(pocketLookup + 8);
  if (!matches(sanitizeId, fromHex(signatures.itemIdLimit))) throw unsupported();
  const maxItemId = (u16(sanitizeId + 6) & 255) << ((u16(sanitizeId + 8) >> 6) & 31);
  const itemTable = u32(literal(pocketLookup + 6)) - base;
  const itemStride = u16(pocketLookup + 16) & 255;
  if (itemTable < 192 || itemTable % 4 || itemTable + (maxItemId + 1) * itemStride > rom.length) throw unsupported();

  function findItem(name, pocket) {
    const bytes = gbaText(name);
    let id = 0;
    for (let i = 1; i <= maxItemId; i++) {
      const record = itemTable + i * itemStride;
      if (!matches(record, bytes) || u16(record + 14) !== i || rom[record + 26] !== pocket) continue;
      if (id !== 0) throw unsupported();
      id = i;
    }
    if (id === 0) throw unsupported();
    return id;
  }
  const masterBall = findItem('Master Ball', 2);
  const rareCandy = findItem('Rare Candy', 1);

  // The verified ROM ends with unused FF padding. Copy the action table there and
  // store the new entry and Thumb routines immediately after it.
  let end = rom.length;
  while (end > 192 && rom[end - 1] === 255) end--;
  const payload = (end + 3) & ~3;
  const appendStub = payload + 128, callback = payload + 168, fadeStub = payload + 324, label = payload + 360;
  const labelBytes = gbaText('MAX CHEATS');
  if (label + labelBytes.length > rom.length) throw unsupported();
  const output = rom.slice();
  const patched = new DataView(output.buffer);
  const words = (offset, values) => values.forEach((value, i) => patched.setUint16(offset + 2 * i, value, true));
  const pointers = (offset, values) => values.forEach((value, i) => patched.setUint32(offset + 4 * i, value, true));
  const thumb = offset => base + offset + 1;

  output.set(rom.subarray(table, table + tableSize), payload);
  pointers(payload + tableSize, [base + label, thumb(callback)]);
  pointers(renderTable, [base + payload]);
  pointers(dispatchTable, [base + payload]);
  output.set(labelBytes, label);

  // Append EXIT and MAX CHEATS, reserving one slot for MAX CHEATS if the normal list is full.
  words(builder, [0x4b01, 0x4718, 0x46c0, 0x46c0]);
  pointers(builder + 8, [thumb(appendStub)]);
  words(appendStub, [0x4907, 0x4a08, 0x7813, 0x18c9, 0x2b08, 0xd203, 0x2008, 0x7008,
    0x3101, 0x3301, 0x200f, 0x7008, 0x3301, 0x7013, 0xbc01, 0x4700]);
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
  const fade = dispatcher + 48;
  words(fade, [0x4800, 0x4700]);
  pointers(fade + 4, [thumb(fadeStub)]);
  words(fadeStub, [0x4805, 0x4281, 0xd004, 0x2001, 0x2100, 0x4b04,
    0xf000, 0xf802, 0x4b03, 0x4718, 0x4718, 0x46c0]);
  pointers(fadeStub + 24, [thumb(callback), thumb(callTarget(fade + 4)), thumb(fade + 8)]);

  if (await sha256(output) !== wallyQuestPatch.target) throw Error('Patched ROM checksum mismatch.');
  return { output, verified: true };
}
