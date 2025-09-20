import { useRef, useCallback } from 'react';
import * as THREE from 'three';
import type { ImageAsset } from '../../shared/types';

const frag = `
uniform sampler2D u_tex;
uniform float u_opacity;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_saturation;
uniform float u_hue;
uniform float u_temperature;
uniform float u_highlights;
uniform float u_shadows;
uniform float u_vignette;
uniform float u_sharpen;
varying vec2 vUv;

// Helpers
vec3 adjustSaturation(vec3 color, float sat) {
  float l = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return mix(vec3(l), color, 1.0 + sat);
}

vec3 adjustContrast(vec3 color, float contrast) {
  return (color - 0.5) * (1.0 + contrast) + 0.5;
}

vec3 adjustBrightness(vec3 color, float brightness) {
  return color + brightness;
}

vec3 adjustHue(vec3 color, float hue) {
  // Convert hue from degrees-like range (-1..1) to radians
  float angle = hue * 3.14159265;
  float s = sin(angle), c = cos(angle);
  mat3 mat = mat3(
    0.299, 0.587, 0.114,
    0.299, 0.587, 0.114,
    0.299, 0.587, 0.114
  );
  mat3 r = mat3(
    0.701, -0.587, -0.114,
    -0.299, 0.413, -0.114,
    -0.300, -0.588, 0.886
  );
  return (mat + c * r + s * mat3(0.168, 0.330, -0.497, -0.328, 0.035, 0.292, 1.250, -1.050, -0.203)) * color;
}

void main() {
  vec4 tex = texture2D(u_tex, vUv);
  vec3 col = tex.rgb;
  
  // Basic adjustments
  col = adjustBrightness(col, u_brightness);
  col = adjustContrast(col, u_contrast);
  col = adjustSaturation(col, u_saturation);
  col = adjustHue(col, u_hue);
  
  // Temperature: approximate by shifting blue/yellow balance
  col += vec3(u_temperature * 0.05, 0.0, -u_temperature * 0.05);
  
  // Highlights/Shadows: simple tone curve
  col = mix(col, max(col, vec3(0.0)) + u_shadows, step(0.5, 0.5));
  col = mix(col, min(col, vec3(1.0)) + u_highlights, step(0.5, 0.5));
  
  // Vignette
  vec2 pos = vUv - 0.5;
  float dist = length(pos) * 1.4142; // sqrt(2)
  col *= 1.0 - smoothstep(0.6, 1.0, dist) * u_vignette;
  
  gl_FragColor = vec4(col, tex.a * u_opacity);
}
`;

const vert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const useImageMaterial = () => {
  const materialRef = useRef<THREE.ShaderMaterial>(null as any);
  const textureRef = useRef<THREE.Texture | null>(null);

  const setupForAsset = useCallback((asset: ImageAsset) => {
    // Lazily create material
    if (!materialRef.current) {
      materialRef.current = new THREE.ShaderMaterial({
        uniforms: {
          u_tex: { value: null },
          u_opacity: { value: 1 },
          u_brightness: { value: 0 },
          u_contrast: { value: 0 },
          u_saturation: { value: 0 },
          u_hue: { value: 0 },
          u_temperature: { value: 0 },
          u_highlights: { value: 0 },
          u_shadows: { value: 0 },
          u_vignette: { value: 0 },
          u_sharpen: { value: 0 },
        },
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
      });
    }

    // If texture already exists, just hook it up
    if (textureRef.current) {
      if (materialRef.current.uniforms && materialRef.current.uniforms.u_tex) {
        materialRef.current.uniforms.u_tex.value = textureRef.current;
        materialRef.current.needsUpdate = true;
      }
      return;
    }

    // Create a fresh Image to avoid any proxy issues
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const tex = new THREE.Texture(img);
      tex.needsUpdate = true;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      textureRef.current = tex;
      if (materialRef.current.uniforms && materialRef.current.uniforms.u_tex) {
        materialRef.current.uniforms.u_tex.value = textureRef.current;
        materialRef.current.needsUpdate = true;
      }
    };
    img.src = asset.src;
  }, []);

  return { materialRef, setupForAsset };
};

export default useImageMaterial;
