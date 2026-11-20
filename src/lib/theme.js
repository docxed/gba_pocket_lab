const storageKey = 'poke-lab-theme';

export function savedTheme(browser = window) {
  try {
    const theme = browser.localStorage.getItem(storageKey);
    return theme === 'dark' || theme === 'light' ? theme : null;
  } catch {
    return null;
  }
}

export function saveTheme(theme, browser = window) {
  try {
    browser.localStorage.setItem(storageKey, theme);
  } catch {
    // A blocked storage write should not prevent switching the current page.
  }
}

export function applyTheme(root, theme) {
  if (!root) return;
  root.dataset.theme = theme;
  root.dataset.bsTheme = theme;
}
