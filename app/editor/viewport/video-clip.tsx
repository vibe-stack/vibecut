import React, { useRef, useEffect, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import * as THREE from 'three';
import type { Mesh, VideoTexture } from 'three';
import { useFrame } from '@react-three/fiber';
import editorStore, { editorActions } from '../shared/store';
import type { ActiveClip } from '../shared/types';
import { useVideoPlayback } from './hooks/use-video-playback';
import { SelectionOverlay } from './selection-overlay';
import { useFitToViewport } from './hooks';
import { useTransientOrBaseTransform } from './interactions/transform-sessions';

/**
 * Individual video clip component for R3F
 */
interface VideoClipProps {
  clip: ActiveClip;
  isActive: boolean;
}

export const VideoClip: React.FC<VideoClipProps> = ({ clip, isActive }) => {
  const meshRef = useRef<Mesh>(null);
  const snapshot = useSnapshot(editorStore);
  
  const { videoRef, materialRef, textureRef, asset } = useVideoPlayback(clip, isActive);

  // Ensure initial fit when asset is known
  useFitToViewport(clip, asset);

  // Calculate aspect ratio for plane geometry
  const aspectRatio = asset?.aspectRatio || (16 / 9);
  const planeArgs: [number, number] = [aspectRatio, 1];

  const isSelected = snapshot.selectedClipIds.includes(clip.id);
  const xform = useTransientOrBaseTransform(clip.id, {
    position: clip.position,
    rotation: clip.rotation,
    scale: clip.scale,
  });

  // Update material properties
  useEffect(() => {
    if (materialRef.current) {
      const effectiveOpacity = isActive ? clip.opacity : 0;
      materialRef.current.opacity = effectiveOpacity * (clip.track.visible ? 1 : 0);
      materialRef.current.transparent = effectiveOpacity < 1 || !clip.track.visible;
      materialRef.current.visible = isActive && clip.visible && clip.track.visible;
    }
  }, [clip.opacity, clip.visible, clip.track.visible, isActive]);

  // Dynamically attach the texture to the material when it becomes available
  useFrame(() => {
    const mat = materialRef.current;
    const tex = textureRef.current as VideoTexture | null;
    if (mat && tex && mat.map !== tex) {
      mat.map = tex;
      mat.needsUpdate = true;
    }
    if (tex) {
      tex.needsUpdate = true;
    }
  });

  // Handle selection
  const handleSelect = (e: any) => {
    e.stopPropagation();
    if (!isSelected) {
      editorActions.selectClips([clip.id]);
    }
  };

  // Calculate overlay dimensions
  const { halfW, halfH } = useMemo(() => {
    const baseW = planeArgs[0];
    const baseH = planeArgs[1];
    const w = baseW * xform.scale.x;
    const h = baseH * xform.scale.y;
    return { halfW: w / 2, halfH: h / 2 };
  }, [xform.scale.x, xform.scale.y, planeArgs]);

  return (
    <group position={xform.position} rotation={xform.rotation}>
      {/* Main video mesh */}
      <mesh
        ref={meshRef}
        scale={xform.scale}
        visible={isActive && clip.visible && clip.track.visible}
        onPointerDown={handleSelect}
      >
        <planeGeometry args={planeArgs} />
        <meshBasicMaterial
          ref={materialRef}
          transparent
          opacity={clip.opacity}
          side={THREE.DoubleSide}
        />
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