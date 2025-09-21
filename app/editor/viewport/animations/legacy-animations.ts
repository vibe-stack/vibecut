import * as THREE from 'three';
import { shaderAnimationRegistry, type AnimationDefinition } from './shader-system';

/**
 * Backward-compatible implementations of simple transform animations
 * using the new shader animation system
 */

// =============================================================================
// FADE IN ANIMATION
// =============================================================================

const fadeInAnimation: AnimationDefinition = {
  key: 'fade-in',
  name: 'Fade In',
  description: 'Smoothly fades the text in from transparent to opaque',
  category: 'transform',
  defaultSettings: {
    portion: 0.2,
    easing: 'ease-out',
  },
  settingsSchema: {
    portion: {
      type: 'number',
      min: 0.1,
      max: 1.0,
      step: 0.05,
      default: 0.2,
      description: 'Portion of clip duration used for fade in',
    },
    easing: {
      type: 'select',
      options: ['linear', 'ease-in', 'ease-out', 'ease-in-out'],
      default: 'ease-out',
      description: 'Easing curve for the fade',
    },
  },
  compute: ({ progress, settings }) => {
    const portion = Math.max(0.0001, Math.min(1, settings.portion));
    let t = Math.max(0, Math.min(1, progress / portion));
    
    // Apply easing
    switch (settings.easing) {
      case 'ease-in':
        t = t * t;
        break;
      case 'ease-out':
        t = 1 - Math.pow(1 - t, 2);
        break;
      case 'ease-in-out':
        t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        break;
      default: // linear
        break;
    }
    
    return {
      transform: {
        opacity: t,
      },
    };
  },
};

// =============================================================================
// FADE OUT ANIMATION
// =============================================================================

const fadeOutAnimation: AnimationDefinition = {
  key: 'fade-out',
  name: 'Fade Out',
  description: 'Smoothly fades the text out from opaque to transparent',
  category: 'transform',
  defaultSettings: {
    portion: 0.2,
    easing: 'ease-in',
  },
  settingsSchema: {
    portion: {
      type: 'number',
      min: 0.1,
      max: 1.0,
      step: 0.05,
      default: 0.2,
      description: 'Portion of clip duration used for fade out',
    },
    easing: {
      type: 'select',
      options: ['linear', 'ease-in', 'ease-out', 'ease-in-out'],
      default: 'ease-in',
      description: 'Easing curve for the fade',
    },
  },
  compute: ({ progress, settings }) => {
    const portion = Math.max(0.0001, Math.min(1, settings.portion));
    const start = 1 - portion;
    
    if (progress < start) {
      return { transform: { opacity: 1 } };
    }
    
    let t = 1 - Math.max(0, Math.min(1, (progress - start) / portion));
    
    // Apply easing
    switch (settings.easing) {
      case 'ease-in':
        t = t * t;
        break;
      case 'ease-out':
        t = 1 - Math.pow(1 - t, 2);
        break;
      case 'ease-in-out':
        t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        break;
      default: // linear
        break;
    }
    
    return {
      transform: {
        opacity: t,
      },
    };
  },
};

// =============================================================================
// SLIDE UP ANIMATION
// =============================================================================

const slideUpAnimation: AnimationDefinition = {
  key: 'slide-up',
  name: 'Slide Up',
  description: 'Text slides up from below its final position',
  category: 'transform',
  defaultSettings: {
    portion: 0.3,
    distance: 0.5,
    easing: 'ease-out',
  },
  settingsSchema: {
    portion: {
      type: 'number',
      min: 0.1,
      max: 1.0,
      step: 0.05,
      default: 0.3,
      description: 'Portion of clip duration used for slide',
    },
    distance: {
      type: 'number',
      min: 0.1,
      max: 2.0,
      step: 0.1,
      default: 0.5,
      description: 'Distance to slide from (in world units)',
    },
    easing: {
      type: 'select',
      options: ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'],
      default: 'ease-out',
      description: 'Easing curve for the slide',
    },
  },
  compute: ({ progress, settings }) => {
    const portion = Math.max(0.0001, Math.min(1, settings.portion));
    let t = Math.max(0, Math.min(1, progress / portion));
    
    // Apply easing
    switch (settings.easing) {
      case 'ease-in':
        t = t * t;
        break;
      case 'ease-out':
        t = 1 - Math.pow(1 - t, 3);
        break;
      case 'ease-in-out':
        t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        break;
      case 'bounce':
        if (t < 1 / 2.75) {
          t = 7.5625 * t * t;
        } else if (t < 2 / 2.75) {
          t = 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        } else if (t < 2.5 / 2.75) {
          t = 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        } else {
          t = 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
        }
        break;
      default: // linear
        break;
    }
    
    const yOffset = -settings.distance * (1 - t);
    
    return {
      transform: {
        position: new THREE.Vector3(0, yOffset, 0),
      },
    };
  },
};

// =============================================================================
// POP BOUNCE ANIMATION
// =============================================================================

