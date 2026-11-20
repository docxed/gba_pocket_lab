import './fonts.css';
import { applyTheme, savedTheme } from './lib/theme.js';

applyTheme(document.documentElement,
  savedTheme() ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
