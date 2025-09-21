import * as THREE from 'three';
import { shaderAnimationRegistry, type AnimationDefinition } from './shader-system';

/**
 * Collection of advanced shader-based animations
 */

// =============================================================================
// WAVE DISTORTION ANIMATION
// =============================================================================

const waveDistortionAnimation: AnimationDefinition = {
  key: 'wave-distortion',
  name: 'Wave Distortion',
  description: 'Creates a wave-like distortion effect across the text',
  category: 'shader',
  defaultSettings: {
    amplitude: 0.1,
    frequency: 4.0,
    speed: 2.0,
    direction: 'horizontal',
  },
  settingsSchema: {
    amplitude: {
      type: 'number',
      min: 0,
      max: 0.5,
      step: 0.01,
      default: 0.1,
      description: 'Strength of the wave distortion',
    },
    frequency: {
      type: 'number',
      min: 1,
      max: 10,
      step: 0.1,
      default: 4.0,
      description: 'Number of waves across the text',
    },
    speed: {
      type: 'number',
      min: 0.1,
      max: 5.0,
      step: 0.1,
      default: 2.0,
      description: 'Speed of the wave animation',
    },
    direction: {
      type: 'select',
      options: ['horizontal', 'vertical', 'diagonal'],
      default: 'horizontal',
      description: 'Direction of the wave effect',
    },
  },
  compute: ({ progress, globalTime, settings }) => {
    const vertexShader = `
      uniform float uTime;
      uniform float uAmplitude;
      uniform float uFrequency;
      uniform float uSpeed;
      uniform vec2 uDirection;
      
      varying vec2 vUv;
      varying vec3 vPosition;
      
      void main() {
        vUv = uv;
        vPosition = position;
        
        vec3 pos = position;
        vec2 dir = normalize(uDirection);
        float wave = sin((pos.x * dir.x + pos.y * dir.y) * uFrequency + uTime * uSpeed);
        
        pos.x += wave * uAmplitude * dir.y;
        pos.y += wave * uAmplitude * dir.x;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;
    
    const fragmentShader = `
      uniform float uOpacity;
      uniform vec3 uColor;
      varying vec2 vUv;
      
      void main() {
        gl_FragColor = vec4(uColor, uOpacity);
      }
    `;
    
    const direction = (() => {
      switch (settings.direction) {
        case 'vertical': return new THREE.Vector2(0, 1);
        case 'diagonal': return new THREE.Vector2(0.707, 0.707);
        default: return new THREE.Vector2(1, 0);
      }
    })();
    
    return {
      shader: {
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: globalTime },
          uAmplitude: { value: settings.amplitude },
          uFrequency: { value: settings.frequency },
          uSpeed: { value: settings.speed },
          uDirection: { value: direction },
          uOpacity: { value: 1.0 },
          uColor: { value: new THREE.Color('#ffffff') },
        },
        transparent: true,
      },
    };
  },
};

// =============================================================================
// TYPEWRITER EFFECT
// =============================================================================

const typewriterAnimation: AnimationDefinition = {
  key: 'typewriter',
  name: 'Typewriter',
  description: 'Reveals text character by character like a typewriter',
  category: 'shader',
  defaultSettings: {
    speed: 1.0,
    charactersPerSecond: 10,
    cursorBlink: true,
    cursorColor: '#ffffff',
  },
  settingsSchema: {
    speed: {
      type: 'number',
      min: 0.1,
      max: 5.0,
      step: 0.1,
      default: 1.0,
      description: 'Overall speed multiplier',
    },
    charactersPerSecond: {
      type: 'number',
      min: 1,
      max: 50,
      step: 1,
      default: 10,
      description: 'Characters revealed per second',
    },
    cursorBlink: {
      type: 'boolean',
      default: true,
      description: 'Show blinking cursor',
    },
    cursorColor: {
      type: 'color',
      default: '#ffffff',
      description: 'Color of the typing cursor',
    },
  },
  compute: ({ progress, globalTime, settings, clip }) => {
    const textLength = clip.textContent?.length || 0;
    const revealProgress = Math.min(1, progress * settings.speed);
    const charactersRevealed = Math.floor(revealProgress * textLength);
    
    const fragmentShader = `
      uniform float uRevealProgress;
      uniform float uCharactersRevealed;
      uniform float uTextLength;
      uniform float uTime;
      uniform bool uCursorBlink;
      uniform vec3 uCursorColor;
      uniform vec3 uColor;
      uniform float uOpacity;
      
      varying vec2 vUv;
      
      void main() {
        // Calculate character position based on UV
        float charIndex = floor(vUv.x * uTextLength);
        
        // Determine if this fragment should be visible
        float isVisible = step(charIndex, uCharactersRevealed);
        
        // Cursor effect at the reveal position
        float cursorPos = uCharactersRevealed / uTextLength;
        float cursorWidth = 0.02;
        float isCursor = step(abs(vUv.x - cursorPos), cursorWidth);
        
        // Blinking cursor
        float cursorAlpha = 1.0;
        if (uCursorBlink) {
          cursorAlpha = 0.5 + 0.5 * sin(uTime * 4.0);
        }
        
        vec3 finalColor = mix(uColor, uCursorColor, isCursor * cursorAlpha);
        float finalAlpha = max(isVisible, isCursor * cursorAlpha) * uOpacity;
        
        gl_FragColor = vec4(finalColor, finalAlpha);
      }
    `;
    
    return {
      shader: {
        fragmentShader,
        uniforms: {
          uRevealProgress: { value: revealProgress },
          uCharactersRevealed: { value: charactersRevealed },
          uTextLength: { value: textLength },
          uTime: { value: globalTime },
          uCursorBlink: { value: settings.cursorBlink },
          uCursorColor: { value: new THREE.Color(settings.cursorColor) },
          uColor: { value: new THREE.Color('#ffffff') },
          uOpacity: { value: 1.0 },
        },
        transparent: true,
      },
    };
  },
};

// =============================================================================
// GLITCH EFFECT
// =============================================================================

const glitchAnimation: AnimationDefinition = {
  key: 'advanced-glitch',
  name: 'Advanced Glitch',
  description: 'Digital glitch effect with RGB shift and noise',
  category: 'shader',
  defaultSettings: {
    intensity: 0.5,
    frequency: 4.0,
    rgbShift: 0.02,
    noiseAmount: 0.3,
    blockSize: 0.1,
  },
  settingsSchema: {
    intensity: {
      type: 'number',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.5,
      description: 'Overall glitch intensity',
    },
    frequency: {
      type: 'number',
      min: 0.1,
      max: 10,
      step: 0.1,
      default: 4.0,
      description: 'Frequency of glitch occurrences',
    },
    rgbShift: {
      type: 'number',
      min: 0,
      max: 0.1,
      step: 0.001,
      default: 0.02,
      description: 'RGB channel shift amount',
    },
    noiseAmount: {
      type: 'number',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.3,
      description: 'Amount of digital noise',
    },
    blockSize: {
      type: 'number',
      min: 0.01,
      max: 0.5,
      step: 0.01,
      default: 0.1,
      description: 'Size of glitch blocks',
    },
  },
  compute: ({ progress, globalTime, settings }) => {
    const vertexShader = `
      uniform float uTime;
      uniform float uIntensity;
      uniform float uFrequency;
      uniform float uBlockSize;
      
      varying vec2 vUv;
      varying vec3 vPosition;
      
      // Random function
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }
      
      void main() {
        vUv = uv;
        vPosition = position;
        
        vec3 pos = position;
        
        // Block-based displacement
        vec2 blockId = floor(uv / uBlockSize);
        float glitchTrigger = step(0.98, random(blockId + floor(uTime * uFrequency)));
        
        if (glitchTrigger > 0.0) {
          float displaceX = (random(blockId + 1.0) - 0.5) * uIntensity * 0.2;
          float displaceY = (random(blockId + 2.0) - 0.5) * uIntensity * 0.1;
          pos.x += displaceX;
          pos.y += displaceY;
        }
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;
    
    const fragmentShader = `
      uniform float uTime;
      uniform float uIntensity;
      uniform float uRgbShift;
      uniform float uNoiseAmount;
      uniform float uBlockSize;
      uniform vec3 uColor;
      uniform float uOpacity;
      
      varying vec2 vUv;
      
      // Random function
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }
      
      void main() {
        vec2 uv = vUv;
        
        // RGB shift
        vec2 rOffset = vec2(uRgbShift * uIntensity, 0.0);
        vec2 gOffset = vec2(0.0, 0.0);
        vec2 bOffset = vec2(-uRgbShift * uIntensity, 0.0);
        
        // Digital noise
        float noise = random(floor(uv / 0.002) + floor(uTime * 10.0));
        float glitchMask = step(1.0 - uNoiseAmount * uIntensity, noise);
        
        // Block-based distortion
        vec2 blockId = floor(uv / uBlockSize);
        float blockGlitch = step(0.95, random(blockId + floor(uTime * 4.0)));
        
        if (blockGlitch > 0.0) {
          uv.x += (random(blockId + 1.0) - 0.5) * uIntensity * 0.1;
        }
        
        vec3 finalColor = uColor;
        
        // Apply glitch coloring
        if (glitchMask > 0.0) {
          finalColor = mix(finalColor, vec3(1.0, 0.0, 1.0), 0.5);
        }
        
        float alpha = uOpacity * (1.0 - glitchMask * 0.3);
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `;
    
    return {
      shader: {
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: globalTime },
          uIntensity: { value: settings.intensity },
          uFrequency: { value: settings.frequency },
          uRgbShift: { value: settings.rgbShift },
          uNoiseAmount: { value: settings.noiseAmount },
          uBlockSize: { value: settings.blockSize },
          uColor: { value: new THREE.Color('#ffffff') },
          uOpacity: { value: 1.0 },
        },
        transparent: true,
      },
    };
  },
};

