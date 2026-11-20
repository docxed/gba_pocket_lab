import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import {
  VApp, VAutocomplete, VBtn,
  VIcon, VListItem, VTab, VTabs
} from 'vuetify/components';
import 'vuetify/styles';
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';
import {
  mdiCheck, mdiChevronDown, mdiClose, mdiDotsHorizontal, mdiDownloadOutline, mdiFileCheckOutline,
  mdiFlaskOutline, mdiGamepadVariantOutline, mdiLockOutline, mdiMagnify, mdiTrayArrowUp, mdiWeatherNight, mdiWhiteBalanceSunny
} from '@mdi/js';
import '@fontsource-variable/noto-sans';
import './style.css';
import App from './App.vue';

const vuetify = createVuetify({
  components: {
    VApp, VAutocomplete, VBtn,
    VIcon, VListItem, VTab, VTabs
  },
  icons: {
    defaultSet: 'mdi',
    sets: { mdi },
    aliases: {
      ...aliases,
      labFlask: mdiFlaskOutline, labGamepad: mdiGamepadVariantOutline, labMisc: mdiDotsHorizontal,
      labChevron: mdiChevronDown, labFile: mdiFileCheckOutline, labUpload: mdiTrayArrowUp,
      labClose: mdiClose, labLock: mdiLockOutline, labDownload: mdiDownloadOutline,
      labSearch: mdiMagnify, labCheck: mdiCheck, labMoon: mdiWeatherNight, labSun: mdiWhiteBalanceSunny
    }
  },
  theme: {
    defaultTheme: 'lab',
    themes: {
      lab: {
        dark: false,
        colors: { primary: '#5003C0', secondary: '#AB03A9', accent: '#FF467A', highlight: '#FFD51E' }
      },
      labDark: {
        dark: true,
        colors: { primary: '#D1B1FF', 'on-primary': '#231337', surface: '#241A30', background: '#171021' }
      }
    }
  }
});

createApp(App).use(vuetify).mount('#app');
