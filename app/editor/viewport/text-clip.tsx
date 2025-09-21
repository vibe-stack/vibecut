import React, { useMemo, useRef } from 'react';
import { useSnapshot } from 'valtio';
import * as THREE from 'three';
import editorStore, { editorActions } from '../shared/store';
import type { ActiveClip, EnhancedTextAnimation } from '../shared/types';
import { Text } from '@react-three/drei';
import { SelectionOverlay } from './selection-overlay';
import { 
  computeEnhancedTextAnimations, 
  computeTextAnimationProps,
  shaderAnimationRegistry,
  type AnimationResult 
} from './animations';
import { useTransientOrBaseTransform } from './interactions/transform-sessions';
import { useFitToViewport } from './hooks';
import { useFrame } from '@react-three/fiber';

interface TextClipProps {
  clip: ActiveClip;
  isActive: boolean;
}

interface TextClipProps {
  clip: ActiveClip;
  isActive: boolean;
}

export const TextClip: React.FC<TextClipProps> = ({ clip, isActive }) => {
  const snap = useSnapshot(editorStore);
  const isSelected = snap.selectedClipIds.includes(clip.id);
  const textRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.Material | null>(null);
  
  const xform = useTransientOrBaseTransform(clip.id, {
    position: clip.position,
    rotation: clip.rotation,
    scale: clip.scale,
  });
  
  const content = clip.textContent || 'Text';
  const style = clip.textStyle || snap.config.defaultTextStyle || { 
    fontFamily: 'Inter', 
    fontSize: 0.4, 
    bold: false, 
    italic: false, 
    color: '#ffffff' 
  };

  // Rough bounds based on font size and text length (not exact, but sufficient for handles)
  const baseW = Math.max(0.6, (content.length * 0.3) * (style.fontSize / 0.4));
  const baseH = style.fontSize;

  const { halfW, halfH } = useMemo(() => {
    const w = baseW * xform.scale.x;
    const h = baseH * xform.scale.y;
    return { halfW: w / 2, halfH: h / 2 };
  }, [baseW, baseH, xform.scale.x, xform.scale.y]);

  const handleSelect = (e: any) => {
    e.stopPropagation();
    if (!isSelected) editorActions.selectClips([clip.id]);
  };

  const progress = useMemo(() => {
    if (!isActive) return 0;
    const { start, end } = clip;
    const duration = Math.max(0.0001, end - start);
    const p = (snap.playback.currentTime - start) / duration;
    return Math.max(0, Math.min(1, p));
  }, [isActive, clip.start, clip.end, snap.playback.currentTime]);

  // Convert legacy animations to enhanced format
  const enhancedAnimations: EnhancedTextAnimation[] = useMemo(() => {
    if (!clip.textAnimations) return [];
    return clip.textAnimations.map((anim, index) => ({
      ...anim,
      settings: anim.settings || {},
      priority: index,
      cacheable: true,
    }));
  }, [clip.textAnimations]);

  // Use new shader animation system
  const animationResult = useMemo(() => {
    return computeEnhancedTextAnimations(clip, enhancedAnimations, {
      progress,
      globalTime: performance.now() / 1000,
      deltaTime: 1/60,
      isPlaying: snap.playback.isPlaying,
    });
  }, [clip, enhancedAnimations, progress, snap.playback.isPlaying]);

  // Fallback to legacy system for backward compatibility
  const legacyAnimProps = useMemo(() => {
    return computeTextAnimationProps(clip, clip.textAnimations, progress, snap.playback.isPlaying);
  }, [clip, clip.textAnimations, progress, snap.playback.isPlaying]);

  // Combine transform properties
  const finalTransform = useMemo(() => {
    const result = {
      position: new THREE.Vector3().copy(xform.position),
      rotation: new THREE.Euler().copy(xform.rotation),
      scale: new THREE.Vector3().copy(xform.scale),
      opacity: clip.opacity ?? 1,
    };

    // Apply animation transform
    if (animationResult.transform) {
      if (animationResult.transform.position) {
        result.position.add(animationResult.transform.position);
      }
      if (animationResult.transform.rotation) {
        result.rotation.x += animationResult.transform.rotation.x;
        result.rotation.y += animationResult.transform.rotation.y;
        result.rotation.z += animationResult.transform.rotation.z;
      }
      if (animationResult.transform.scale) {
        result.scale.multiply(animationResult.transform.scale);
      }
      if (typeof animationResult.transform.opacity === 'number') {
        result.opacity *= animationResult.transform.opacity;
      }
    }

    // Apply legacy animation properties for backward compatibility
    if (legacyAnimProps.positionOffset) {
      result.position.add(new THREE.Vector3(...legacyAnimProps.positionOffset));
    }
    if (legacyAnimProps.rotationZ) {
      result.rotation.z += legacyAnimProps.rotationZ;
    }
    if (legacyAnimProps.scaleMul) {
      result.scale.multiplyScalar(legacyAnimProps.scaleMul);
    }
    if (typeof legacyAnimProps.opacityMul === 'number') {
      result.opacity *= legacyAnimProps.opacityMul;
    }

    return result;
  }, [xform, animationResult, legacyAnimProps, clip.opacity]);

  // Update shader material uniforms on each frame
  useFrame(() => {
    if (materialRef.current && animationResult.shader?.uniforms) {
      const material = materialRef.current as THREE.ShaderMaterial;
      if (material.uniforms) {
        // Update time-based uniforms
        if (material.uniforms.uTime) {
          material.uniforms.uTime.value = performance.now() / 1000;
        }
        if (material.uniforms.uColor) {
          material.uniforms.uColor.value = new THREE.Color(style.color);
        }
        if (material.uniforms.uOpacity) {
          material.uniforms.uOpacity.value = finalTransform.opacity;
        }
      }
    }
  });

  // Get material for advanced animations
  const animationMaterial = useMemo(() => {
    if (animationResult.shader) {
      // Create or get cached material for this animation
      const material = shaderAnimationRegistry.getMaterial('combined', animationResult.shader);
      materialRef.current = material;
      return material;
    }
    materialRef.current = null;
    return undefined;
  }, [animationResult.shader]);

  // For text, fitting is subjective; keep current behavior (optional future fit)
  return (
    <group position={finalTransform.position} rotation={finalTransform.rotation}>
      <group visible={isActive && clip.visible && clip.track.visible}>
        <Text
          ref={textRef}
          scale={finalTransform.scale}
          color={style.color}
          fontSize={style.fontSize}
          font={undefined}
          anchorX="center"
          anchorY="middle"
          onPointerDown={handleSelect}
          material={animationMaterial}
          material-transparent
          material-opacity={finalTransform.opacity}
        >
          {content}
        </Text>
      </group>

      {/* Selection overlay */}
      <SelectionOverlay
        clip={clip}
        halfWidth={halfW}
        halfHeight={halfH}
        isVisible={isSelected && isActive && clip.visible && clip.track.visible}
      />
    </group>
  );
};

export default TextClip;
