import React, { useMemo, useRef, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import * as THREE from 'three';
import type { Mesh } from 'three';
import editorStore, { editorActions } from '../shared/store';
import type { ActiveClip } from '../shared/types';
import { SelectionOverlay } from './selection-overlay';
import { useImageMaterial, useFitToViewport } from './hooks';
import { useTransientOrBaseTransform } from './interactions/transform-sessions';
import type { ImageAsset } from '../shared/types';

interface ImageClipProps {
  clip: ActiveClip;
  isActive: boolean;
}

export const ImageClip: React.FC<ImageClipProps> = ({ clip, isActive }) => {
  const meshRef = useRef<Mesh>(null);
  const snap = useSnapshot(editorStore);
  const asset = snap.assets[clip.assetId];

  const { materialRef, setupForAsset } = useImageMaterial();

  useEffect(() => {
    if (asset && asset.type === 'image' && (asset as any).image) {
      setupForAsset(asset as unknown as ImageAsset);
    }
  }, [asset, setupForAsset]);

  const aspectRatio = asset?.aspectRatio || (16 / 9);
  const planeArgs: [number, number] = [aspectRatio, 1];

  const isSelected = snap.selectedClipIds.includes(clip.id);
  const xform = useTransientOrBaseTransform(clip.id, {
    position: clip.position,
    rotation: clip.rotation,
    scale: clip.scale,
  });

  useFitToViewport(clip, asset);

  // Visibility & opacity
  useEffect(() => {
    const mat = materialRef.current as THREE.ShaderMaterial | null;
    if (mat) {
      const effectiveOpacity = isActive ? clip.opacity : 0;
      mat.transparent = effectiveOpacity < 1 || !clip.track.visible;
      mat.visible = isActive && clip.visible && clip.track.visible;
      if ((mat as any).uniforms && (mat as any).uniforms.u_opacity) {
        (mat as any).uniforms.u_opacity.value = effectiveOpacity * (clip.track.visible ? 1 : 0);
      }
    }
  }, [clip.opacity, clip.visible, clip.track.visible, isActive, materialRef]);

  // Update uniforms for adjustments and presets
  useEffect(() => {
  const mat = materialRef.current as any;
  if (!mat || !mat.uniforms) return;
  const u = mat.uniforms;
    const adj = clip.imageAdjustments || {
      brightness: 0, contrast: 0, saturation: 0, sharpen: 0,
      highlights: 0, shadows: 0, temperature: 0, hue: 0, vignette: 0,
    };
    const preset = clip.imageFilterPreset || 'none';
    const presetAdj = getPresetAdjustments(preset);
    const final = {
      brightness: adj.brightness + presetAdj.brightness,
      contrast: adj.contrast + presetAdj.contrast,
      saturation: adj.saturation + presetAdj.saturation,
      hue: adj.hue + presetAdj.hue,
      temperature: adj.temperature + presetAdj.temperature,
      highlights: adj.highlights + presetAdj.highlights,
      shadows: adj.shadows + presetAdj.shadows,
      vignette: Math.min(1, adj.vignette + presetAdj.vignette),
      sharpen: Math.min(1, adj.sharpen + presetAdj.sharpen),
    };
    if (u.u_brightness) u.u_brightness.value = final.brightness;
    if (u.u_contrast) u.u_contrast.value = final.contrast;
    if (u.u_saturation) u.u_saturation.value = final.saturation;
    if (u.u_hue) u.u_hue.value = final.hue;
    if (u.u_temperature) u.u_temperature.value = final.temperature;
    if (u.u_highlights) u.u_highlights.value = final.highlights;
    if (u.u_shadows) u.u_shadows.value = final.shadows;
    if (u.u_vignette) u.u_vignette.value = final.vignette;
    if (u.u_sharpen) u.u_sharpen.value = final.sharpen;
  }, [clip.imageAdjustments, clip.imageFilterPreset, materialRef]);

  // Selection
  const handleSelect = (e: any) => {
    e.stopPropagation();
    if (!isSelected) editorActions.selectClips([clip.id]);
  };

  const { halfW, halfH } = useMemo(() => {
    const baseW = planeArgs[0];
    const baseH = planeArgs[1];
    const w = baseW * xform.scale.x;
    const h = baseH * xform.scale.y;
    return { halfW: w / 2, halfH: h / 2 };
  }, [xform.scale.x, xform.scale.y, planeArgs]);

  return (
    <group position={xform.position} rotation={xform.rotation}>
      <mesh
        ref={meshRef}
        scale={xform.scale}
        visible={isActive && clip.visible && clip.track.visible}
        onPointerDown={handleSelect}
      >
        <planeGeometry args={planeArgs} />
        {/* Use our shader material when ready; fallback basic material otherwise */}
        {materialRef.current ? (
          <primitive attach="material" object={materialRef.current as unknown as THREE.Material} />
        ) : (
          <meshBasicMaterial transparent opacity={clip.opacity} />
        )}
      </mesh>

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

export default ImageClip;

// Simple preset library mapped to adjustment deltas
function getPresetAdjustments(preset: string) {
  switch (preset) {
    case 'mono':
      return { brightness: 0, contrast: 0.1, saturation: -1, hue: 0, temperature: 0, highlights: 0.05, shadows: 0.05, vignette: 0.2, sharpen: 0.1 };
    case 'sepia':
      return { brightness: 0.05, contrast: 0.05, saturation: -0.2, hue: 0.05, temperature: 0.3, highlights: 0.05, shadows: 0.05, vignette: 0.15, sharpen: 0.05 };
    case 'film':
      return { brightness: -0.05, contrast: 0.15, saturation: 0.1, hue: 0, temperature: -0.05, highlights: 0.1, shadows: 0.1, vignette: 0.3, sharpen: 0.1 };
    case 'vintage':
      return { brightness: 0.05, contrast: -0.05, saturation: -0.15, hue: 0.03, temperature: 0.2, highlights: -0.05, shadows: 0.1, vignette: 0.25, sharpen: 0.05 };
    case 'cool':
      return { brightness: 0, contrast: 0.05, saturation: 0.05, hue: 0, temperature: -0.3, highlights: 0.05, shadows: 0, vignette: 0.05, sharpen: 0 };
    case 'warm':
      return { brightness: 0, contrast: 0.05, saturation: 0.05, hue: 0, temperature: 0.3, highlights: 0.05, shadows: 0, vignette: 0.05, sharpen: 0 };
    case 'pop':
      return { brightness: 0.05, contrast: 0.2, saturation: 0.25, hue: 0, temperature: 0, highlights: 0, shadows: 0, vignette: 0.05, sharpen: 0.1 };
    case 'fade':
      return { brightness: 0.05, contrast: -0.2, saturation: -0.1, hue: 0, temperature: 0.05, highlights: -0.05, shadows: 0.1, vignette: 0.1, sharpen: 0 };
    case 'dramatic':
      return { brightness: -0.05, contrast: 0.25, saturation: -0.05, hue: 0, temperature: 0, highlights: -0.05, shadows: 0.2, vignette: 0.35, sharpen: 0.15 };
    case 'none':
    default:
      return { brightness: 0, contrast: 0, saturation: 0, hue: 0, temperature: 0, highlights: 0, shadows: 0, vignette: 0, sharpen: 0 };
  }
}
