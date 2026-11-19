const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {createHash, webcrypto} = require('node:crypto');

const html = fs.readFileSync(__dirname + '/../misc.html', 'utf8');
const src = html.split('<script>').pop().split('</script>')[0];
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const sections = [...html.matchAll(/<section id="([^"]+)"([^>]*)>/g)];
const tabs = [...html.matchAll(/<button([^>]*) data-tab="([^"]+)">/g)];

function element() {
  return {
    children: [],
    get options() { return this.children; },
    value: '',
    textContent: '',
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; },
    addEventListener() {}
  };
}

async function main() {
  assert.deepEqual(sections.map(([, id]) => id), ['money', 'shop', 'items']);
  assert.deepEqual(tabs.map(([, , id]) => id), ['money', 'shop', 'items']);
  assert.doesNotMatch(src, /\b(?:findDex|findEncounters|scanLocations|renderDex)\b/);
  assert.doesNotMatch(html, /\bid="(?:dex\w*|mapdetail)"/);

  const elements = new Map(ids.map(id => [id, element()]));
  const panels = sections.map(([, id, attrs]) => Object.assign(elements.get(id), { id, hidden: attrs.includes('hidden') }));
  const buttons = tabs.map(([, attrs, id]) => ({
    dataset: { tab: id },
    active: attrs.includes('active'),
    classList: { toggle(name, active) { buttons.find(button => button.dataset.tab === id).active = active; } }
  }));
  const document = {
    getElementById: id => elements.get(id),
    querySelectorAll: selector => selector === 'section' ? panels : buttons,
    createElement: element
  };
  elements.get('tracemethod').value = 'none';
  const app = vm.createContext({ document, window: {}, TextDecoder, crypto: webcrypto });
  vm.runInContext(src, app);

  assert.deepEqual(panels.filter(panel => !panel.hidden).map(panel => panel.id), ['money']);
  assert.deepEqual(buttons.filter(button => button.active).map(button => button.dataset.tab), ['money']);

  for (const button of buttons) {
    button.onclick();
    assert.deepEqual(panels.filter(panel => !panel.hidden).map(panel => panel.id), [button.dataset.tab]);
    assert.deepEqual(buttons.filter(button => button.active).map(button => button.dataset.tab), [button.dataset.tab]);
  }

  const input = elements.get('rom');
  let resolveOlder;
  input.files = [{ name: 'older.gba', size: 192, arrayBuffer: () => new Promise(resolve => { resolveOlder = resolve; }) }];
  const older = input.onchange();
  const bytes = new ArrayBuffer(192);
  new Uint8Array(bytes).set(Buffer.from('TEST'), 172);
  input.files = [{ name: 'newer.gba', size: 192, arrayBuffer: async () => bytes }];
  await input.onchange();
  resolveOlder(new ArrayBuffer(192));
  await older;

  assert.match(elements.get('romstatus').textContent, /^newer\.gba .* TEST /);
  assert.equal(elements.get('autoshopout').textContent, 'No supported shops \u2014 use manual search');
  const {patchSoulGold: patch, soulGoldPatch} = await import('../src/lib/soulgold.js');
  await assert.rejects(patch(new Uint8Array(191)), /32 MiB/);
  await assert.rejects(patch(new Uint8Array(32 * 1024 * 1024)), /GBA header/);
  const emeraldHeaderOnly = new Uint8Array(192);
  emeraldHeaderOnly.set(Buffer.from('POKEMON EMERBPEE'), 0xa0);
  emeraldHeaderOnly[0xb2] = 0x96;
  emeraldHeaderOnly[0xbd] = (-0x19 - emeraldHeaderOnly.subarray(0xa0, 0xbd).reduce((sum, byte) => sum + byte, 0)) & 255;
  await assert.rejects(patch(emeraldHeaderOnly), /Unsupported SoulGold layout/);

  const fixtures = new Map([
    ['2cbd389822d80db1b7575b4e064e155bcfdbe17d000b324076d99fa6f7a8804b', '9cc2de4679a7e1c2e79ca2ff2541e0835d6b08fa4c9c3ba484f16f8c6364bce3'],
    ['01a6af0953a68732579360988edd3338e5b24d2e48248f3239e851adf2557b31', 'ace9e07650a857ff928dec1ebbaa23f7cfe9fa8cb387da655132e1e72c20e134']
  ]);
  for (const file of process.argv.slice(2)) {
    const input = Uint8Array.from(fs.readFileSync(file));
    const hash = bytes => createHash('sha256').update(bytes).digest('hex');
    const before = hash(input);
    const {output, verified} = await patch(input);
    assert.equal(verified, true);
    assert.equal(hash(input), before, 'The source ROM must remain unchanged');
    assert.equal(hash(output), fixtures.get(before));
    await assert.rejects(patch(output), /already patched/);
    const variant = input.slice();
    variant[0xbc] = (variant[0xbc] + 1) & 255;
    variant[0xbd] = (variant[0xbd] - 1) & 255;
    const alternate = await patch(variant);
    assert.equal(alternate.verified, false, 'A changed build must not claim emulator verification');
    const normalized = alternate.output;
    normalized.set(input.subarray(0xbc, 0xbe), 0xbc);
    assert.equal(hash(normalized), hash(output), 'Apply the same patch to a structurally matching variant');
    const profiles = soulGoldPatch.profiles;
    const originalCallback = Buffer.from(profiles.find(profile => profile.source === before).callback, 'hex');
    const callback = Buffer.from(variant.buffer).indexOf(originalCallback);
    assert.ok(callback > 0);
    variant[callback] ^= 1;
    await assert.rejects(patch(variant), /Unsupported SoulGold layout/, 'Reject a changed callback');
    console.log('Verified SoulGold patch for ' + file);
  }
  console.log('Navigation, ROM loading and patch regression tests passed');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
