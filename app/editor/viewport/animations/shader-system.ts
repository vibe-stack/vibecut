import * as THREE from 'three';
import type { ActiveClip, EnhancedTextAnimation } from '../../shared/types';

/**
 * Unified animation result that can contain both transform properties
 * and shader material modifications
 */
export interface AnimationResult {
  // Transform properties (backward compatible)
  transform?: {
    position?: THREE.Vector3;
    rotation?: THREE.Euler;
    scale?: THREE.Vector3;
    opacity?: number;
  };
  
  // Shader properties for advanced effects
  shader?: {
    // Custom vertex/fragment shaders
    vertexShader?: string;
    fragmentShader?: string;
    // Uniforms to be applied to the material
    uniforms?: Record<string, THREE.IUniform>;
    // Blending mode for the effect
    blending?: THREE.Blending;
    // Whether to use alpha testing
    alphaTest?: number;
    // Additional material properties
    transparent?: boolean;
    depthWrite?: boolean;
    side?: THREE.Side;
  };
  
  // Post-processing effects (future extension)
  postProcessing?: {
    effects: string[];
    params: Record<string, any>;
  };
}

/**
 * Animation context provided to animation computers
 */
export interface AnimationContext {
  clip: ActiveClip;
  progress: number; // 0-1 progress through the clip
  globalTime: number; // Global timeline time
  deltaTime: number; // Time since last frame
  isPlaying: boolean;
  settings: Record<string, any>;
  // Access to Three.js resources for advanced animations
  scene?: THREE.Scene;
  camera?: THREE.Camera;
  renderer?: THREE.WebGLRenderer;
}

/**
 * Enhanced animation computer that can return shader-based results
 */
export type ShaderAnimationComputer = (ctx: AnimationContext) => AnimationResult;

/**
 * Animation definition that includes metadata and the computer function
 */
export interface AnimationDefinition {
  key: string;
  name: string;
  description: string;
  category: 'transform' | 'shader' | 'hybrid';
  // Default settings for the animation
  defaultSettings: Record<string, any>;
  // Settings schema for UI generation (optional)
  settingsSchema?: Record<string, {
    type: 'number' | 'boolean' | 'string' | 'color' | 'select';
    min?: number;
    max?: number;
    step?: number;
    options?: string[];
    default?: any;
    description?: string;
  }>;
  // The animation computer
  compute: ShaderAnimationComputer;
  // Whether this animation requires specific Three.js features
  requirements?: {
    webgl2?: boolean;
    extensions?: string[];
  };
}

/**
 * Registry for shader-based animations
 */
class ShaderAnimationRegistry {
  private animations = new Map<string, AnimationDefinition>();
  private materialCache = new Map<string, THREE.Material>();
  
  register(definition: AnimationDefinition) {
    this.animations.set(definition.key, definition);
  }
  
  unregister(key: string) {
    this.animations.delete(key);
    // Clean up cached materials for this animation
    for (const [cacheKey, material] of this.materialCache.entries()) {
      if (cacheKey.startsWith(key + ':')) {
        material.dispose();
        this.materialCache.delete(cacheKey);
      }
    }
  }
  
  get(key: string): AnimationDefinition | undefined {
    return this.animations.get(key);
  }
  
  getAll(): AnimationDefinition[] {
    return Array.from(this.animations.values());
  }
  
  getByCategory(category: AnimationDefinition['category']): AnimationDefinition[] {
    return Array.from(this.animations.values()).filter(anim => anim.category === category);
  }
  
  /**
   * Create or retrieve a cached material for a shader animation
   */
  getMaterial(animationKey: string, shaderResult: NonNullable<AnimationResult['shader']>): THREE.Material {
    const cacheKey = `${animationKey}:${this.hashShaderConfig(shaderResult)}`;
    
    let material = this.materialCache.get(cacheKey);
    if (!material) {
      material = this.createShaderMaterial(shaderResult);
      this.materialCache.set(cacheKey, material);
    }
    
    // Update uniforms (these change every frame)
    if (shaderResult.uniforms && material instanceof THREE.ShaderMaterial) {
      Object.assign(material.uniforms, shaderResult.uniforms);
    }
    
    return material;
  }
  
  private hashShaderConfig(shader: NonNullable<AnimationResult['shader']>): string {
    // Simple hash of shader configuration (excluding uniforms which change)
    const config = {
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      blending: shader.blending,
      alphaTest: shader.alphaTest,
      transparent: shader.transparent,
      depthWrite: shader.depthWrite,
      side: shader.side,
    };
    return JSON.stringify(config);
  }
  
