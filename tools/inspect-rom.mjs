import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import vm from 'node:vm';
import { gbaText } from '../src/lib/emerald-cheat.js';
import { soulGoldPatch } from '../src/lib/soulgold.js';
import { crestPatch } from '../src/lib/crest.js';
import { wallyQuestPatch } from '../src/lib/wally-quest.js';
import { g3ePatch } from '../src/lib/g3e.js';
import { thetaEmeraldPatch } from '../src/lib/theta-emerald.js';
import { shortcutHashes, startHashes } from '../src/lib/unbound.js';

const base = 0x08000000;
const capacity = 32 * 1024 * 1024;
const address = offset => '0x' + (base + offset).toString(16).toUpperCase().padStart(8, '0');
const buildHashes = new Map([
  ...soulGoldPatch.profiles.map(p => [p.source, p.game ?? 'soulgold']),
  [crestPatch.source, 'emerald-crest'],
  [wallyQuestPatch.source, 'wally-quest'],
  [thetaEmeraldPatch.source, 'theta-emerald'],
  [g3ePatch.source, 'generation-3-evolved v1.0.26'],
  ...Object.keys(shortcutHashes).map(hash => [hash, 'unbound']),
  ...Object.keys(startHashes).map(hash => [hash, 'unbound (R-button patch)'])
]);

async function readRom(path) {
  const file = await stat(path);
  if (!file.isFile() || file.size < 192) throw Error('Select a ROM file with at least a 192-byte header.');
  const hash = createHash('sha256');
  const rom = Buffer.alloc(Math.min(file.size, capacity));
  let size = 0;
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk);
    if (size < rom.length) chunk.copy(rom, size);
    size += chunk.length;
  }
  if (size !== file.size) throw Error('The file size changed during the scan. Try again.');
  return { rom, size, sha256: hash.digest('hex') };
}

// Reuse the scanner bodies that also run in the standalone Misc page.
async function scanners(rom) {
  const html = await readFile(new URL('../misc.html', import.meta.url), 'utf8');
  const source = html.split('<script>').pop().split('</script>')[0];
  function section(start, end) {
    const first = source.indexOf(start);
    const last = source.indexOf(end, first + start.length);
    if (first < 0 || last < 0) throw Error(`Misc scanner boundary missing: ${start}`);
    return source.slice(first, last);
  }
  const context = vm.createContext({ rom });
  vm.runInContext([
    'const BASE = 0x08000000, r = rom, d = new DataView(r.buffer, r.byteOffset, r.byteLength);',
    'const u16 = p => d.getUint16(p,true), u32 = p => d.getUint32(p,true);',
    'function requireRom() {}',
    section('function hits(', 'function node('),
    section('const chars=', 'function showItems('),
    section('function decodeThumb(', 'function command('),
    section('function readOp(', 'function analyzeStop('),
    section('function walletAccessor(', 'function displayCaller('),
    section('function plainMoneyAt(', 'function displayPlain('),
    section('function* moneyScanSteps(', "guard('staticmoney'")
  ].join('\n'), context);
  return expression => vm.runInContext(expression, context);
}

function menuCandidates(rom) {
  const labels = ['Debug Menu', 'Debug', 'Cheat', 'Game Settings', 'Docs', 'Bag', 'Save', 'Option', 'Exit'];
  const results = [];
  function thumbCandidate(pointerOffset) {
    if (pointerOffset < 0 || pointerOffset + 4 > rom.length) return;
    const pointer = rom.readUInt32LE(pointerOffset);
    const target = pointer - base - 1;
    if (!(pointer & 1) || target < 192 || target + 2 > rom.length) return;
    const opcode = rom.readUInt16LE(target);
    if ((opcode & 0xff00) === 0xb500 || (opcode & 0xf800) === 0xe000) return address(target);
  }
  for (const label of labels) {
    const matches = [];
    for (const spelling of new Set([label, label.toUpperCase()])) {
      const needle = Buffer.from(gbaText(spelling));
      let scanned = 0;
      for (let start = rom.indexOf(needle); start !== -1 && scanned < 24; start = rom.indexOf(needle, start + 1), scanned++) {
        const pointer = Buffer.alloc(4);
        pointer.writeUInt32LE(base + start);
        const references = [];
        for (let ref = rom.indexOf(pointer); ref !== -1 && references.length < 16; ref = rom.indexOf(pointer, ref + 1)) {
          if (ref % 4) continue;
          const before = thumbCandidate(ref - 4), after = thumbCandidate(ref + 4);
          references.push({
            address: address(ref),
            ...(before ? { before } : {}),
            ...(after ? { after } : {})
          });
        }
        if (references.length === 0) continue;
        references.sort((a, b) => Number(Boolean(b.before || b.after)) - Number(Boolean(a.before || a.after)));
        matches.push({ label: spelling, text: address(start), references: references.slice(0, 3) });
      }
    }
    matches.sort((a, b) => Number(Boolean(b.references[0].before || b.references[0].after)) -
      Number(Boolean(a.references[0].before || a.references[0].after)));
    results.push(...matches.slice(0, 2));
  }
  return results;
}

