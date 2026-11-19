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
