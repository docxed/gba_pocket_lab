<script setup>
import rareCandy from './assets/rare-candy.png';

const particles = [
  { kind: 'candy', x: '-22px', y: '-18px', delay: 0 },
  { kind: 'coin', x: '22px', y: '-18px', delay: 130 },
  { kind: 'coin', x: '-24px', y: '8px', delay: 240 },
  { kind: 'candy', x: '22px', y: '12px', delay: 310 },
  { kind: 'coin', x: '2px', y: '-28px', delay: 415 },
  { kind: 'coin', x: '-4px', y: '24px', delay: 510 }
];
</script>

<template>
  <span class="jackpot-logo" aria-hidden="true">
    <span class="jackpot-rays"></span>
    <span class="jackpot-ring"></span>
    <span class="jackpot-ball"></span>
    <span
      v-for="particle in particles" :key="particle.delay" class="jackpot-particle"
      :style="{ '--x': particle.x, '--y': particle.y, '--delay': particle.delay + 'ms' }"
    >
      <img v-if="particle.kind === 'candy'" :src="rareCandy" alt="">
      <span v-else class="jackpot-coin"></span>
    </span>
  </span>
</template>

<style scoped>
.jackpot-logo {
  --pixel-circle: polygon(
    28.5714.2857% 0, 71.4285.7143% 0, 71.4285.7143% 14.2857%, 85.7143% 14.2857%, 85.7143% 28.5714.2857%, 100% 28.5714.2857%,
    100% 71.4285.7143%, 85.7143% 71.4285.7143%, 85.7143% 85.7143%, 71.4285.7143% 85.7143%, 71.4285.7143% 100%, 28.5714.2857% 100%,
    28.5714.2857% 85.7143%, 14.2857% 85.7143%, 14.2857% 71.4285.7143%, 0 71.4285.7143%, 0 28.5714.2857%, 14.2857% 28.5714.2857%, 14.2857% 14.2857%, 28.5714.2857% 14.2857%
  );
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
  width: 48px;
  height: 48px;
  border: 2px solid #ffcf48;
  border-radius: 12px;
  background: #30104e;
  box-shadow: 0 2px #6b3214;
}

.jackpot-rays {
  position: absolute;
  inset: 3px;
  background: #d838a4;
  clip-path: polygon(
    39% 0, 61% 0, 61% 26%, 74% 26%, 74% 13%, 87% 13%, 87% 39%, 100% 39%,
    100% 61%, 87% 61%, 87% 87%, 74% 87%, 74% 74%, 61% 74%, 61% 100%,
    39% 100%, 39% 74%, 26% 74%, 26% 87%, 13% 87%, 13% 61%, 0 61%,
    0 39%, 13% 39%, 13% 13%, 26% 13%, 26% 26%, 39% 26%
  );
  animation: jackpot-rays 1.4s step-end infinite;
}

.jackpot-ring {
  position: absolute;
  inset: 6px;
  border: 2px dashed #ffe170;
  opacity: 0;
  animation: jackpot-ring 1.4s step-end infinite;
}

.jackpot-ball {
  position: relative;
  width: 28px;
  height: 28px;
  clip-path: var(--pixel-circle);
  background:
    linear-gradient(#ff79bd, #ff79bd) 6px 6px / 4px 4px no-repeat,
    linear-gradient(#ff79bd, #ff79bd) 18px 6px / 4px 4px no-repeat,
    linear-gradient(#b959ff 0 12px, #32104b 12px 16px, #fef2ff 16px 22px, #c6afd9 22px);
  animation: jackpot-ball 1.4s step-end infinite;
}

.jackpot-ball::after {
  content: '';
  position: absolute;
  inset: 10px;
  border: 2px solid #32104b;
  background: #fff7ff;
}

.jackpot-particle {
  position: absolute;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  pointer-events: none;
  opacity: 0;
  animation: jackpot-toss 1.4s step-end var(--delay) infinite;
}

.jackpot-particle img {
  width: 30px;
  height: 30px;
  image-rendering: pixelated;
}

.jackpot-coin {
  width: 14px;
  height: 14px;
  clip-path: var(--pixel-circle);
  background:
    linear-gradient(#fff2a0, #fff2a0) 4px 2px / 2px 6px no-repeat,
    linear-gradient(90deg, #d7850c 2px, #ffcf42 2px 10px, #d7850c 10px);
  animation: jackpot-coin 350ms step-end var(--delay) infinite;
}

@keyframes jackpot-rays {
  25% { background-color: #9a35df; }
  50% { background-color: #ff55a1; }
  75% { background-color: #9a35df; }
}

@keyframes jackpot-ring {
  15% { inset: 8px; opacity: 1; }
  25% { inset: 4px; opacity: 1; }
  38% { inset: 0; opacity: 0; }
}

@keyframes jackpot-ball {
  10% { transform: translateY(4px); }
  20% { transform: translateY(-8px); }
  30% { transform: translateY(-12px); }
  42% { transform: translateY(-8px); }
  54% { transform: translateY(-2px); }
  65% { transform: translateY(2px); }
  78% { transform: translateY(0); }
}

@keyframes jackpot-toss {
  14% { opacity: 1; }
  30% { transform: translate(var(--x), 0); opacity: 1; }
  46%, 62% { transform: translate(var(--x), var(--y)); opacity: 1; }
  78% { transform: translate(0, var(--y)); opacity: 1; }
  90% { opacity: 0; }
}

@keyframes jackpot-coin {
  25%, 75% { width: 8px; }
  50% { width: 4px; }
}

@media (max-width: 650px) {
  .jackpot-logo { width: 36px; height: 36px; border-radius: 10px; }
}

@media (prefers-reduced-motion: reduce) {
  .jackpot-rays, .jackpot-ring, .jackpot-ball, .jackpot-particle, .jackpot-coin { animation: none; }
  .jackpot-particle:nth-child(4) { opacity: 1; transform: translate(-14px, -12px); }
  .jackpot-particle:last-child { opacity: 1; transform: translate(14px, 12px); }
}
</style>
