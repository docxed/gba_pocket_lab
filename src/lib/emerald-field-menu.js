import { applyEmeraldCheat, gbaText } from './emerald-cheat.js';

const base = 0x08000000;
const fromHex = hex => Uint8Array.from(hex.match(/../g), value => parseInt(value, 16));
export function patchEmeraldFieldMenu(rom, { game, walletCap, moneySetter, itemLimit }) {
  const view = new DataView(rom.buffer, rom.byteOffset, rom.byteLength);
  const half = offset => view.getUint16(offset, true);
  const word = offset => view.getUint32(offset, true);
  const unsupported = () => Error(`The expected ${game} menu or inventory layout could not be verified.`);
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
    const opcode = half(instruction);
    const offset = ((instruction + 4) & ~3) + (opcode & 255) * 4;
    if ((opcode & 0xf800) !== 0x4800 || offset + 4 > rom.length) throw unsupported();
    return offset;
  }
  function callTarget(instruction) {
    const hi = half(instruction), lo = half(instruction + 2);
    if ((hi & 0xf800) !== 0xf000 || (lo & 0xf800) !== 0xf800) throw unsupported();
    const offset = instruction + 4 + ((hi << 21) >> 9) + ((lo & 2047) << 1);
    if (offset < 192 || offset + 2 > rom.length || half(offset) === 0xffff) throw unsupported();
    return offset;
  }

  const builder = locate('0520fff7c9ff0620fff7c6ff0720fff7c3ff01bc00470000') + 12;
  const append = callTarget(builder + 2);
  if (!matches(append, fromHex('00b5021c1206120e0248034901f042fa01bc0047')) ||
    !matches(callTarget(append + 12), fromHex('0b78c01802700878013008707047'))) throw unsupported();
  const actions = word(literal(append + 8)), count = word(literal(append + 10));
  if (actions !== count + 1 || count < 0x02000000 || actions + 8 > 0x02040000) throw unsupported();

  const renderer = locate('83b080460e1c02781148814611498a4611481206141625182878c300484604301818');
  const dispatcher = locate('134b1049104a0e48007880180078c00004314018016819600e48814226d00e48814223d00d48814220d00d4881421dd0012000210cf0b2f818e0');
  const renderTable = literal(renderer + 8), dispatchTable = literal(dispatcher + 2);
  const table = word(renderTable) - base;
  const cheatId = 13, exitId = 7;
  if (table < 192 || table % 4 || table + cheatId * 8 > rom.length || word(dispatchTable) !== base + table) throw unsupported();
  const exit = table + exitId * 8;
  const exitCallback = word(exit + 4);
  if (!(exitCallback & 1) || !matches(exitCallback - base - 1, fromHex('00b5fff705fd00f0e3fd012002bc0847')) ||
    !matches(word(exit) - base, gbaText('Exit'))) throw unsupported();

  const wallet = locate('2c4c20689221c90040182b4960f00afe0020');
  const saveBlock = word(literal(wallet));
  const walletOffset = (half(wallet + 4) & 255) << ((half(wallet + 6) >> 6) & 31);
  const setMoney = callTarget(wallet + 12);
  const cap = word(literal(locate('70b5061c0c1cfff7dbff051c2819094d') + 14));
  if (saveBlock < 0x03000000 || saveBlock + 4 > 0x03008000 || saveBlock % 4 ||
    !matches(setMoney, fromHex(moneySetter)) || cap !== walletCap) throw unsupported();

  const hasItem = locate('f0b50004070c09040d0c381c00f02eff000600283dd0');
  const addItem = locate('f0b557464e464546e0b482b00004000c814609040d0c00f027fe0006002801d10020a2e0');
  const pocket = callTarget(hasItem + 12);
  if (pocket !== callTarget(addItem + 22) ||
    !matches(pocket, fromHex('10b50004000c064cfff760ff0004000c2c2148430019807e10bc02bc08470000')) ||
    !matches(addItem + 0x80, fromHex('6322002638798642'))) throw unsupported();
  const sanitize = callTarget(pocket + 8);
  let maxItemId;
  if (itemLimit) {
    if (!matches(sanitize, fromHex(itemLimit))) throw unsupported();
    maxItemId = (half(sanitize + 6) & 255) << ((half(sanitize + 8) >> 6) & 31);
  } else {
    // Theta redirects item ID validation through a Thumb trampoline.
    if (!matches(sanitize, fromHex('00490847'))) throw unsupported();
    const pointer = word(literal(sanitize));
    const target = pointer - base - 1;
    if (!(pointer & 1) || !matches(target, fromHex('03007a3bff3b002b03d0034b834200d370470020fce7'))) throw unsupported();
    maxItemId = word(literal(target + 10));
  }
  const itemTable = word(literal(pocket + 6)) - base;
  const stride = half(pocket + 16) & 255;
  if (itemTable < 192 || itemTable % 4 || itemTable + (maxItemId + 1) * stride > rom.length) throw unsupported();
  function findItem(name, pocketId) {
    const text = gbaText(name);
    let found = 0;
    for (let id = 1; id <= maxItemId; id++) {
      const entry = itemTable + stride * id;
      if (!matches(entry, text) || half(entry + 14) !== id || rom[entry + 26] !== pocketId) continue;
      if (found) throw unsupported();
      found = id;
    }
    if (!found) throw unsupported();
    return found;
  }

  // This build has a populated ROM tail. Reserve space in an aligned erased block.
  const erased = new Uint8Array(0x10000).fill(255);
  let payload = Math.ceil((table + cheatId * 8) / erased.length) * erased.length;
  while (payload + erased.length <= rom.length && !matches(payload, erased)) payload += erased.length;
  if (payload + erased.length > rom.length) throw unsupported();
  const fade = dispatcher + 48;
  return applyEmeraldCheat(rom, {
    payload, table, renderTable, dispatchTable, builder, actions, count,
    cheatId, maxEntries: 8, exitId, exitCallback, name: 'Cheat',
    saveBlock, walletOffset, cap, setMoney, hasItem, addItem,
    masterBall: findItem('Master Ball', 2), rareCandy: findItem('Rare Candy', 1),
    fade, startFade: callTarget(fade + 4), unsupported
  });
}