async function main([path, flag, value, ...extra]) {
  if (!path || path === '--help') {
    console.log('Usage: node tools/inspect-rom.mjs "<local ROM path>" [--at 0x08XXXXXX]');
    return;
  }
  if (extra.length || (flag !== undefined && (flag !== '--at' || !/^0x[0-9a-f]{8}$/i.test(value ?? '')))) {
    throw Error('Expected an optional --at followed by an eight-digit hexadecimal ROM address.');
  }

  const { rom, size, sha256 } = await readRom(path);
  const checksum = (-0x19 - rom.subarray(0xa0, 0xbd).reduce((sum, byte) => sum + byte, 0)) & 255;
  const report = {
    file: basename(path), size, sha256,
    header: {
      title: rom.toString('ascii', 0xa0, 0xac).replace(/[^ -~]+/g, '').trim(),
      gameCode: rom.toString('ascii', 0xac, 0xb0).replace(/[^ -~]/g, '?'),
      fixedByteValid: rom[0xb2] === 0x96,
      checksumValid: rom[0xbd] === checksum
    },
    knownInput: buildHashes.get(sha256) ?? null
  };
  if (size > rom.length) report.scannedBytes = rom.length;
  if (flag === '--at') {
    const offset = Number(value) - base;
    if (offset < 192 || offset % 2 || offset + 2 > rom.length) throw Error('Use an aligned address inside the scanned ROM.');
    const run = await scanners(rom);
    report.thumb = [];
    for (let p = offset; p + 2 <= rom.length && report.thumb.length < 12;) {
      const { op, size: length, target, ...operands } = run(`readOp(${p})`);
      const entry = { address: address(p), bytes: rom.subarray(p, p + (length ?? 2)).toString('hex'), op, ...operands };
      if (target !== undefined) entry.target = address(target);
      if (op === 'literal') {
        const pool = ((p + 4) & ~3) + (rom[p] * 4);
        if (pool + 4 <= rom.length) entry.literal = '0x' + rom.readUInt32LE(pool).toString(16).padStart(8, '0');
      }
      report.thumb.push(entry);
      p += length ?? 2;
    }
    report.evidence = 'Partial Thumb decode. Unknown opcodes require a disassembler.';
  } else if (report.header.fixedByteValid && report.header.checksumValid) {
    const run = await scanners(rom);
    report.menuCandidates = menuCandidates(rom);
    const money = run('staticCandidates()');
    report.moneyCandidates = {
      count: money.length,
      shown: money.slice(0, 5).map(({ entry, sub, write, read, setter, plain, inline }) => ({
        kind: plain ? 'plain' : inline ? 'inline XOR' : 'getter/setter',
        entry: address(entry), subtract: address(sub), store: address(write),
        ...(read !== undefined ? { getter: address(read) } : {}),
        ...(setter !== undefined ? { setter: address(setter) } : {})
      }))
    };
    try {
      const items = run('detectItems()');
      report.items = items.filter(item => ['rare candy', 'master ball'].includes(item.name.toLowerCase()))
        .map(({ name, id, layout }) => ({ name, id, layout: layout ?? 'legacy table candidate' }));
    } catch (error) {
      report.itemScan = error.message;
    }
    report.evidence = 'Static candidates. Confirm menu references, item IDs, and runtime behavior before patching.';
  } else {
    report.evidence = 'Header validation failed. Automatic candidate scans were skipped.';
  }
  console.log(JSON.stringify(report));
}

main(process.argv.slice(2)).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