const popBounceAnimation: AnimationDefinition = {
  key: 'pop-bounce',
  name: 'Pop Bounce',
  description: 'Text scales up with a bouncy effect',
  category: 'transform',
  defaultSettings: {
    portion: 0.25,
    bounceStrength: 1.70158,
    startScale: 0.8,
  },
  settingsSchema: {
    portion: {
      type: 'number',
      min: 0.1,
      max: 1.0,
      step: 0.05,
      default: 0.25,
      description: 'Portion of clip duration used for pop',
    },
    bounceStrength: {
      type: 'number',
      min: 1.0,
      max: 3.0,
      step: 0.1,
      default: 1.70158,
      description: 'Strength of the bounce back effect',
    },
    startScale: {
      type: 'number',
      min: 0.1,
      max: 1.0,
      step: 0.05,
      default: 0.8,
      description: 'Starting scale factor',
    },
  },
  compute: ({ progress, settings }) => {
    const portion = Math.max(0.0001, Math.min(1, settings.portion));
    const t = Math.max(0, Math.min(1, progress / portion));
    
    // Back easing out (overshoot then settle)
    const s = settings.bounceStrength;
    const eased = 1 + s * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
    
    const scale = settings.startScale + (eased * (1 - settings.startScale));
    
    return {
      transform: {
        scale: new THREE.Vector3(scale, scale, scale),
      },
    };
  },
};

// =============================================================================
// SIMPLE GLITCH ANIMATION (Legacy)
// =============================================================================

const simpleGlitchAnimation: AnimationDefinition = {
  key: 'glitch',
  name: 'Simple Glitch',
  description: 'Basic glitch effect with position and rotation jitter',
  category: 'transform',
  defaultSettings: {
    strength: 0.03,
    window: { start: 0.3, end: 0.7 },
    frequency: 30,
  },
  settingsSchema: {
    strength: {
      type: 'number',
      min: 0.001,
      max: 0.1,
      step: 0.001,
      default: 0.03,
      description: 'Strength of the glitch effect',
    },
    frequency: {
      type: 'number',
      min: 10,
      max: 100,
      step: 5,
      default: 30,
      description: 'Frequency of glitch updates per second',
    },
  },
  compute: ({ progress, globalTime, settings }) => {
    const { start, end } = settings.window || { start: 0.3, end: 0.7 };
    const inWindow = progress > start && progress < end;
    
    if (!inWindow) {
      return { transform: {} };
    }
    
    // Use time-based seed for consistent but random-looking glitch
    const seed = Math.floor(globalTime * settings.frequency) * 123.456;
    const rand = (offset: number) => {
      const x = Math.sin(seed + offset) * 43758.5453;
      return x - Math.floor(x);
    };
    
    const r1 = rand(1);
    const r2 = rand(2);
    const r3 = rand(3);
    
    const dx = (r1 - 0.5) * 2 * settings.strength;
    const dy = (r2 - 0.5) * 2 * settings.strength;
    const rot = (r3 - 0.5) * 2 * 0.05;
    
    return {
      transform: {
        position: new THREE.Vector3(dx, dy, 0),
        rotation: new THREE.Euler(0, 0, rot),
      },
    };
  },
};

// =============================================================================
// SCALE IN ANIMATION
// =============================================================================

const scaleInAnimation: AnimationDefinition = {
  key: 'scale-in',
  name: 'Scale In',
  description: 'Text scales up from zero to full size',
  category: 'transform',
  defaultSettings: {
    portion: 0.3,
    easing: 'ease-out',
    startScale: 0.0,
  },
  settingsSchema: {
    portion: {
      type: 'number',
      min: 0.1,
      max: 1.0,
      step: 0.05,
      default: 0.3,
      description: 'Portion of clip duration used for scaling',
    },
    easing: {
      type: 'select',
      options: ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'],
      default: 'ease-out',
      description: 'Easing curve for the scale',
    },
    startScale: {
      type: 'number',
      min: 0.0,
      max: 1.0,
      step: 0.05,
      default: 0.0,
      description: 'Starting scale factor',
    },
  },
  compute: ({ progress, settings }) => {
    const portion = Math.max(0.0001, Math.min(1, settings.portion));
    let t = Math.max(0, Math.min(1, progress / portion));
    
    // Apply easing
    switch (settings.easing) {
      case 'ease-in':
        t = t * t;
        break;
      case 'ease-out':
        t = 1 - Math.pow(1 - t, 2);
        break;
      case 'ease-in-out':
        t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        break;
      case 'bounce':
        if (t < 1 / 2.75) {
          t = 7.5625 * t * t;
        } else if (t < 2 / 2.75) {
          t = 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        } else if (t < 2.5 / 2.75) {
          t = 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        } else {
          t = 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
        }
        break;
      default: // linear
        break;
    }
    
    const scale = settings.startScale + (t * (1 - settings.startScale));
    
    return {
      transform: {
        scale: new THREE.Vector3(scale, scale, scale),
      },
    };
  },
};

// =============================================================================
// REGISTER ALL LEGACY ANIMATIONS
// =============================================================================

export function registerLegacyAnimations() {
  shaderAnimationRegistry.register(fadeInAnimation);
  shaderAnimationRegistry.register(fadeOutAnimation);
  shaderAnimationRegistry.register(slideUpAnimation);
  shaderAnimationRegistry.register(popBounceAnimation);
  shaderAnimationRegistry.register(simpleGlitchAnimation);
  shaderAnimationRegistry.register(scaleInAnimation);
}

// Auto-register when module is imported
registerLegacyAnimations();

export {
  fadeInAnimation,
  fadeOutAnimation,
  slideUpAnimation,
  popBounceAnimation,
  simpleGlitchAnimation,
  scaleInAnimation,
};