  private createShaderMaterial(shader: NonNullable<AnimationResult['shader']>): THREE.Material {
    if (shader.vertexShader || shader.fragmentShader) {
      // Custom shader material
      return new THREE.ShaderMaterial({
        vertexShader: shader.vertexShader || this.getDefaultVertexShader(),
        fragmentShader: shader.fragmentShader || this.getDefaultFragmentShader(),
        uniforms: shader.uniforms || {},
        blending: shader.blending ?? THREE.NormalBlending,
        transparent: shader.transparent ?? true,
        alphaTest: shader.alphaTest ?? 0,
        depthWrite: shader.depthWrite ?? true,
        side: shader.side ?? THREE.FrontSide,
      });
    } else {
      // Standard material with modifications
      const material = new THREE.MeshBasicMaterial({
        transparent: shader.transparent ?? true,
        alphaTest: shader.alphaTest ?? 0,
        blending: shader.blending ?? THREE.NormalBlending,
        depthWrite: shader.depthWrite ?? true,
        side: shader.side ?? THREE.FrontSide,
      });
      
      return material;
    }
  }
  
  private getDefaultVertexShader(): string {
    return `
      varying vec2 vUv;
      varying vec3 vPosition;
      varying vec3 vNormal;
      
      void main() {
        vUv = uv;
        vPosition = position;
        vNormal = normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
  }
  
  private getDefaultFragmentShader(): string {
    return `
      uniform float uOpacity;
      uniform vec3 uColor;
      varying vec2 vUv;
      
      void main() {
        gl_FragColor = vec4(uColor, uOpacity);
      }
    `;
  }
  
  /**
   * Clean up all cached materials
   */
  dispose() {
    for (const material of this.materialCache.values()) {
      material.dispose();
    }
    this.materialCache.clear();
  }
}

// Global registry instance
export const shaderAnimationRegistry = new ShaderAnimationRegistry();

/**
 * Compute all animations for a clip and combine their results
 */
export function computeShaderAnimations(
  clip: ActiveClip,
  animations: EnhancedTextAnimation[],
  context: Omit<AnimationContext, 'clip' | 'settings'>
): AnimationResult {
  if (!animations || animations.length === 0) {
    return { transform: { opacity: 1 } };
  }

  // Sort animations by priority
  const sortedAnimations = [...animations]
    .filter(anim => anim.enabled)
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));

  let result: AnimationResult = { transform: {} };
  const combinedUniforms: Record<string, THREE.IUniform> = {};
  
  for (const anim of sortedAnimations) {
    const definition = shaderAnimationRegistry.get(anim.key);
    if (!definition) continue;
    
    const animResult = definition.compute({
      clip,
      settings: { ...definition.defaultSettings, ...(anim.settings || {}) },
      ...context,
    });
    
    // Combine transform properties
    if (animResult.transform) {
      if (!result.transform) result.transform = {};
      
      if (animResult.transform.position) {
        const basePos = result.transform.position || new THREE.Vector3();
        result.transform.position = basePos.clone().add(animResult.transform.position);
      }
      
      if (animResult.transform.rotation) {
        const baseRot = result.transform.rotation || new THREE.Euler();
        result.transform.rotation = new THREE.Euler(
          baseRot.x + animResult.transform.rotation.x,
          baseRot.y + animResult.transform.rotation.y,
          baseRot.z + animResult.transform.rotation.z
        );
      }
      
      if (animResult.transform.scale) {
        const baseScale = result.transform.scale || new THREE.Vector3(1, 1, 1);
        result.transform.scale = baseScale.clone().multiply(animResult.transform.scale);
      }
      
      if (typeof animResult.transform.opacity === 'number') {
        const baseOpacity = result.transform?.opacity ?? 1;
        result.transform.opacity = baseOpacity * animResult.transform.opacity;
      }
    }
    
    // Combine shader properties
    if (animResult.shader) {
      if (!result.shader) {
        result.shader = { ...animResult.shader };
      } else {
        // Merge shader properties (later animations override earlier ones for conflicting properties)
        Object.assign(result.shader, animResult.shader);
      }
      
      // Combine uniforms
      if (animResult.shader.uniforms) {
        Object.assign(combinedUniforms, animResult.shader.uniforms);
      }
    }
  }
  
  // Set combined uniforms
  if (result.shader && Object.keys(combinedUniforms).length > 0) {
    result.shader.uniforms = combinedUniforms;
  }
  
  return result;
}

export default shaderAnimationRegistry;