<script setup>
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { crestPatch, patchCrest } from './lib/crest.js';
import { patchWallyQuest } from './lib/wally-quest.js';
import { patchUnbound } from './lib/unbound.js';
import { nationalDexPatch, patchNationalDex } from './lib/national-dex.js';
import { patchOriginHeartGold } from './lib/origin-heart-gold.js';
import { patchHnsLegends } from './lib/hns-legends.js';
import { patchG3e } from './lib/g3e.js';
import { patchThetaEmerald } from './lib/theta-emerald.js';
import patcherBanner from './assets/patcher-banner.webp';
import { loadCatalog } from './lib/catalog.js';
import { patchSoulGold } from './lib/soulgold.js';
import { readGbaRom } from './lib/rom-file.js';
import ItemRain from './ItemRain.vue';
import PatchBurst from './PatchBurst.vue';
import BannerJackpot from './BannerJackpot.vue';
import JackpotLogo from './JackpotLogo.vue';
import { applyTheme, savedTheme, saveTheme } from './lib/theme.js';
import { patcherCopy, patcherLanguage, savePatcherLanguage } from './lib/patcher-language.js';

const page = ref(location.hash === '#misc' ? 'misc' : 'patch');
const games = ref([]);
const selectedGame = ref(null);
const gameSearch = ref('');
const patchers = {
  soulgold: patchSoulGold,
  'soulgold-mega-xtream': rom => patchSoulGold(rom, 'soulgold-mega-xtream'),
  'emerald-crest': patchCrest,
  'wally-quest': patchWallyQuest,
  unbound: patchUnbound,
  'theta-emerald': patchThetaEmerald,
  'generation-3-evolved': patchG3e,
  'national-dex': patchNationalDex,
  'hns-legends': patchHnsLegends,
  'origin-heart-gold': patchOriginHeartGold
};
const romSizes = {
  'emerald-crest': crestPatch.sourceSize,
  'national-dex': nationalDexPatch.sourceSize
};
const game = computed(() => games.value.find(option => option.id === selectedGame.value));
const platform = computed(() => game.value?.platform ?? 'GBA');
const platformGames = computed(() => games.value.filter(option => option.platform === platform.value));
const fileInput = ref();
const file = shallowRef(null);
const drag = ref(false);
const busy = ref(false);
const patchBurst = ref(0);
const status = ref('');
const statusDetail = ref('');
const failed = ref(false);
const language = ref(patcherLanguage());
const copy = computed(() => patcherCopy[language.value]);
const menuHint = computed(() => language.value === 'th' ? game.value?.menuHintTh ?? game.value?.menuHint : game.value?.menuHint);
const romHint = computed(() => platform.value === 'NDS' ? copy.value.ndsRomHint : copy.value.romHint);
const miscOpened = ref(page.value === 'misc');
const miscFrame = ref();
const miscHeight = ref(670);
const miscUrl = import.meta.env.BASE_URL + 'misc.html';
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
const themePreference = ref(savedTheme());
const systemDark = ref(systemTheme.matches);
const theme = computed(() => themePreference.value ?? (systemDark.value ? 'dark' : 'light'));

function syncMiscTheme() {
  applyTheme(miscFrame.value?.contentDocument?.documentElement, theme.value);
}

watch(theme, value => {
  applyTheme(document.documentElement, value);
  syncMiscTheme();
}, { immediate: true });

function syncSystemTheme(event) {
  systemDark.value = event.matches;
}

function toggleTheme() {
  themePreference.value = theme.value === 'dark' ? 'light' : 'dark';
  saveTheme(themePreference.value);
}

function chooseLanguage(next) {
  language.value = next;
  savePatcherLanguage(next);
}

onMounted(async () => {
  systemTheme.addEventListener('change', syncSystemTheme);
  window.addEventListener('message', resizeMisc);
  window.addEventListener('hashchange', syncRoute);
  window.addEventListener('popstate', syncRoute);
  try {
    games.value = Object.values(await loadCatalog());
    syncRoute();
  } catch {
    failed.value = true;
    status.value = 'catalogError';
  }
});
onBeforeUnmount(() => {
  systemTheme.removeEventListener('change', syncSystemTheme);
  window.removeEventListener('message', resizeMisc);
  window.removeEventListener('hashchange', syncRoute);
  window.removeEventListener('popstate', syncRoute);
});

