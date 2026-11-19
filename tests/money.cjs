const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const src = fs.readFileSync(__dirname + '/../misc.html', 'utf8').split('<script>').pop().split('</script>')[0];
new vm.Script(src);
const take = (a, b) => src.slice(src.indexOf(a), src.indexOf(b));
const ctx = vm.createContext({});
vm.runInContext([
  'const BASE=0x08000000;let r,d;const u16=p=>d.getUint16(p,true),u32=p=>d.getUint32(p,true);',
  'const patch=(p,v)=>[p,v.toString(16)].join(":");',
  take('function decodeThumb', 'function command'),
  take('function readOp', 'function analyzeStop'),
  take('function walletAccessor', 'function displayCaller'),
  take('function plainMoneyAt', 'function displayPlain'),
  take('function* moneyScanSteps', "guard('staticmoney'"),
  take('function purchasePatches', 'function purchaseControl')
].join('\n'), ctx);
const run = source => vm.runInContext(source, ctx);
function load(buffer) {
  ctx.b = buffer;
  run('r=b;d=new DataView(r.buffer,r.byteOffset,r.byteLength)');
}
function words(buffer, offset, opcodes) {
  opcodes.forEach((word, index) => buffer.writeUInt16LE(word, offset + index * 2));
}
function bl(offset, target) {
  const displacement = target - offset - 4;
  return [0xf000 | ((displacement >> 12) & 2047), 0xf800 | ((displacement >> 1) & 2047)];
}
const leaf = Buffer.alloc(64);
words(leaf, 8, [0x6802, 0x2300, 0x428a, 0xd300, 0x1a53, 0x6003, 0x4770]);
load(leaf);
assert.equal(run('plainMoneyAt(8).sub'), 16);
assert.equal(run('staticCandidates().length'), 1);
leaf.writeUInt16LE(0x6002, 18);
assert.equal(run('plainMoneyAt(8)'), null);

const rom = Buffer.alloc(256);
const getter = 16, setter = 48, entry = 100;
words(rom, getter, [0x4902, 0x6809, 0x6800, 0x6849, 0x4048, 0x4770]);
words(rom, setter, [0x4a02, 0x6812, 0x6852, 0x404a, 0x6002, 0x4770]);
rom.writeUInt32LE(0x03001100, getter + 12);
rom.writeUInt32LE(0x03001100, setter + 12);
words(rom, entry, [
  0xb530, 0x1c05, 0x1c0c, ...bl(entry + 6, getter), 0x1c01, 0x42a1,
  0xd201, 0x2100, 0xe000, 0x1b09, 0x1c28, ...bl(entry + 24, setter),
  0xbc30, 0xbc01, 0x4700
]);
load(rom);
assert.equal(run('staticCandidates()[0].entry'), entry);
assert.equal(run('purchasePatches(120,false,null)'), '120:1909');
assert.equal(run('purchasePatches(120,false,1000)'), '114:24fa\n116:a4\n118:46c0\n120:1909');
rom.writeUInt32LE(0x03001104, setter + 12);
assert.equal(run('staticCandidates().length'), 0, 'An unrelated key cannot validate the caller');
rom.writeUInt32LE(0x03001100, setter + 12);
rom.writeUInt16LE(0xd202, entry + 14);
assert.equal(run('staticCandidates().length'), 0, 'A shifted branch must not validate');

words(rom, 160, [0x4b05, 0x681a, 0x23b0, 0x58d2, 0x6803, 0x4053, 0x4299, 0xd801, 0x1a59, 0x404a, 0x6002, 0x4770]);
rom.writeUInt32LE(0x03001800, 184);
assert.equal(run('staticCandidates()[0].inline'), true);
rom.writeUInt32LE(0x08001800, 184);
assert.equal(run('staticCandidates().length'), 0, 'Inline lookup requires a RAM literal');
console.log('10 money regression assertions passed');
for (const file of process.argv.slice(2)) {
  load(fs.readFileSync(file));
  console.log(file, JSON.stringify(run('staticCandidates()')));
}
