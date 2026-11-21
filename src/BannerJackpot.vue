<script setup>
import rareCandy from './assets/rare-candy.png';
import goldCoin from './assets/relic-gold.png';
import masterBall from './assets/master-ball.png';

const sprites = [rareCandy, goldCoin, masterBall];
const waves = 6;
const particlesPerWave = 18;
const particles = Array.from({ length: waves * particlesPerWave }, (_, id) => {
  const wave = Math.floor(id / particlesPerWave);
  const index = id % particlesPerWave;
  const side = index % 2 === 0 ? -1 : 1;
  const kind = (index + wave) % sprites.length;
  const lane = (index * 7 + wave * 3) % particlesPerWave;
  return {
    id,
    src: sprites[kind],
    isCoin: sprites[kind] === goldCoin,
    style: {
      '--x': `${50 + side * (13 + (index % 5) * 2.2)}%`,
      '--y': `${17 + lane * 4.15}%`,
      '--dx': `${side * (16 + (lane % 7) * 3)}cqw`,
      '--dy': `${(lane - 8.5) * 1.85}cqw`,
      '--size': `clamp(18px, ${4.5 + (lane % 5) * .65}cqw, 72px)`,
      '--delay': `${200 + wave * 570 + (index % 8) * 52}ms`,
      '--spin': `${side * (75 + lane * 17)}deg`
    }
  };
});
</script>

<template>
  <div class="banner-jackpot" aria-hidden="true">
    <div class="aura-origin">
      <div class="aura-core"></div>
      <div class="aura-wave aura-wave--1"></div>
      <div class="aura-wave aura-wave--2"></div>
      <div class="aura-wave aura-wave--3"></div>
    </div>
    <img
      v-for="particle in particles" :key="particle.id" :src="particle.src" :style="particle.style"
      class="jackpot-missile" :class="{ coin: particle.isCoin }" alt=""
    >
    <span class="sparkle" style="--x: 18.7%; --y: 23.0%; --s: 16px; --delay: 0.00s;"></span>
    <span class="sparkle" style="--x: 24.4%; --y: 38.5%; --s: 15px; --delay: 0.18s;"></span>
    <span class="sparkle" style="--x: 7.4%;  --y: 44.5%; --s: 14px; --delay: 0.35s;"></span>
    <span class="sparkle" style="--x: 41.2%; --y: 16.5%; --s: 13px; --delay: 0.10s;"></span>
    <span class="sparkle" style="--x: 59.8%; --y: 19.0%; --s: 13px; --delay: 0.25s;"></span>
    <span class="sparkle" style="--x: 79.1%; --y: 60.5%; --s: 16px; --delay: 0.15s;"></span>
    <span class="sparkle" style="--x: 91.2%; --y: 43.2%; --s: 14px; --delay: 0.30s;"></span>
    <span class="sparkle" style="--x: 95.8%; --y: 93.0%; --s: 15px; --delay: 0.42s;"></span>
    <span class="pixel-spark" style="--start-x: 41%; --start-y: 28%; --dx: -11cqw; --dy: -9cqw; --color: #fff380; --delay: 0.04s;"></span>
    <span class="pixel-spark" style="--start-x: 58%; --start-y: 27%; --dx: 12cqw; --dy: -10cqw; --color: #7df9ff; --delay: 0.08s;"></span>
    <span class="pixel-spark" style="--start-x: 38%; --start-y: 36%; --dx: -14cqw; --dy: -4cqw; --color: #ff66c4; --delay: 0.12s;"></span>
    <span class="pixel-spark" style="--start-x: 61%; --start-y: 35%; --dx: 14cqw; --dy: -5cqw; --color: #fff380; --delay: 0.10s;"></span>
    <span class="pixel-spark" style="--start-x: 44%; --start-y: 18%; --dx: -6cqw; --dy: -11cqw; --color: #7df9ff; --delay: 0.16s;"></span>
    <span class="pixel-spark" style="--start-x: 55%; --start-y: 18%; --dx: 7cqw; --dy: -11cqw; --color: #ff66c4; --delay: 0.14s;"></span>
  </div>
</template>

<style scoped>
.banner-jackpot {
  --loop-duration: 5.6s;
  position: absolute;
  inset: 0;
  container-type: inline-size;
  pointer-events: none;
  mask-image: linear-gradient(90deg, #000 0 37%, transparent 44% 56%, #000 63% 100%);
}

.aura-origin {
  position: absolute;
  left: 49.5%;
  top: 44%;
  width: 1px;
  height: 1px;
  z-index: 2;
}

.aura-core {
  position: absolute;
  left: 0;
  top: 0;
  width: 34cqw;
  aspect-ratio: 1;
  transform: translate(-50%, -50%) scale(0.85);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 244, 163, 0.85) 0%,
    rgba(255, 56, 178, 0.65) 35%,
    rgba(173, 38, 255, 0) 70%
  );
  mix-blend-mode: screen;
  opacity: 0;
  animation: auraCorePulse var(--loop-duration) steps(18, end) infinite;
}

