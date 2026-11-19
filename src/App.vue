<script setup>
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { loadCatalog } from './lib/catalog.js';
import { patchSoulGold, soulGoldPatch } from './lib/soulgold.js';

const page = ref(location.hash === '#misc' ? 'misc' : 'patch');
const games = ref([]);
const selectedGame = ref(null);
const patchers = { soulgold: patchSoulGold };
const game = computed(() => games.value.find(option => option.id === selectedGame.value));
const fileInput = ref();
const file = shallowRef(null);
const drag = ref(false);
const busy = ref(false);
const status = ref('');
const failed = ref(false);
const miscOpened = ref(page.value === 'misc');
const miscFrame = ref();
const miscHeight = ref(670);
const miscUrl = import.meta.env.BASE_URL + 'misc.html';

onMounted(async () => {
  window.addEventListener('message', resizeMisc);
  window.addEventListener('hashchange', syncRoute);
  window.addEventListener('popstate', syncRoute);
  try {
    games.value = Object.values(await loadCatalog());
    syncRoute();
  } catch {
    failed.value = true;
    status.value = 'Could not load the game list. Reload the page to try again.';
  }
});
onBeforeUnmount(() => {
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
  failed.value = !/\.gba$/i.test(next.name) || next.size < 192 || next.size > soulGoldPatch.maxSize;
  file.value = failed.value ? null : next;
  status.value = failed.value ? 'Choose a .gba ROM up to 32 MiB.' : '';
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
    status.value = 'Choose one ROM at a time.';
  }
}

function removeFile() {
  file.value = null;
  failed.value = false;
  status.value = '';
}

async function download() {
  const patcher = patchers[selectedGame.value];
  if (!file.value || !patcher || busy.value) return;
  const input = file.value;
  busy.value = true;
  failed.value = false;
  status.value = 'Checking the ROM and applying the patch...';
  try {
    const { output, verified } = await patcher(new Uint8Array(await input.arrayBuffer()));
    if (file.value !== input) return;
    const url = URL.createObjectURL(new Blob([output], { type: 'application/octet-stream' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = input.name.replace(/\.gba$/i, '') + '-Cheat.gba';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    status.value = verified
      ? 'Patched. Open the new ROM and choose Start > Cheat.'
      : 'Patched. This build passed structure checks and still needs emulator testing.';
  } catch (error) {
    if (file.value === input) {
      failed.value = true;
      status.value = error.message;
    }
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <v-app class="lab-app">
    <header class="site-header">
      <div class="shell flex items-center justify-between gap-4">
        <a class="wordmark flex items-center gap-3" href="#patch" aria-label="Poke Lab home" @click.prevent="openPage('patch')">
          <span class="logo" aria-hidden="true"><v-icon icon="$labFlask" size="23" /></span>
          <span>Poké<span class="wordmark-lab"> Lab</span></span>
        </a>
        <nav aria-label="Tools">
          <v-tabs :model-value="page" class="site-tabs" hide-slider @update:model-value="openPage">
            <v-tab value="patch" prepend-icon="$labGamepad">Patcher</v-tab>
            <v-tab value="misc" prepend-icon="$labMisc">Misc</v-tab>
          </v-tabs>
        </nav>
      </div>
    </header>

    <main class="shell site-main">
      <section v-show="page === 'patch'" aria-labelledby="patch-heading">
        <h1 id="patch-heading" class="page-heading">ROM Patcher</h1>
        <p class="patch-intro">Add <strong>Cheat</strong> to the game's Start menu.</p>
        <div class="patch-card">
          <div class="patch-fields">
            <div class="game-field">
              <label for="game-select" class="field-label">Game</label>
              <v-select
                id="game-select" :model-value="selectedGame" @update:model-value="chooseGame" :items="games" item-title="name" item-value="id"
                :disabled="!games.length || busy" variant="outlined" density="comfortable" hide-details
                aria-label="Game" menu-icon="$labChevron" class="game-select"
              >
                <template #selection="{ item }">
                  <span class="game-option"><img :src="item.cover" alt="">{{ item.name }}</span>
                </template>
                <template #item="{ item, props }">
                  <v-list-item v-bind="props">
                    <template #prepend><img class="game-cover" :src="item.cover" alt=""></template>
                  </v-list-item>
                </template>
              </v-select>
              <ul v-if="game" class="build-list flex flex-wrap gap-2" aria-label="Tested builds">
                <li v-for="build in game.builds" :key="build">{{ build }}</li>
              </ul>
            </div>

            <div class="rom-field">
              <div class="field-label">ROM file</div>
              <input ref="fileInput" type="file" accept=".gba" hidden @change="inputChanged">
              <div class="dropzone" :class="{ dragging: drag, selected: file }" @dragover.prevent="drag = true" @dragleave="drag = false" @drop.prevent="dropFile">
                <button type="button" class="file-choose" :disabled="busy" @click="fileInput.click()">
                  <span class="file-icon"><v-icon :icon="file ? '$labFile' : '$labUpload'" size="23" /></span>
                  <span class="file-copy">
                    <strong>{{ file ? file.name : 'Choose or drop a ROM' }}</strong>
                    <small>{{ file ? 'Click to replace' : '.gba file' }}</small>
                  </span>
                </button>
                <v-btn v-if="file" icon="$labClose" aria-label="Remove ROM" variant="text" density="comfortable" :disabled="busy" @click="removeFile" />
              </div>
            </div>
          </div>

          <div class="patch-actions flex flex-wrap items-center justify-between gap-4">
            <span class="privacy flex items-center gap-2"><v-icon icon="$labLock" size="17" /> Your ROM stays on this device.</span>
            <v-btn
              class="patch-button" color="primary" variant="flat" prepend-icon="$labDownload"
              :loading="busy" :disabled="!file || !patchers[selectedGame]" @click="download"
            >Patch &amp; download</v-btn>
          </div>
          <p v-if="status" class="feedback" :class="{ error: failed }" :role="failed ? 'alert' : 'status'">{{ status }}</p>
        </div>
      </section>

      <section v-if="miscOpened" v-show="page === 'misc'" class="misc" aria-labelledby="misc-heading">
        <h1 id="misc-heading">Misc tools</h1>
        <iframe ref="miscFrame" :src="miscUrl" :style="{ height: miscHeight + 'px' }" title="Money, shop, and item tools"></iframe>
      </section>
    </main>

    <footer class="shell footer flex flex-wrap items-center justify-between gap-3">
      <span>Made by <strong>Psykedelik</strong></span>
      <span>v0.26</span>
    </footer>
  </v-app>
</template>
