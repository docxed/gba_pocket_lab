import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import {
  VApp, VAutocomplete, VBtn, VCard, VCardActions, VCardText, VCardTitle, VDialog,
  VIcon, VListItem, VSpacer, VTab, VTabs
} from 'vuetify/components';
import 'vuetify/styles';
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';
import {
  mdiCheck, mdiChevronDown, mdiClose, mdiDotsHorizontal, mdiDownloadOutline, mdiFileCheckOutline,
  mdiFlaskOutline, mdiGamepadVariantOutline, mdiLockOutline, mdiMagnify, mdiTrayArrowUp
} from '@mdi/js';
import '@fontsource-variable/noto-sans';
import './style.css';
import App from './App.vue';

const vuetify = createVuetify({
  components: {
    VApp, VAutocomplete, VBtn, VCard, VCardActions, VCardText, VCardTitle, VDialog,
    VIcon, VListItem, VSpacer, VTab, VTabs
  },
  icons: {
    defaultSet: 'mdi',
    sets: { mdi },
    aliases: {
      ...aliases,
      labFlask: mdiFlaskOutline, labGamepad: mdiGamepadVariantOutline, labMisc: mdiDotsHorizontal,
      labChevron: mdiChevronDown, labFile: mdiFileCheckOutline, labUpload: mdiTrayArrowUp,
      labClose: mdiClose, labLock: mdiLockOutline, labDownload: mdiDownloadOutline,
      labSearch: mdiMagnify, labCheck: mdiCheck
    }
  },
  theme: {
    defaultTheme: 'lab',
    themes: {
      lab: {
        dark: false,
        colors: { primary: '#5003C0', secondary: '#AB03A9', accent: '#FF467A', highlight: '#FFD51E' }
      }
    }
  }
});

createApp(App).use(vuetify).mount('#app');
