import type { ActiveClip, TextAnimation } from '../../shared/types';

export interface TextAnimComputedProps {
  opacityMul?: number; // multiplier applied to base opacity (default 1)
  positionOffset?: [number, number, number]; // local offset
  scaleMul?: number; // uniform scale multiplier
  rotationZ?: number; // local z-rotation in radians
}

export type AnimationComputer = (ctx: {
  clip: ActiveClip;
  progress: number; // 0..1 within clip duration
  isPlaying: boolean;
  settings?: Record<string, any>;
}) => TextAnimComputedProps;

type AnimationRegistry = Record<string, AnimationComputer>;
const registry: AnimationRegistry = {};

export const registerTextAnimation = (key: string, computer: AnimationComputer) => {
  registry[key] = computer;
};

export const computeTextAnimationProps = (
  clip: ActiveClip,
  animations: TextAnimation[] | undefined,
  progress: number,
  isPlaying: boolean,
): TextAnimComputedProps => {
  let result: TextAnimComputedProps = { opacityMul: 1 };
  if (!animations || animations.length === 0) return result;
  for (const anim of animations) {
    if (!anim.enabled) continue;
    const comp = registry[anim.key];
    if (!comp) continue; // ignore unknown keys
    const r = comp({ clip, progress, isPlaying, settings: anim.settings });
    if (typeof r.opacityMul === 'number') {
      result.opacityMul = (result.opacityMul ?? 1) * r.opacityMul;
    }
  }
  return result;
};

// Built-in: fade-in/out via opacity over first/last portion
export const defaultFadeInKey = 'fade-in';
export const defaultFadeOutKey = 'fade-out';
export const slideUpKey = 'slide-up';
export const popBounceKey = 'pop-bounce';
export const glitchKey = 'glitch';

// Utilities
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// Built-in components
registerTextAnimation(defaultFadeInKey, ({ progress, settings }) => {
  const portion = typeof settings?.portion === 'number' ? clamp01(settings!.portion) : 0.2; // first 20%
  const t = clamp01(progress / Math.max(0.0001, portion));
  return { opacityMul: t };
});

registerTextAnimation(defaultFadeOutKey, ({ progress, settings }) => {
  const portion = typeof settings?.portion === 'number' ? clamp01(settings!.portion) : 0.2; // last 20%
  const start = 1 - portion;
  const t = progress < start ? 1 : clamp01(1 - (progress - start) / Math.max(0.0001, portion));
  return { opacityMul: t };
});

// Slide Up: move up from below during the first portion
registerTextAnimation(slideUpKey, ({ progress, settings }) => {
  const portion = typeof settings?.portion === 'number' ? clamp01(settings!.portion) : 0.3;
  const distance = typeof settings?.distance === 'number' ? settings!.distance : 0.5;
  const t = clamp01(progress / Math.max(0.0001, portion));
  const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
  return { positionOffset: [0, -distance * (1 - eased), 0] };
});

// Pop Bounce: overshoot scale on appear
registerTextAnimation(popBounceKey, ({ progress, settings }) => {
  const portion = typeof settings?.portion === 'number' ? clamp01(settings!.portion) : 0.25;
  const t = clamp01(progress / Math.max(0.0001, portion));
  // easeOutBack (s=1.70158)
  const s = 1.70158;
  const eased = 1 + s * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
  const scale = 0.8 + (eased * 0.2);
  return { scaleMul: scale };
});

// Glitch: quick jitter at mid clip (purely deterministic from progress)
registerTextAnimation(glitchKey, ({ progress, settings }) => {
  const strength = typeof settings?.strength === 'number' ? settings!.strength : 0.03;
  // Create some bursts around 0.3..0.7 progress
  const inWindow = progress > 0.3 && progress < 0.7;
  if (!inWindow) return {};
  const seed = Math.sin(progress * 123.456) * 43758.5453;
  const rand = (v: number) => (v - Math.floor(v));
  const r1 = rand(seed);
  const r2 = rand(seed * 1.33);
  const r3 = rand(seed * 2.17);
  const dx = (r1 - 0.5) * 2 * strength;
  const dy = (r2 - 0.5) * 2 * strength;
  const rot = (r3 - 0.5) * 2 * 0.05; // up to ~3 degrees
  return { positionOffset: [dx, dy, 0], rotationZ: rot };
});
// end