function syncRoute() {
  page.value = location.hash === '#misc' ? 'misc' : 'patch';
  if (page.value === 'misc') miscOpened.value = true;
  const url = new URL(location.href);
  const requested = url.searchParams.get('rom');
  const next = games.value.find(option => option.id === requested) ?? games.value[0];
  if (!next) return;
  if (selectedGame.value !== next.id) {
    selectedGame.value = next.id;
    gameSearch.value = '';
    removeFile();
  }
  if (requested !== next.id) {
    url.searchParams.set('rom', next.id);
    history.replaceState(history.state, '', url);
  }
}

function chooseGame(id) {
  if (!games.value.some(option => option.id === id) || id === selectedGame.value) return;
  const url = new URL(location.href);
  url.searchParams.set('rom', id);
  history.pushState(history.state, '', url);
  syncRoute();
}

function choosePlatform(next) {
  const firstGame = games.value.find(option => option.platform === next);
  if (firstGame && next !== platform.value) chooseGame(firstGame.id);
}

function openPage(next) {
  location.hash = next === 'misc' ? 'misc' : 'patch';
  syncRoute();
}

function resizeMisc(event) {
  if (event.origin !== location.origin || event.source !== miscFrame.value?.contentWindow) return;
  const height = event.data?.height;
  if (event.data?.type === 'poke-lab:misc-height' && Number.isFinite(height) && height > 0) {
    miscHeight.value = Math.ceil(height) + 4;
  }
}

function selectFile(next) {
  if (busy.value || !next) return;
  failed.value = false;
  file.value = next;
  status.value = '';
}

function inputChanged(event) {
  selectFile(event.target.files[0]);
  event.target.value = '';
}

function dropFile(event) {
  drag.value = false;
  if (event.dataTransfer.files.length === 1) selectFile(event.dataTransfer.files[0]);
  else if (event.dataTransfer.files.length > 1 && !busy.value) {
    failed.value = true;
    status.value = 'multipleFiles';
  }
}

function removeFile() {
  file.value = null;
  failed.value = false;
  status.value = '';
}

