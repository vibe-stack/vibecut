# New Shader-Based Animation System

The animation system has been completely reworked to support advanced animations using Three.js shaders while maintaining backward compatibility.

## Key Improvements

### 🎯 **Advanced Shader Support**
- **Custom shaders**: Full support for vertex and fragment shaders
- **Uniform management**: Real-time parameter control
- **Material caching**: Optimized performance with automatic caching
- **Blending modes**: Support for additive, multiply, and other blend modes

### 🔄 **Backward Compatibility**
- **Legacy animations**: All existing animations still work
- **Smooth transition**: Old clips automatically use the new system
- **API compatibility**: Existing animation code continues to work

### 🚀 **New Animation Types**

#### Transform Animations (Enhanced)
- **Fade In/Out**: Improved with easing curves
- **Slide Up**: Enhanced with bounce and other easing options
- **Scale In**: New scaling animation with various curves
- **Pop Bounce**: Bouncy entrance effect

#### Advanced Shader Animations
- **Wave Distortion**: Creates wave-like distortions across text
- **Typewriter**: Character-by-character reveal with blinking cursor
- **Advanced Glitch**: Digital glitch with RGB shift and noise
- **Hologram**: Futuristic hologram effect with scanlines
- **Energy Dissolve**: Text dissolves into energy particles

## Technical Architecture

### Animation Result Structure
```typescript
interface AnimationResult {
  transform?: {
    position?: THREE.Vector3;
    rotation?: THREE.Euler;
    scale?: THREE.Vector3;
    opacity?: number;
  };
  shader?: {
    vertexShader?: string;
    fragmentShader?: string;
    uniforms?: Record<string, THREE.IUniform>;
    blending?: THREE.Blending;
    // ... other material properties
  };
}
```

### Animation Context
```typescript
interface AnimationContext {
  clip: ActiveClip;
  progress: number; // 0-1 progress through clip
  globalTime: number; // Global timeline time
  deltaTime: number; // Time since last frame
  isPlaying: boolean;
  settings: Record<string, any>;
  // Access to Three.js resources
  scene?: THREE.Scene;
  camera?: THREE.Camera;
  renderer?: THREE.WebGLRenderer;
}
```

### Registry System
- **Centralized registration**: All animations registered in one place
- **Metadata support**: Rich animation descriptions and settings schemas
- **Category system**: Organize animations by type (transform, shader, hybrid)
- **Requirements tracking**: Specify WebGL features needed

## Usage Examples

### Basic Transform Animation
```typescript
const fadeInAnimation: AnimationDefinition = {
  key: 'fade-in',
  name: 'Fade In',
  description: 'Smoothly fades the text in',
  category: 'transform',
  defaultSettings: { portion: 0.2, easing: 'ease-out' },
  compute: ({ progress, settings }) => ({
    transform: { opacity: applyEasing(progress / settings.portion) }
  })
};
```

### Advanced Shader Animation
```typescript
const hologramAnimation: AnimationDefinition = {
  key: 'hologram',
  name: 'Hologram',
  description: 'Futuristic hologram effect',
  category: 'shader',
  defaultSettings: { scanlineCount: 200, flickerIntensity: 0.3 },
  compute: ({ globalTime, settings }) => ({
    shader: {
      fragmentShader: hologramFragmentShader,
      uniforms: {
        uTime: { value: globalTime },
        uScanlineCount: { value: settings.scanlineCount },
        // ... more uniforms
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
    }
  })
};
```

## Performance Optimizations

### Material Caching
- **Automatic caching**: Materials are cached based on shader configuration
- **Smart updates**: Only uniforms are updated per frame, not entire materials
- **Memory management**: Automatic cleanup when animations are unregistered

### Uniform Management
- **Efficient updates**: Only time-sensitive uniforms updated each frame
- **Batch operations**: Multiple uniform updates in single operation
- **Type safety**: Full TypeScript support for uniform types

## Migration Guide

### Existing Animations
No changes needed! Existing animations automatically work with the new system.

### New Animations
1. **Register with metadata**: Use `AnimationDefinition` for rich descriptions
2. **Leverage shaders**: Return `shader` properties for advanced effects
3. **Use settings schemas**: Define UI-friendly parameter descriptions
4. **Specify requirements**: Declare WebGL features needed

### Settings Schemas
```typescript
settingsSchema: {
  amplitude: {
    type: 'number',
    min: 0,
    max: 0.5,
    step: 0.01,
    default: 0.1,
    description: 'Strength of the wave distortion',
  },
  baseColor: {
    type: 'color',
    default: '#00ffff',
    description: 'Base hologram color',
  }
}
```

## Available Animations

### Transform Category
- `fade-in` - Smooth fade in with easing options
- `fade-out` - Smooth fade out with easing options  
- `slide-up` - Slide up from below with bounce
- `scale-in` - Scale from zero to full size
- `pop-bounce` - Bouncy scale entrance
- `glitch` - Simple position/rotation glitch

### Shader Category
- `wave-distortion` - Wave-like vertex distortion
- `typewriter` - Character-by-character reveal
- `advanced-glitch` - Digital glitch with RGB shift
- `hologram` - Futuristic hologram effect
- `energy-dissolve` - Particle dissolution effect

## Future Extensions

The new architecture supports:
- **Post-processing effects**: Framework ready for screen-space effects
- **Custom materials**: Full Three.js material system integration
- **Animation composition**: Layer multiple effects seamlessly
- **Performance profiling**: Built-in performance monitoring hooks
- **WebGL2 features**: Ready for advanced GPU features

## Breaking Changes

**None!** The system is fully backward compatible. Existing code continues to work unchanged.