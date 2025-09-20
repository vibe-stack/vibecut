import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useSnapshot } from 'valtio';
import * as THREE from 'three';
import type { Mesh, VideoTexture } from 'three';
import { useFrame } from '@react-three/fiber';
import editorStore, { editorActions } from '../shared/store';
import type { ActiveClip } from '../shared/types';
import { useVideoPlayback } from './hooks/use-video-playback';
import { Line } from '@react-three/drei';

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

  const isSelected = snapshot.selectedClipIds.includes(clip.id);

  // Simple drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'resize' | 'rotate' | null>(null);

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

  // Simplified resize handler using DOM events
  const startResize = (e: any) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragMode('resize');
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startScale = clip.scale.clone();

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = (e.clientX - startX) * 0.005; // Scale factor
      const deltaY = (startY - e.clientY) * 0.005; // Invert Y
      
      const newScale = new THREE.Vector3(
        Math.max(0.1, startScale.x + deltaX),
        Math.max(0.1, startScale.y + deltaY),
        startScale.z
      );
      
      editorActions.updateClip(clip.id, { scale: newScale });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragMode(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Simplified rotation handler
  const startRotate = (e: any) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragMode('rotate');
    
    const startX = e.clientX;
    const startRotation = clip.rotation.z;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = (e.clientX - startX) * 0.01; // Rotation factor
      
      const newRotation = new THREE.Euler(
        clip.rotation.x,
        clip.rotation.y,
        startRotation + deltaX
      );
      
      editorActions.updateClip(clip.id, { rotation: newRotation });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragMode(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Calculate overlay dimensions
  const { halfW, halfH } = useMemo(() => {
    const baseW = planeArgs[0];
    const baseH = planeArgs[1];
    const w = baseW * clip.scale.x;
    const h = baseH * clip.scale.y;
    return { halfW: w / 2, halfH: h / 2 };
  }, [clip.scale.x, clip.scale.y, planeArgs]);

  return (
    <group position={clip.position} rotation={clip.rotation}>
      {/* Main video mesh */}
      <mesh
        ref={meshRef}
        scale={clip.scale}
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
      {isSelected && isActive && clip.visible && clip.track.visible && (
        <group>
          {/* AABB outline */}
          <Line
            points={[
              [-halfW, -halfH, 0.001],
              [ halfW, -halfH, 0.001],
              [ halfW,  halfH, 0.001],
              [-halfW,  halfH, 0.001],
              [-halfW, -halfH, 0.001],
            ]}
            color="#00e5ff"
            lineWidth={2}
          />
          
          {/* Corner resize handles */}
          <mesh
            position={[halfW, halfH, 0.002]}
            onPointerDown={startResize}
          >
            <circleGeometry args={[0.05, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          
          <mesh
            position={[-halfW, halfH, 0.002]}
            onPointerDown={startResize}
          >
            <circleGeometry args={[0.05, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          
          <mesh
            position={[halfW, -halfH, 0.002]}
            onPointerDown={startResize}
          >
            <circleGeometry args={[0.05, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          
          <mesh
            position={[-halfW, -halfH, 0.002]}
            onPointerDown={startResize}
          >
            <circleGeometry args={[0.05, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          
          {/* Rotation handle */}
          <mesh
            position={[0, halfH + 0.15, 0.002]}
            onPointerDown={startRotate}
          >
            <circleGeometry args={[0.05, 16]} />
            <meshBasicMaterial color="#ffcc00" />
          </mesh>
        </group>
      )}
    </group>
  );
};