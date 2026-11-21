import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const rain = readFileSync(new URL('../src/ItemRain.vue', import.meta.url), 'utf8');

test('item rain is decorative and does not block page interaction', () => {
  assert.match(rain, /class="item-rain" aria-hidden="true"/);
  assert.match(rain, /\.item-rain\s*\{[^}]+pointer-events: none;/);
  assert.doesNotMatch(rain, /<dialog\b|showModal\(/);
});

test('item rain plays per page load and respects reduced motion', () => {
  assert.doesNotMatch(rain, /(?:sessionStorage|localStorage)/);
  assert.match(rain, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches/);
});

test('patch burst appears after download starts and respects reduced motion', () => {
  const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
  const burst = readFileSync(new URL('../src/PatchBurst.vue', import.meta.url), 'utf8');
  assert.match(app, /link\.click\(\);[\s\S]*?status\.value = verified \? 'success' : 'untested';\s*patchBurst\.value\+\+/);
  assert.match(app, /<PatchBurst v-if="status === 'success' \|\| status === 'untested'" :key="patchBurst"/);
  assert.match(burst, /aria-hidden="true" @animationend\.self="visible = false"/);
  assert.match(burst, /pointer-events: none;/);
  assert.match(burst, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.patch-burst \{ display: none; \}/);
});
