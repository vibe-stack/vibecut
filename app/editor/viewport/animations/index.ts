// New shader-based animation system
export * from './shader-system';
export * from './advanced-animations';
export * from './legacy-animations';

// Legacy exports for backward compatibility
import type { ActiveClip, TextAnimation, EnhancedTextAnimation } from '../../shared/types';
import { 
  shaderAnimationRegistry, 
  computeShaderAnimations, 
  type AnimationResult
} from './shader-system';
import * as THREE from 'three';

/**
 * Legacy interface for backward compatibility
 * @deprecated Use the new shader animation system instead
 */
export interface TextAnimComputedProps {
  opacityMul?: number;
  positionOffset?: [number, number, number];
  scaleMul?: number;
  rotationZ?: number;
}

/**
 * Convert legacy TextAnimation to EnhancedTextAnimation
 */
function convertLegacyAnimation(anim: TextAnimation): EnhancedTextAnimation {
  return {
    key: anim.key,
    enabled: anim.enabled,
    settings: anim.settings || {},
    priority: 0,
  };
}

/**
 * Convert new AnimationResult to legacy TextAnimComputedProps for backward compatibility
 */
function convertToLegacyProps(result: AnimationResult): TextAnimComputedProps {
  const legacy: TextAnimComputedProps = {};
  
  if (result.transform) {
    if (typeof result.transform.opacity === 'number') {
      legacy.opacityMul = result.transform.opacity;
    }
    
    if (result.transform.position) {
      legacy.positionOffset = [
        result.transform.position.x,
        result.transform.position.y,
        result.transform.position.z
      ];
    }
    
    if (result.transform.scale) {
      // Take the average of x and y scale for legacy compatibility
      legacy.scaleMul = (result.transform.scale.x + result.transform.scale.y) / 2;
    }
    
    if (result.transform.rotation) {
      legacy.rotationZ = result.transform.rotation.z;
    }
  }
  
  return legacy;
}

/**
 * Legacy animation computation function for backward compatibility
 * @deprecated Use computeShaderAnimations instead
 */
export const computeTextAnimationProps = (
  clip: ActiveClip,
  animations: TextAnimation[] | undefined,
  progress: number,
  isPlaying: boolean,
): TextAnimComputedProps => {
  if (!animations || animations.length === 0) {
    return { opacityMul: 1 };
  }
  
  // Convert to new format
  const enhancedAnimations = animations.map(convertLegacyAnimation);
  
  // Use new system
  const result = computeShaderAnimations(clip, enhancedAnimations, {
    progress,
    globalTime: performance.now() / 1000, // Approximate global time
    deltaTime: 1/60, // Approximate delta time
    isPlaying,
  });
  
  // Convert back to legacy format
  return convertToLegacyProps(result);
};

/**
 * Enhanced animation computation that returns full AnimationResult
 * This is the new preferred way to compute animations
 */
export const computeEnhancedTextAnimations = (
  clip: ActiveClip,
  animations: EnhancedTextAnimation[],
  context: {
    progress: number;
    globalTime: number;
    deltaTime: number;
    isPlaying: boolean;
    scene?: THREE.Scene;
    camera?: THREE.Camera;
    renderer?: THREE.WebGLRenderer;
  }
): AnimationResult => {
  return computeShaderAnimations(clip, animations, context);
};

// Legacy animation keys for backward compatibility
export const defaultFadeInKey = 'fade-in';
export const defaultFadeOutKey = 'fade-out';
export const slideUpKey = 'slide-up';
export const popBounceKey = 'pop-bounce';
export const glitchKey = 'glitch';

// New animation keys
export const waveDistortionKey = 'wave-distortion';
export const typewriterKey = 'typewriter';
export const advancedGlitchKey = 'advanced-glitch';
export const hologramKey = 'hologram';
export const energyDissolveKey = 'energy-dissolve';
export const scaleInKey = 'scale-in';

/**
 * Get all available animations
 */
export const getAllAnimations = () => shaderAnimationRegistry.getAll();

/**
 * Get animations by category
 */
export const getAnimationsByCategory = (category: 'transform' | 'shader' | 'hybrid') => 
  shaderAnimationRegistry.getByCategory(category);

/**
 * Legacy registration function (no-op, animations are auto-registered)
 * @deprecated Use the new animation registry directly
 */
export const registerTextAnimation = (key: string, computer: any) => {
  console.warn('registerTextAnimation is deprecated. Use shaderAnimationRegistry.register() instead.');
};
