const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {createHash, webcrypto} = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {tmpdir} = require('node:os');
const {join} = require('node:path');

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
  const logo = fs.readFileSync(join(__dirname, '../public/favicon.png'));
  assert.equal(logo.subarray(1, 4).toString(), 'PNG');
  assert.deepEqual([logo.readUInt32BE(16), logo.readUInt32BE(20)], [48, 48]);
  for (const entry of ['index.html', 'misc.html']) {
    assert.match(fs.readFileSync(join(__dirname, '..', entry), 'utf8'), /rel="icon"[^>]+href="\/favicon\.png"/);
  }

  const fixtureDir = fs.mkdtempSync(join(tmpdir(), 'poke-lab-inspect-'));
  const fixture = join(fixtureDir, 'Test ROM.gba');
  const rom = Buffer.alloc(512);
  rom.write('TEST', 0xac);
  rom[0xb2] = 0x96;
  rom[0xbd] = (-0x19 - rom.subarray(0xa0, 0xbd).reduce((sum, byte) => sum + byte, 0)) & 255;
  rom.set(Buffer.from('bed9d6e9dbff', 'hex'), 0x120);
  rom.writeUInt32LE(0x08000120, 0x140);
  rom.writeUInt32LE(0x08000161, 0x144);
  rom.writeUInt16LE(0xb500, 0x160);
  rom.writeUInt16LE(0x4800, 0x162);
  rom.writeUInt32LE(0x08000120, 0x164);
  try {
    fs.writeFileSync(fixture, rom);
    const inspect = (...args) => JSON.parse(execFileSync(process.execPath, [
      join(__dirname, '../tools/inspect-rom.mjs'), fixture, ...args
    ], {encoding: 'utf8'}));
    const report = inspect();
    assert.equal(report.header.checksumValid, true);
    assert.equal(report.sha256, createHash('sha256').update(rom).digest('hex'));
    assert.equal(report.knownInput, null);
    assert.ok(report.menuCandidates.some(match => match.label === 'Debug' &&
      match.references.some(ref => ref.address === '0x08000140' && ref.after === '0x08000160')));
    const {thumb} = inspect('--at', '0x08000160');
    assert.equal(thumb[0].bytes, '00b5');
    assert.equal(thumb[1].literal, '0x08000120');
    assert.deepEqual(fs.readFileSync(fixture), rom);
  } finally {
    if (fs.existsSync(fixture)) fs.unlinkSync(fixture);
    fs.rmdirSync(fixtureDir);
  }

  const {readGbaRom} = await import('../src/lib/rom-file.js');
  const mockRom = Uint8Array.of(1, 2, 3);
  assert.deepEqual(await readGbaRom(new Blob([mockRom]), mockRom.length), mockRom);
  for (const padding of [0x00, 0xff]) {
    const tail = new Uint8Array(1024 * 1024 + 1).fill(padding);
    assert.deepEqual(await readGbaRom(new Blob([mockRom, tail]), mockRom.length), mockRom);
    tail[tail.length - 1] = 1;
    await assert.rejects(readGbaRom(new Blob([mockRom, tail]), mockRom.length), /extra data/);
  }
  const {applyTheme, savedTheme, saveTheme} = await import('../src/lib/theme.js');
  const data = new Map();
  const browser = {localStorage: {getItem: key => data.get(key), setItem: (key, value) => data.set(key, value)}};
  assert.equal(savedTheme(browser), null);
  saveTheme('dark', browser);
  assert.equal(savedTheme(browser), 'dark');
  saveTheme('light', browser);
  assert.equal(savedTheme(browser), 'light');
  const blocked = {get localStorage() { throw new Error('Storage disabled'); }};
  assert.equal(savedTheme(blocked), null);
  assert.doesNotThrow(() => saveTheme('dark', blocked));
  const miscRoot = {dataset: {}};
  applyTheme(miscRoot, 'dark');
  assert.deepEqual(miscRoot.dataset, {theme: 'dark', bsTheme: 'dark'});
  const {patcherLanguage, savePatcherLanguage, patcherCopy} = await import('../src/lib/patcher-language.js');
  browser.navigator = {languages: ['th-TH', 'en-US']};
  assert.equal(patcherLanguage(browser), 'th');
  browser.navigator.languages = ['ja-JP', 'th-TH'];
  assert.equal(patcherLanguage(browser), 'en');
  savePatcherLanguage('th', browser);
  assert.equal(patcherLanguage(browser), 'th');
  savePatcherLanguage('en', browser);
  assert.equal(patcherLanguage(browser), 'en');
  assert.deepEqual(Object.keys(patcherCopy.th), Object.keys(patcherCopy.en));
  const fonts = fs.readFileSync(__dirname + '/../src/fonts.css', 'utf8');
  assert.match(fonts, /@import "@fontsource-variable\/noto-sans-thai-looped"/);
  assert.match(fonts, /--lab-font: "Noto Sans Thai Looped Variable", system-ui, sans-serif/);
  for (const entry of ['main.js', 'misc-font.js']) {
    assert.match(fs.readFileSync(__dirname + '/../src/' + entry, 'utf8'), /import '\.\/fonts\.css'/);
  }
  assert.match(html, /font-family:var\(--lab-font,system-ui\)/);
  assert.equal(patcherCopy.en.language, 'Page language');
  assert.equal(patcherCopy.en.projectPage, 'Project page');
  assert.equal(patcherCopy.th.projectPage, 'หน้าโครงการ');
  assert.equal(patcherCopy.en.supportProject, 'Support this project');
  assert.equal(patcherCopy.en.supportFeedback, 'You can include feedback with your donation.');
  assert.equal(patcherCopy.th.supportProject, 'สนับสนุนโครงการนี้');
  assert.equal(patcherCopy.th.supportFeedback, 'คุณสามารถฝากความคิดเห็นพร้อมการสนับสนุนได้');
  const {default: initSqlJs} = await import('sql.js');
  const catalog = new (await initSqlJs()).Database();
  try {
    catalog.run(fs.readFileSync(__dirname + '/../src/data/catalog.sql', 'utf8'));
    const [notes] = catalog.exec('SELECT patch_note, patch_note_th FROM games ORDER BY sort_order');
    assert.equal(notes.values.length, 8);
    const [nationalDex] = catalog.exec("SELECT g.menu_hint, b.name FROM games g JOIN builds b ON g.id = b.game_id WHERE g.id = 'national-dex' ORDER BY b.sort_order");
    assert.deepEqual(nationalDex.values, [['Start > Cheat', 'Standard'], ['Start > Cheat', 'Lite']]);
    const [details] = catalog.exec('SELECT id, description, description_th, project_url FROM games WHERE description IS NOT NULL OR description_th IS NOT NULL OR project_url IS NOT NULL');
    assert.equal(details.values.length, 1);
    assert.equal(details.values[0][0], 'national-dex');
    assert.match(details.values[0][1], /386 Pokémon/);
    assert.match(details.values[0][2], /ครบทั้ง 386 ตัว/);
    assert.equal(details.values[0][3], 'https://www.romhacking.net/hacks/1991/');
    for (const [english, thai] of notes.values) {
      assert.match(english, /[A-Za-z]/);
      assert.match(thai, /\p{Script=Thai}/u);
    }
    assert.deepEqual(notes.values[0], ['Opens the Debug menu.', 'เปิดเมนู Debug']);
  } finally {
    catalog.close();
  }

  assert.deepEqual(sections.map(([, id]) => id), ['money', 'shop', 'items']);
  assert.deepEqual(tabs.map(([, , id]) => id), ['money', 'shop', 'items']);
  assert.doesNotMatch(src, /\b(?:findDex|findEncounters|scanLocations|renderDex)\b/);
  assert.doesNotMatch(html, /\bid="(?:dex\w*|mapdetail)"/);

  assert.match(html, /<input type="checkbox" id="sprites" checked>/);
  assert.match(html, /<meta name="referrer" content="no-referrer">/);
  const patcherPage = fs.readFileSync(__dirname + '/../index.html', 'utf8');
  assert.match(patcherPage, /<meta name="referrer" content="no-referrer">/);

  const patcherView = fs.readFileSync(__dirname + '/../src/App.vue', 'utf8');
  assert.match(patcherView, /<\/ul>\s*<p v-if="game" id="rom-build-hint"[^>]*>{{ copy\.romHint }}<\/p>/);
  assert.match(patcherView, /:aria-describedby="game \? 'rom-build-hint' : undefined"/);
  const footer = patcherView.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/)?.[1] ?? '';
  assert.match(footer, /<div :lang="language">\s*<a\b[^>]*href="https:\/\/easydonate\.app\/docxed"[^>]*>{{ copy\.supportProject }}<\/a>\s*<p>{{ copy\.supportFeedback }}<\/p>/);
  const deployWorkflow = fs.readFileSync(__dirname + '/../.github/workflows/deploy.yml', 'utf8');
  assert.doesNotMatch(patcherView + deployWorkflow, /VITE_(?:VISIT_COUNTER_URL|GOATCOUNTER_SITE)|showVisits/);
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
  input.files = [{
    name: 'padded.bin',
    size: 32 * 1024 * 1024 + 1,
    slice: (start, end) => {
      assert.equal(start, 0);
      assert.equal(end, 32 * 1024 * 1024);
      return {arrayBuffer: async () => bytes};
    }
  }];
  await input.onchange();
  assert.match(elements.get('romstatus').textContent, /^padded\.bin .* \(first 32 MiB scanned\)$/);
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
  const {patchG3e, g3ePatch} = await import('../src/lib/g3e.js');
  await assert.rejects(patchG3e(new Uint8Array(192)), /unpatched Generation 3 Evolved/);
  const unsupportedEmerald = new Uint8Array(32 * 1024 * 1024);
  unsupportedEmerald.set(emeraldHeaderOnly);
  await assert.rejects(patchThetaEmerald(unsupportedEmerald), /unpatched Pok.*Theta Emerald/);
  const {patchNationalDex, nationalDexPatch} = await import('../src/lib/national-dex.js');
  await assert.rejects(patchNationalDex(unsupportedEmerald.subarray(0, nationalDexPatch.sourceSize)), /unpatched Pok.*Complete National Dex Edition/);
  const nationalDexFixtures = new Map([
    ['8a80807472ab4bc95f1e9e577873866849971cbe3d64b1d86475205b5be29836', '19c41f795d2f8bbc17c5e9b2792107ee07838bfae005e750cdb28e144ccbe7dd'],
    ['6c306f7e4de72f09006da2a76b08e66b8438d3cdcab8b06b9ec9280350821d50', 'ffa2b363185260f38973fabefe2f5f808516cc8d63971bc91b9308a681319ab2']
  ]);
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
    if (nationalDexFixtures.has(before)) {
      const {output, verified, filename} = await patchNationalDex(input);
      const suffix = before.startsWith('6c306f') ? ' Lite' : '';
      assert.equal(filename, `Pokemon Emerald Complete National Dex Edition${suffix}-Cheat.gba`);
      assert.equal(verified, true);
      assert.equal(hash(output), nationalDexFixtures.get(before));
      assert.equal(hash(input), before, 'The source ROM must remain unchanged');
      assert.equal(output.length, input.length);
      const padded = await readGbaRom(new Blob([input, Uint8Array.of(0xff)]), nationalDexPatch.sourceSize);
      assert.equal(hash((await patchNationalDex(padded)).output), hash(output));
      await assert.rejects(patchNationalDex(output), /unpatched Pok.*Complete National Dex Edition/);
      console.log('Applied the Complete National Dex Edition Start > Cheat patch for ' + file);
      continue;
    }
    if (before === g3ePatch.source) {
      const {output, verified} = await patchG3e(input);
      assert.equal(verified, true);
      assert.equal(hash(output), '30c622e5170bbdc196270be0a20083a2dfc5915f29828b9302da0e2680a453df');
      const patched = new DataView(output.buffer, output.byteOffset, output.byteLength);
      const epilogue = 0x21b0d4 + 24;
      assert.deepEqual([0, 2, 4, 6].map(offset => patched.getUint16(epilogue + offset, true)),
        [0x46c0, 0x2001, 0xbc02, 0x4708], 'Debug opener returns through the original Start epilogue');
      assert.equal(hash(input), before, 'The source ROM must remain unchanged');
      assert.equal(input.length, g3ePatch.sourceSize);
      await assert.rejects(patchG3e(output), /unpatched Generation 3 Evolved/);
      console.log('Applied the Generation 3 Evolved Start > Cheat patch for ' + file);
      continue;
    }
    if (before === thetaEmeraldPatch.source) {
      const {output, verified} = await patchThetaEmerald(input);
      assert.equal(verified, true);
      assert.equal(hash(output), 'd64c7b300a5234117f9524cbea3c608616f88df47112f5bbfc515efcd3ac7604');
      assert.equal(hash(input), before, 'The source ROM must remain unchanged');
      const padded = await readGbaRom(new Blob([input, Uint8Array.of(0xff, 0xff)]));
      assert.equal(hash((await patchThetaEmerald(padded)).output), hash(output));
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
      assert.equal(input.length, crestPatch.sourceSize);
      const padded = await readGbaRom(new Blob([input, new Uint8Array(32 * 1024 * 1024 - input.length + 1)]), crestPatch.sourceSize);
      assert.equal(hash((await patchCrest(padded)).output), hash(output));
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
