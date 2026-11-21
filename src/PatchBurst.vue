<script setup>
import { ref } from 'vue';
import rareCandy from './assets/rare-candy.png';
import masterBall from './assets/master-ball.png';
import goldCoin from './assets/relic-gold.png';

const visible = ref(true);
const sprites = [rareCandy, masterBall, goldCoin];
const trajectories = [
  [-3, -1.2], [-2.7, -2.5], [-1.9, -3.3], [-1.1, -2.1], [-.4, -3.9], [.5, -2.9],
  [1.1, -3.7], [1.8, -2.3], [2.6, -3.1], [3, -1.5], [-2.3, -.5], [2.2, -.6],
  [-1.1, -.6], [.3, -1.5], [1.2, -.5]
];
</script>

<template>
  <span v-if="visible" class="patch-burst" aria-hidden="true" @animationend.self="visible = false">
    <img v-for="([x, y], index) in trajectories" :key="index" :src="sprites[index % sprites.length]"
      :style="{ '--x': x, '--y': y, '--spin': (x * 60) + 'deg' }" alt="">
  </span>
</template>

<style scoped>
.patch-burst {
  --sprite-size: clamp(36px, 9vw, 64px);
  --burst-step: clamp(35px, 12vw, 58px);
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  animation: burst-fade 1050ms ease-out both;
}

.patch-burst img {
  position: absolute;
  top: calc(50% - var(--sprite-size) / 2);
  left: calc(50% - var(--sprite-size) / 2);
  width: var(--sprite-size);
  height: var(--sprite-size);
  image-rendering: pixelated;
  animation: burst-travel 1050ms cubic-bezier(.16, .72, .3, 1) both;
}

@keyframes burst-travel {
  from { transform: scale(.4); }
  to { transform: translate(calc(var(--x) * var(--burst-step)), calc(var(--y) * var(--burst-step))) rotate(var(--spin)); }
}

@keyframes burst-fade {
  0%, 58% { opacity: 1; }
  100% { opacity: 0; }
}

@media (max-width: 900px) {
  .patch-burst { --burst-step: clamp(32px, 9vw, 38px); }
}

@media (prefers-reduced-motion: reduce) {
  .patch-burst { display: none; }
}
</style>
