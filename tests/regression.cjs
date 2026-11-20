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

  assert.match(html, /<input type="checkbox" id="sprites" checked>/);
  assert.match(html, /<meta name="referrer" content="no-referrer">/);
  const patcherPage = fs.readFileSync(__dirname + '/../index.html', 'utf8');
  assert.match(patcherPage, /<meta name="referrer" content="no-referrer">/);

  const patcherView = fs.readFileSync(__dirname + '/../src/App.vue', 'utf8');
  const selector = patcherView.match(/<v-autocomplete\s+id="game-select"[^>]*>/)?.[0];
  assert.ok(selector, 'The game selector supports text input');
  const filterKeys = selector.match(/:filter-keys="([^"]+)"/)?.[1].match(/[\w.]+/g);
  assert.ok(filterKeys);
  const {filterItems} = await import('vuetify/lib/composables/filter.js');
  const games = [
    {title: 'Pokémon SoulGold', raw: {builds: ['English 1.2.1', 'TH Nonplae 1.2']}},
    {title: 'Pokémon SoulGold MegaXtream', raw: {builds: ['vTH.1.1.4-4']}},
    {title: 'Pokémon Emerald Crest', raw: {builds: ['v1.0.F']}}
  ];
  const search = query => filterItems(games, query, {
    filterKeys, ignoreAccents: selector.includes('ignore-accents')
  }).map(({index}) => index);
  assert.deepEqual(search('pokemon emerald'), [2]);
  assert.deepEqual(search('SOULGOLD'), [0, 1]);
  assert.deepEqual(search('1.1.4-4'), [1]);
  assert.deepEqual(search('no such game'), []);

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
  const megaGame = 'soulgold-mega-xtream';
  await assert.rejects(patch(emeraldHeaderOnly, megaGame), /Unsupported SoulGold layout/);

  // A shared Emerald header and renderer signature cannot authorize an out-of-bounds table.
  const invalidTable = new Uint8Array(1024);
  invalidTable.set(emeraldHeaderOnly);
  const rendererOffset = 192;
  const renderer = Buffer.from(soulGoldPatch.renderer, 'hex');
  invalidTable.set(renderer, rendererOffset);
  const literalOffset = rendererOffset + 4 + renderer[0] * 4;
  new DataView(invalidTable.buffer).setUint32(literalOffset, 0x080003f0, true);
  await assert.rejects(patch(invalidTable, megaGame), /Unsupported SoulGold layout/);

  const {patchCrest, crestPatch} = await import('../src/lib/crest.js');
  await assert.rejects(patchCrest(new Uint8Array(192)), /supported, unpatched Emerald Crest/);

  const {patchWallyQuest, wallyQuestPatch} = await import('../src/lib/wally-quest.js');
  await assert.rejects(patchWallyQuest(new Uint8Array(32 * 1024 * 1024)), /unpatched Pok.*Wally Quest/);
  const {patchUnbound} = await import('../src/lib/unbound.js');
  const {patchThetaEmerald, thetaEmeraldPatch} = await import('../src/lib/theta-emerald.js');
  await assert.rejects(patchUnbound(new Uint8Array(192)), /Choose Pok.*Unbound/);
  await assert.rejects(patchThetaEmerald(emeraldHeaderOnly), /unpatched Pok.*Theta Emerald/);
  const unsupportedEmerald = new Uint8Array(32 * 1024 * 1024);
  unsupportedEmerald.set(emeraldHeaderOnly);
  await assert.rejects(patchThetaEmerald(unsupportedEmerald), /unpatched Pok.*Theta Emerald/);
  const otherFireRed = new Uint8Array(32 * 1024 * 1024);
  otherFireRed.set(Buffer.from('POKEMON FIREBPRE01\x96', 'latin1'), 0xa0);
  otherFireRed[0xbd] = 0x68;
  await assert.rejects(patchUnbound(otherFireRed), /Choose Pok.*Unbound/);
  const englishStart = '1cb911832c719bb72119293def174801e637130e5cefc5ad7dbd1e20aa217251';
  const thaiStart = '1d2049795e0d95a43eb91c4b8dfc55100e8e49284e4e2aa00d3ea3c50c6ce3df';
  const unboundFixtures = new Map([
    ['7aa25bbf568f7cfcf6ee1cf2e9e6ff637350b3d0705c2375cabb6baa7d9739f7', englishStart],
    ['4619d6df7e3ec3a37bb8fd97e506da7b0687ddcb55f1475f76a0726121cdf1b7', englishStart],
    ['f793fa46f751ffbfc0ff4f2cd6dd4f0c8d0b95359715750c82c8d26a40e30250', thaiStart],
    ['42d211176c1537c73fedec646c8925952f24507cdc91f0af64433f4055c0b80e', thaiStart]
  ]);

  const fixtures = new Map([
    ['2cbd389822d80db1b7575b4e064e155bcfdbe17d000b324076d99fa6f7a8804b', { target: '9cc2de4679a7e1c2e79ca2ff2541e0835d6b08fa4c9c3ba484f16f8c6364bce3' }],
    ['01a6af0953a68732579360988edd3338e5b24d2e48248f3239e851adf2557b31', { target: 'ace9e07650a857ff928dec1ebbaa23f7cfe9fa8cb387da655132e1e72c20e134' }],
    ['338f3bb39f3b315aaa6c3e358c0812c1a4e1e0f70e6d9e10f7ef857e9f5dde2f', { game: megaGame, target: '0033c4412a6926ac3b2a08b134102963af208e4a715ebabede707fbdadf4747d' }]
  ]);
  for (const file of process.argv.slice(2)) {
    const input = Uint8Array.from(fs.readFileSync(file));
    const hash = bytes => createHash('sha256').update(bytes).digest('hex');
    const before = hash(input);
    if (before === thetaEmeraldPatch.source) {
      const {output, verified} = await patchThetaEmerald(input);
      assert.equal(verified, true);
      assert.equal(hash(output), 'd64c7b300a5234117f9524cbea3c608616f88df47112f5bbfc515efcd3ac7604');
      assert.equal(hash(input), before, 'The source ROM must remain unchanged');
      await assert.rejects(patchThetaEmerald(output), /unpatched Pok.*Theta Emerald/);
      console.log('Verified Theta Emerald patch for ' + file);
      continue;
    }
    if (unboundFixtures.has(before)) {
      const {output, verified} = await patchUnbound(input);
      assert.equal(verified, true);
      assert.equal(hash(output), unboundFixtures.get(before));
      assert.equal(hash(input), before, 'The source ROM must remain unchanged');
      await assert.rejects(patchUnbound(output), /Choose Pok.*Unbound/);
      const variant = input.slice();
      variant[0xbc] ^= 1;
      await assert.rejects(patchUnbound(variant), /Choose Pok.*Unbound/);
      console.log('Verified Pokémon Unbound patch for ' + file);
      continue;
    }
    if (before === wallyQuestPatch.source) {
      const {output, verified} = await patchWallyQuest(input);
      assert.equal(verified, true);
      assert.equal(hash(output), '06e73d932827d072ced16d00ce9e8621550d545794bd1332b2872aaee91ff4ea');
      assert.equal(hash(input), before, 'The source ROM must remain unchanged');
      await assert.rejects(patchWallyQuest(output), /unpatched Pok.*Wally Quest/);
      await assert.rejects(patch(input), /SoulGold/);
      console.log('Verified Wally Quest patch for ' + file);
      continue;
    }
    if (before === crestPatch.source) {
      const {output, verified} = await patchCrest(input);
      assert.equal(verified, true);
      assert.equal(hash(output), '4e4e157dede42798988bbddcff6c81944583d926dcec95635b0ba5084c5f8ddd');
      assert.equal(hash(input), before, 'The source ROM must remain unchanged');
      await assert.rejects(patchCrest(output), /unpatched Emerald Crest/);
      await assert.rejects(patch(input), /SoulGold/);
      console.log('Verified Emerald Crest patch for ' + file);
      continue;
    }
    await assert.rejects(patchCrest(input), /unpatched Emerald Crest/);
    const fixture = fixtures.get(before);
    assert.ok(fixture, 'Expected a known SoulGold fixture');
    const {game, target} = fixture;
    await assert.rejects(patch(input, game === megaGame ? 'soulgold' : megaGame), /SoulGold/);
    const {output, verified} = await patch(input, game);
    assert.equal(verified, true);
    assert.equal(hash(input), before, 'The source ROM must remain unchanged');
    assert.equal(hash(output), target);
    await assert.rejects(patch(output, game), /already patched/);
    const variant = input.slice();
    variant[0xbc] = (variant[0xbc] + 1) & 255;
    variant[0xbd] = (variant[0xbd] - 1) & 255;
    const alternate = await patch(variant, game);
    assert.equal(alternate.verified, false, 'A changed build must not claim emulator verification');
    const normalized = alternate.output;
    normalized.set(input.subarray(0xbc, 0xbe), 0xbc);
    assert.equal(hash(normalized), hash(output), 'Apply the same patch to a structurally matching variant');
    const profiles = soulGoldPatch.profiles;
    const originalCallback = Buffer.from(profiles.find(profile => profile.source === before).callback, 'hex');
    const callback = Buffer.from(variant.buffer).indexOf(originalCallback);
    assert.ok(callback > 0);
    variant[callback] ^= 1;
    await assert.rejects(patch(variant, game), /Unsupported SoulGold layout/, 'Reject a changed callback');
    console.log('Verified SoulGold patch for ' + file);
  }
  console.log('Navigation, ROM loading and patch regression tests passed');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