.aura-wave {
  position: absolute;
  left: 0;
  top: 0;
  width: 18cqw;
  aspect-ratio: 1;
  transform: translate(-50%, -50%) scale(0.2);
  border-radius: 50%;
  border: 3px solid rgba(255, 232, 117, 0.9);
  box-shadow:
    0 0 0 3px rgba(255, 42, 168, 0.65),
    inset 0 0 18px rgba(255, 232, 117, 0.7);
  mix-blend-mode: screen;
  opacity: 0;
}

.aura-wave--1 {
  animation: auraRing var(--loop-duration) cubic-bezier(0.16, 1, 0.3, 1) infinite;
}

.aura-wave--2 {
  border-color: rgba(255, 82, 198, 0.95);
  animation: auraRing var(--loop-duration) cubic-bezier(0.16, 1, 0.3, 1) infinite;
  animation-delay: 0.22s;
}

.aura-wave--3 {
  border-color: rgba(120, 232, 255, 0.85);
  animation: auraRing var(--loop-duration) cubic-bezier(0.16, 1, 0.3, 1) infinite;
  animation-delay: 0.44s;
}

.sparkle {
  position: absolute;
  z-index: 5;
  left: var(--x);
  top: var(--y);
  width: var(--s, 14px);
  height: var(--s, 14px);
  transform: translate(-50%, -50%) scale(0.2);
  opacity: 0;
  animation: sparkleTwinkle var(--loop-duration) steps(6, end) infinite;
  animation-delay: var(--delay, 0s);
}

.sparkle::before {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--color, #fff9b0);
  clip-path: polygon(
    50% 0%, 62% 38%, 100% 50%, 62% 62%,
    50% 100%, 38% 62%, 0% 50%, 38% 38%
  );
  filter: drop-shadow(0 0 4px rgba(255, 240, 140, 0.95));
}

.pixel-spark {
  position: absolute;
  z-index: 5;
  left: var(--start-x);
  top: var(--start-y);
  width: 5px;
  height: 5px;
  background: var(--color, #ffe853);
  box-shadow: 0 0 0 1px #ff2ea6;
  opacity: 0;
  animation: sparkBurst var(--loop-duration) steps(10, end) infinite;
  animation-delay: var(--delay, 0s);
}

@keyframes auraCorePulse {
  0%, 100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.85);
  }
  6% {
    opacity: 0.55;
    transform: translate(-50%, -50%) scale(0.55);
  }
  11% {
    opacity: 0.95;
    transform: translate(-50%, -50%) scale(1.22);
  }
  24% {
    opacity: 0.65;
    transform: translate(-50%, -50%) scale(1.38);
  }
  45%, 85% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.85);
  }
}

@keyframes auraRing {
  0%, 8% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.25);
  }
  12% {
    opacity: 0.95;
  }
  38% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(2.85);
  }
  39%, 100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.25);
  }
}

@keyframes sparkleTwinkle {
  0%, 100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.2) rotate(0deg);
  }
  12% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.25) rotate(45deg);
  }
  24% {
    opacity: 0.25;
    transform: translate(-50%, -50%) scale(0.5) rotate(90deg);
  }
  34% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.1) rotate(135deg);
  }
  48% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.2) rotate(180deg);
  }
}

@keyframes sparkBurst {
  0%, 10% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1);
  }
  13% {
    opacity: 1;
  }
  32% {
    opacity: 0;
    transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0.5);
  }
  33%, 100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1);
  }
}

.jackpot-missile {
  position: absolute; left: var(--x); top: var(--y);
  width: var(--size); height: auto; opacity: 0;
  image-rendering: pixelated;
  animation: jackpotSalvo var(--loop-duration) linear var(--delay) infinite;
}

@keyframes jackpotSalvo {
  0%, 27%, 100% { opacity: 0; transform: translate(-50%, -50%); }
  3% { opacity: 1; }
  19% { opacity: 1; }
  24% { opacity: 0; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) rotate(var(--spin)); }
}

@keyframes jackpotCoin {
  0%, 27%, 100% { opacity: 0; translate: -50% -50%; }
  3% { opacity: 1; }
  19% { opacity: 1; }
  24% { opacity: 0; translate: calc(-50% + var(--dx)) calc(-50% + var(--dy)); }
}

.jackpot-missile.coin {
  animation-name: jackpotCoin, coinFlip;
  animation-duration: var(--loop-duration), .24s;
  animation-timing-function: linear, steps(1);
  animation-delay: var(--delay), var(--delay);
}

@keyframes coinFlip {
  25%, 75% { transform: scaleX(.62); }
  50% { transform: scaleX(.22); }
}

@media (prefers-reduced-motion: reduce) {
  .banner-jackpot { display: none; }
}
</style>