async function download() {
  const gameId = selectedGame.value;
  const patcher = patchers[gameId];
  if (!file.value || !patcher || busy.value) return;
  const input = file.value;
  busy.value = true;
  failed.value = false;
  status.value = 'patching';
  try {
    const rom = platform.value === 'NDS' ? input : await readGbaRom(input, romSizes[gameId]);
    const { output, verified, filename } = await patcher(rom);
    if (file.value !== input) return;
    const url = URL.createObjectURL(new Blob([output], { type: 'application/octet-stream' }));
    const link = document.createElement('a');
    link.href = url;
    const stem = input.name.replace(/\.(?:gba|bin)$/i, '');
    link.download = filename ?? (gameId === 'unbound' ? stem.replace(/-Cheat$/i, '') + '-Start-Cheat.gba' : stem + '-Cheat.gba');
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    statusDetail.value = menuHint.value;
    status.value = verified ? 'success' : 'untested';
    patchBurst.value++;
  } catch (error) {
    if (file.value === input) {
      failed.value = true;
      statusDetail.value = error.message;
      status.value = 'patchError';
    }
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <v-app class="lab-app" :theme="theme === 'dark' ? 'labDark' : 'lab'">
    <ItemRain />
    <header class="site-header">
      <div class="shell flex items-center justify-between gap-4">
        <a class="wordmark flex items-center gap-3" href="#patch" aria-label="Poke Lab home" @click.prevent="openPage('patch')">
          <JackpotLogo />
          <span>Poké<span class="wordmark-lab"> Lab</span></span>
        </a>
        <div class="header-tools">
          <nav aria-label="Tools">
            <v-tabs :model-value="page" class="site-tabs" hide-slider @update:model-value="openPage">
              <v-tab value="patch" prepend-icon="$labGamepad">Patcher</v-tab>
              <v-tab value="misc" prepend-icon="$labMisc">Misc</v-tab>
            </v-tabs>
          </nav>
          <v-btn class="theme-toggle" variant="text" :icon="theme === 'dark' ? '$labSun' : '$labMoon'"
            :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleTheme" />
        </div>
      </div>
    </header>

    <main class="shell site-main">
      <section v-show="page === 'patch'" aria-labelledby="patch-heading">
        <div class="patch-hero">
          <img class="patch-banner" :src="patcherBanner" alt="" width="1024" height="338">
          <BannerJackpot v-if="page === 'patch'" />
          <div class="patch-hero-copy">
            <h1 id="patch-heading" class="page-heading">ROM Patcher</h1>
            <p v-if="platform === 'NDS'" class="patch-intro">Add a <strong>Cheat</strong> shortcut to the overworld.</p>
            <p v-else-if="game?.id === 'wally-quest'" class="patch-intro"><strong>Max Cheats</strong> fills your wallet and tops up Rare Candies and Master Balls.</p>
            <p v-else class="patch-intro">Add <strong>Cheat</strong> to the game's Start menu.</p>
          </div>
        </div>
        <div class="patch-card" :lang="language">
          <div class="patch-fields">
            <div class="game-field">
              <div class="game-field-heading">
                <label for="game-select" class="field-label">{{ copy.game }}</label>
                <div class="language-toggle" role="group" aria-labelledby="page-language-label">
                  <span id="page-language-label">{{ copy.language }}</span>
                  <button type="button" lang="en" aria-label="English" title="English" :aria-pressed="language === 'en'" @click="chooseLanguage('en')">
                    <span class="language-flag language-flag-en" aria-hidden="true"></span>
                  </button>
                  <button type="button" lang="th" aria-label="ภาษาไทย" title="ภาษาไทย" :aria-pressed="language === 'th'" @click="chooseLanguage('th')">
                    <span class="language-flag language-flag-th" aria-hidden="true"></span>
                  </button>
                </div>
              </div>
              <div class="mb-3 flex gap-2" role="group" :aria-label="copy.platform">
                <v-btn v-for="option in ['GBA', 'NDS']" :key="option" size="small"
                  :variant="platform === option ? 'flat' : 'outlined'" color="primary"
                  :aria-pressed="platform === option" :disabled="!games.length || busy"
                  @click="choosePlatform(option)">{{ option }}</v-btn>
              </div>
              <v-autocomplete
                id="game-select" :model-value="selectedGame" @update:model-value="chooseGame" :items="platformGames" item-title="name" item-value="id"
                v-model:search="gameSearch"
                :filter-keys="['title', 'raw.builds']" ignore-accents auto-select-first
                :disabled="!games.length || busy" variant="outlined" density="comfortable" hide-details
                :placeholder="copy.search" autocomplete="off"
                menu-icon="$labChevron" :menu-props="{ contentClass: 'game-menu', offset: 6 }" class="game-select"
              >
                <template #prepend-inner>
                  <span class="game-search-icon" aria-hidden="true"><v-icon icon="$labSearch" size="19" /></span>
                  <span v-if="game && !gameSearch" class="game-search-hint" aria-hidden="true">{{ copy.search }}</span>
                </template>
                <template #selection="{ item }">
                  <span class="game-option"><img v-if="item.cover" :src="item.cover" alt=""><span>{{ item.name }}</span></span>
                </template>
                <template #item="{ item, props }">
                  <v-list-item v-bind="props" role="option" :subtitle="item.builds.join(' · ')" class="game-result">
                    <template v-if="item.cover" #prepend><img class="game-cover" :src="item.cover" alt=""></template>
                    <template #append>
                      <v-icon v-if="item.id === selectedGame" icon="$labCheck" size="18" class="game-result-check" />
                    </template>
                  </v-list-item>
                </template>
                <template #no-data>
                  <div class="game-menu-empty" :lang="language">{{ copy.noGames }}</div>
                </template>
              </v-autocomplete>
              <p v-if="game?.descriptions[language]" class="game-description" :lang="language">
                {{ game.descriptions[language] }}
                <a v-if="game.projectUrl" :href="game.projectUrl" target="_blank" rel="noopener noreferrer">{{ copy.projectPage }}</a>
              </p>
              <ul v-if="game" class="build-list flex flex-wrap gap-2" :aria-label="copy.builds">
                <li v-for="build in game.builds" :key="build" lang="en">{{ build }}</li>
              </ul>
              <p v-if="game" id="rom-build-hint" class="rom-build-hint">{{ romHint }}</p>
            </div>

            <div class="rom-field">
              <div class="field-label">{{ copy.rom }}</div>
              <input ref="fileInput" type="file" hidden @change="inputChanged">
              <div class="dropzone" :class="{ dragging: drag, selected: file }" @dragover.prevent="drag = true" @dragleave="drag = false" @drop.prevent="dropFile">
                <button type="button" class="file-choose" :disabled="busy" :aria-describedby="game ? 'rom-build-hint' : undefined" @click="fileInput.click()">
                  <span class="file-icon"><v-icon :icon="file ? '$labFile' : '$labUpload'" size="23" /></span>
                  <span class="file-copy">
                    <strong>{{ file ? file.name : copy.choose }}</strong>
                    <small>{{ file ? copy.replace : platform === 'NDS' ? copy.ndsFileType : copy.fileType }}</small>
                  </span>
                </button>
                <v-btn v-if="file" icon="$labClose" :aria-label="copy.remove" variant="text" density="comfortable" :disabled="busy" @click="removeFile" />
              </div>
            </div>
          </div>

          <div v-if="game" class="patch-note">
            <strong>{{ menuHint }}</strong>
            <p>{{ game.patchNotes[language] }}</p>
          </div>

          <div class="patch-actions flex flex-wrap items-center justify-between gap-4">
            <span class="privacy flex items-center gap-2"><v-icon icon="$labLock" size="17" /> {{ copy.privacy }}</span>
            <div class="patch-button-wrap">
              <v-btn
                class="patch-button" color="primary" variant="flat" prepend-icon="$labDownload"
                :loading="busy" :disabled="!file || !patchers[selectedGame]" @click="download"
              >{{ copy.patch }}</v-btn>
              <PatchBurst v-if="status === 'success' || status === 'untested'" :key="patchBurst" />
            </div>
          </div>
          <p v-if="status" class="feedback" :class="{ error: failed }" :role="failed ? 'alert' : 'status'">
            <template v-if="status === 'success' || status === 'untested'">{{ platform === 'NDS' ? copy.ndsSuccess : copy.success }} <span>{{ statusDetail }}</span>.<template v-if="status === 'untested'"> {{ copy.untested }}</template></template>
            <template v-else-if="status === 'patchError'"><span v-if="language === 'th'">{{ copy.patchError }} </span><span lang="en">{{ statusDetail }}</span></template>
            <template v-else>{{ copy[status] }}</template>
          </p>
        </div>
      </section>

      <section v-if="miscOpened" v-show="page === 'misc'" class="misc" aria-labelledby="misc-heading">
        <h1 id="misc-heading">Misc tools</h1>
        <iframe ref="miscFrame" :src="miscUrl" :style="{ height: miscHeight + 'px' }" title="Money, shop, and item tools" @load="syncMiscTheme"></iframe>
      </section>
    </main>

    <footer class="shell footer flex flex-wrap items-center justify-between gap-3">
      <span>Made by <strong>Psykedelik</strong></span>
      <details class="privacy-details">
        <summary>Privacy</summary>
        <p>ROMs, RAM dumps, and pasted debugger logs stay in your browser. The patcher downloads a separate ROM and leaves your original file and saves untouched.</p>
        <p>Shared links contain the selected game ID. Misc loads libraries from jsDelivr and requests icons from GitHub by item name. You can turn off online item icons in Misc.</p>
      </details>
      <div :lang="language">
        <a class="footer-support-link" href="https://easydonate.app/docxed" rel="noreferrer">{{ copy.supportProject }}</a>
        <p>{{ copy.supportFeedback }}</p>
      </div>
      <span>v0.51</span>
    </footer>
  </v-app>
</template>