// =============================================================================
// HOLOGRAM EFFECT
// =============================================================================

const hologramAnimation: AnimationDefinition = {
  key: 'hologram',
  name: 'Hologram',
  description: 'Futuristic hologram effect with scanlines and flicker',
  category: 'shader',
  defaultSettings: {
    scanlineCount: 200,
    flickerIntensity: 0.3,
    baseColor: '#00ffff',
    edgeGlow: 0.5,
    transparency: 0.8,
  },
  settingsSchema: {
    scanlineCount: {
      type: 'number',
      min: 50,
      max: 500,
      step: 10,
      default: 200,
      description: 'Number of scanlines',
    },
    flickerIntensity: {
      type: 'number',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.3,
      description: 'Intensity of the flicker effect',
    },
    baseColor: {
      type: 'color',
      default: '#00ffff',
      description: 'Base hologram color',
    },
    edgeGlow: {
      type: 'number',
      min: 0,
      max: 2,
      step: 0.1,
      default: 0.5,
      description: 'Edge glow intensity',
    },
    transparency: {
      type: 'number',
      min: 0.1,
      max: 1,
      step: 0.01,
      default: 0.8,
      description: 'Overall transparency',
    },
  },
  compute: ({ progress, globalTime, settings }) => {
    const fragmentShader = `
      uniform float uTime;
      uniform float uScanlineCount;
      uniform float uFlickerIntensity;
      uniform vec3 uBaseColor;
      uniform float uEdgeGlow;
      uniform float uTransparency;
      uniform vec3 uColor;
      uniform float uOpacity;
      
      varying vec2 vUv;
      
      // Random function
      float random(float x) {
        return fract(sin(x) * 43758.5453123);
      }
      
      void main() {
        vec2 uv = vUv;
        
        // Scanlines
        float scanline = sin(uv.y * uScanlineCount + uTime * 3.0) * 0.5 + 0.5;
        scanline = pow(scanline, 3.0);
        
        // Edge detection for glow effect
        vec2 edge = abs(uv - 0.5) * 2.0;
        float edgeFactor = max(edge.x, edge.y);
        float glow = pow(1.0 - edgeFactor, 2.0) * uEdgeGlow;
        
        // Flicker effect
        float flicker = 1.0 + sin(uTime * 23.0) * uFlickerIntensity * 0.1;
        flicker *= 1.0 + random(floor(uTime * 60.0)) * uFlickerIntensity * 0.2;
        
        // Combine effects
        vec3 hologramColor = uBaseColor * flicker;
        hologramColor += glow * uBaseColor;
        hologramColor *= scanline * 0.7 + 0.3;
        
        float alpha = uTransparency * uOpacity * (scanline * 0.8 + 0.2);
        
        gl_FragColor = vec4(hologramColor, alpha);
      }
    `;
    
    return {
      shader: {
        fragmentShader,
        uniforms: {
          uTime: { value: globalTime },
          uScanlineCount: { value: settings.scanlineCount },
          uFlickerIntensity: { value: settings.flickerIntensity },
          uBaseColor: { value: new THREE.Color(settings.baseColor) },
          uEdgeGlow: { value: settings.edgeGlow },
          uTransparency: { value: settings.transparency },
          uColor: { value: new THREE.Color('#ffffff') },
          uOpacity: { value: 1.0 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
      },
    };
  },
};

// =============================================================================
// ENERGY DISSOLVE
// =============================================================================

const energyDissolveAnimation: AnimationDefinition = {
  key: 'energy-dissolve',
  name: 'Energy Dissolve',
  description: 'Dissolves text into energy particles',
  category: 'shader',
  defaultSettings: {
    dissolveAmount: 0.5,
    energyColor: '#ffaa00',
    particleSize: 0.02,
    turbulence: 1.0,
    speed: 1.0,
  },
  settingsSchema: {
    dissolveAmount: {
      type: 'number',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.5,
      description: 'Amount of dissolution',
    },
    energyColor: {
      type: 'color',
      default: '#ffaa00',
      description: 'Color of the energy effect',
    },
    particleSize: {
      type: 'number',
      min: 0.005,
      max: 0.1,
      step: 0.005,
      default: 0.02,
      description: 'Size of energy particles',
    },
    turbulence: {
      type: 'number',
      min: 0.1,
      max: 3.0,
      step: 0.1,
      default: 1.0,
      description: 'Turbulence intensity',
    },
    speed: {
      type: 'number',
      min: 0.1,
      max: 3.0,
      step: 0.1,
      default: 1.0,
      description: 'Animation speed',
    },
  },
  compute: ({ progress, globalTime, settings }) => {
    const vertexShader = `
      uniform float uTime;
      uniform float uDissolveAmount;
      uniform float uTurbulence;
      uniform float uSpeed;
      
      varying vec2 vUv;
      varying vec3 vPosition;
      varying float vNoise;
      
      // 3D Noise function
      vec3 mod289(vec3 x) {
        return x - floor(x * (1.0 / 289.0)) * 289.0;
      }
      
      vec4 mod289(vec4 x) {
        return x - floor(x * (1.0 / 289.0)) * 289.0;
      }
      
      vec4 permute(vec4 x) {
        return mod289(((x*34.0)+1.0)*x);
      }
      
      vec4 taylorInvSqrt(vec4 r) {
        return 1.79284291400159 - 0.85373472095314 * r;
      }
      
      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        
        i = mod289(i);
        vec4 p = permute(permute(permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }
      
      void main() {
        vUv = uv;
        vPosition = position;
        
        vec3 pos = position;
        
        // Generate noise for dissolve effect
        vec3 noisePos = pos * 5.0 + uTime * uSpeed;
        float noise = snoise(noisePos) * 0.5 + 0.5;
        vNoise = noise;
        
        // Displace vertices based on dissolve amount
        float dissolve = smoothstep(uDissolveAmount - 0.1, uDissolveAmount + 0.1, noise);
        vec3 displacement = snoise(noisePos + vec3(1.0, 2.0, 3.0)) * vec3(1.0, 1.0, 0.0) * uTurbulence;
        
        pos += displacement * (1.0 - dissolve) * 0.3;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;
    
    const fragmentShader = `
      uniform float uDissolveAmount;
      uniform vec3 uEnergyColor;
      uniform float uParticleSize;
      uniform vec3 uColor;
      uniform float uOpacity;
      
      varying vec2 vUv;
      varying float vNoise;
      
      void main() {
        float dissolve = smoothstep(uDissolveAmount - 0.1, uDissolveAmount + 0.1, vNoise);
        
        if (dissolve < 0.01) {
          discard;
        }
        
        // Create energy particle effect
        vec2 center = fract(vUv * (1.0 / uParticleSize)) - 0.5;
        float dist = length(center);
        float particle = 1.0 - smoothstep(0.0, 0.5, dist);
        
        // Mix between solid text and energy particles
        float energyMix = 1.0 - dissolve;
        vec3 finalColor = mix(uColor, uEnergyColor, energyMix);
        
        float alpha = dissolve * uOpacity;
        alpha *= mix(1.0, particle, energyMix);
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `;
    
    return {
      shader: {
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: globalTime },
          uDissolveAmount: { value: progress * settings.dissolveAmount },
          uEnergyColor: { value: new THREE.Color(settings.energyColor) },
          uParticleSize: { value: settings.particleSize },
          uTurbulence: { value: settings.turbulence },
          uSpeed: { value: settings.speed },
          uColor: { value: new THREE.Color('#ffffff') },
          uOpacity: { value: 1.0 },
        },
        transparent: true,
      },
    };
  },
};

// =============================================================================
// REGISTER ALL ANIMATIONS
// =============================================================================

export function registerAdvancedAnimations() {
  shaderAnimationRegistry.register(waveDistortionAnimation);
  shaderAnimationRegistry.register(typewriterAnimation);
  shaderAnimationRegistry.register(glitchAnimation);
  shaderAnimationRegistry.register(hologramAnimation);
  shaderAnimationRegistry.register(energyDissolveAnimation);
}

// Auto-register when module is imported
registerAdvancedAnimations();

export {
  waveDistortionAnimation,
  typewriterAnimation,
  glitchAnimation,
  hologramAnimation,
  energyDissolveAnimation,
};