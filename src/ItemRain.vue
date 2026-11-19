<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import masterBall from './assets/master-ball.png';
import rareCandy from './assets/rare-candy.png';
import goldCoin from './assets/relic-gold.png';

const duration = 1800;
const visible = ref(false);
const sprites = [rareCandy, masterBall, goldCoin];
const particles = Array.from({ length: 36 }, (_, index) => ({
  sprite: sprites[index % sprites.length],
  style: {
    '--left': `${(index * 37) % 103 - 4}%`,
    '--size': `${40 + (index * 29) % 50}px`,
    '--delay': `${(index * 113) % 1500 - 1100}ms`,
    '--fall-time': `${950 + (index * 137) % 850}ms`,
    '--drift': `${index % 2 ? -16 : 14}vw`,
    '--spin': `${index % 2 ? -290 : 310}deg`
  }
}));
let timer;

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  visible.value = true;
  timer = window.setTimeout(() => { visible.value = false; }, duration);
});

onBeforeUnmount(() => window.clearTimeout(timer));
</script>

<template>
  <div v-if="visible" class="item-rain" aria-hidden="true" :style="{ '--rain-duration': duration + 'ms' }">
    <img v-for="(particle, index) in particles" :key="index" :src="particle.sprite" :style="particle.style" alt="">
  </div>
</template>

<style scoped>
.item-rain {
  position: fixed;
  inset: 0;
  z-index: 5;
  overflow: hidden;
  pointer-events: none;
  animation: rain-fade var(--rain-duration) linear both;
}
.item-rain img {
  position: absolute;
  top: -100px;
  left: var(--left);
  width: var(--size);
  aspect-ratio: 1;
  image-rendering: pixelated;
  animation: item-fall var(--fall-time) linear var(--delay) infinite;
}

@keyframes item-fall {
  from { transform: translate3d(0, 0, 0) rotate(0); }
  to { transform: translate3d(var(--drift), calc(100dvh + 100px), 0) rotate(var(--spin)); }
}
@keyframes rain-fade {
  0%, 65% { opacity: .88; }
  100% { opacity: 0; }
}

@media (max-width: 500px) {
  .item-rain img { width: calc(var(--size) * .72); }
}
@media (prefers-reduced-motion: reduce) {
  .item-rain { display: none; }
}
</style>
