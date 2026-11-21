export const originHeartGoldBuilds = [
  {
    size: 278789824,
    source: 'd0185cfa37f329f4236aafbaa671b3dbb49fcdc4d7094bc27e491dc2894cf87f',
    target: 'fec6688a7d948660614a136ddd873a2edc46a9c3ffed19f3e0be64585bdb4781',
    name: 'English v1.0.0-rc8'
  },
  {
    size: 330028508,
    source: '86eb90e5ff3949f927787bf115efc0fe8d1d8b94eba883bdb0ad9c375bb3a2ce',
    target: '916015dacb09ff2bed00a6540402b3239209cf4f2a16d3fbe4f75b2994ed4e14',
    name: 'TH Nonplae v1.3'
  }
];

const bytes = hex => Uint8Array.from(hex.match(/../g), byte => Number.parseInt(byte, 16));
// Thumb routine for the validated field-input hook. See context.md for the
// native calls, raw input fields, and autoload layout used by both builds.
const payload = bytes(
  '194ad36b042213421cd05b071ad5164a926b920516d570b5cc68200030f08ef9' +
  '124930f049fa20007df0fefe0400322500f00af8012500f007f80d480cf08eff' +
  '002070bd0b4a104740b5200029000b227df0bafd632806d26322121a20002900' +
  '04237df0d1fc40bd94001d023f420f00dc050000a55b1e02'
);

async function hash(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function crc16(bytes) {
  let crc = 0xffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xa001 : 0);
  }
  return crc;
}

export async function patchOriginHeartGold(file) {
  const unsupported = () => Error('Choose the supported, unpatched Origin Heart Gold .nds file.');
  const build = originHeartGoldBuilds.find(build => build.size === file.size);
  if (!build) throw unsupported();
  // The buffer belongs to this operation. Edit it in place to avoid another
  // full-size copy of the cartridge image.
  const buffer = await file.arrayBuffer();
  if (await hash(buffer) !== build.source) throw unsupported();
  const output = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const get = offset => view.getUint32(offset, true);
  const set = (offset, value) => view.setUint32(offset, value, true);
  const map = address => address - 0x02000000 + 0x4000;
  const start = map(get(0x4ba0));
  const end = map(get(0x4ba4));
  const footerEnd = end + 12;
  const growth = payload.length + 12;
  const newFooterEnd = footerEnd + growth;
  if (start < map(get(0x4ba8)) || end < start || (end - start) % 12 ||
      end !== 0x4000 + get(0x2c) || newFooterEnd > get(0x50) || newFooterEnd > output.length ||
      get(0x41900) !== 0xf950f1a8 ||
      !output.subarray(footerEnd, newFooterEnd).every(byte => byte === 0xff)) throw unsupported();

  output.copyWithin(end + growth, end, footerEnd);
  output.copyWithin(start + payload.length, start, end);
  output.set(payload, start);
  set(end + payload.length, 0x01ff9000);
  set(end + payload.length + 4, payload.length);
  set(end + payload.length + 8, 0);
  set(0x4ba0, get(0x4ba0) + payload.length);
  set(0x4ba4, get(0x4ba4) + growth);
  set(0x2c, get(0x2c) + growth);
  output.set(bytes('bbf77efb'), 0x41900);
  view.setUint16(0x6c, crc16(output.subarray(0x4000, 0x8000)), true);
  view.setUint16(0x15e, crc16(output.subarray(0, 0x15e)), true);
  if (await hash(buffer) !== build.target) throw Error('Patched ROM checksum mismatch.');
  return { output, verified: true, filename: `Pokemon Origin Heart Gold ${build.name}-Cheat.nds` };
}
