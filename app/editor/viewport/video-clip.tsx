import React, { useRef, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import * as THREE from 'three';
import type { Mesh, VideoTexture } from 'three';
import { useFrame } from '@react-three/fiber';
import editorStore from '../shared/store';
import type { ActiveClip } from '../shared/types';
import { useVideoPlayback } from './hooks/use-video-playback';

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

  // Calculate aspect ratio for plane geometry
  const aspectRatio = asset?.aspectRatio || (16 / 9);
  const planeArgs: [number, number] = [aspectRatio, 1];

  // Update material properties
  useEffect(() => {
    if (materialRef.current) {
      const effectiveOpacity = isActive ? clip.opacity : 0;
      materialRef.current.opacity = effectiveOpacity * (clip.track.visible ? 1 : 0);
      materialRef.current.transparent = effectiveOpacity < 1 || !clip.track.visible;
      materialRef.current.visible = isActive && clip.visible && clip.track.visible;
    }
  }, [clip.opacity, clip.visible, clip.track.visible, isActive]);

  // Dynamically attach the texture to the material when it becomes available (helps Safari)
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

  return (
    <mesh
      ref={meshRef}
      position={clip.position}
      rotation={clip.rotation}
      scale={clip.scale}
      visible={isActive && clip.visible && clip.track.visible}
    >
      <planeGeometry args={planeArgs} />
      <meshBasicMaterial
        ref={materialRef}
        // map will be set dynamically when available
        transparent
        opacity={clip.opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};