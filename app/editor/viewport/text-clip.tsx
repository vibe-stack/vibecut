import React, { useMemo, useRef, useState } from 'react';
import { useSnapshot } from 'valtio';
import * as THREE from 'three';
import editorStore, { editorActions } from '../shared/store';
import type { ActiveClip } from '../shared/types';
import { Line, Text } from '@react-three/drei';
import { computeTextAnimationProps } from './animations';

interface TextClipProps {
  clip: ActiveClip;
  isActive: boolean;
}

export const TextClip: React.FC<TextClipProps> = ({ clip, isActive }) => {
  const snap = useSnapshot(editorStore);
  const isSelected = snap.selectedClipIds.includes(clip.id);
  const content = clip.textContent || 'Text';
  const style = clip.textStyle || snap.config.defaultTextStyle || { fontFamily: 'Inter', fontSize: 0.4, bold: false, italic: false, color: '#ffffff' };

  // Rough bounds based on font size and text length (not exact, but sufficient for handles)
  const baseW = Math.max(0.6, (content.length * 0.3) * (style.fontSize / 0.4));
  const baseH = style.fontSize;

  const { halfW, halfH } = useMemo(() => {
    const w = baseW * clip.scale.x;
    const h = baseH * clip.scale.y;
    return { halfW: w / 2, halfH: h / 2 };
  }, [baseW, baseH, clip.scale.x, clip.scale.y]);

  const [dragMode, setDragMode] = useState<'resize' | 'rotate' | null>(null);

  const startResize = (e: any) => {
    e.stopPropagation();
    setDragMode('resize');
    const startX = e.clientX;
    const startY = e.clientY;
    const startScale = clip.scale.clone();
    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - startX) * 0.005;
      const dy = (startY - e.clientY) * 0.005;
      editorActions.updateClip(clip.id, { scale: new THREE.Vector3(Math.max(0.1, startScale.x + dx), Math.max(0.1, startScale.y + dy), startScale.z) });
    };
    const handleMouseUp = () => {
      setDragMode(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const startRotate = (e: any) => {
    e.stopPropagation();
    setDragMode('rotate');
    const startX = e.clientX;
    const startRot = clip.rotation.z;
    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - startX) * 0.01;
      editorActions.updateClip(clip.id, { rotation: new THREE.Euler(clip.rotation.x, clip.rotation.y, startRot + dx) });
    };
    const handleMouseUp = () => {
      setDragMode(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

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

  const animProps = useMemo(() => {
    return computeTextAnimationProps(clip, clip.textAnimations, progress, snap.playback.isPlaying);
  }, [clip, clip.textAnimations, progress, snap.playback.isPlaying]);

  return (
    <group position={clip.position} rotation={clip.rotation}>
      <group visible={isActive && clip.visible && clip.track.visible}>
        <Text
          position={[
            (animProps.positionOffset?.[0] || 0),
            (animProps.positionOffset?.[1] || 0),
            (animProps.positionOffset?.[2] || 0),
          ]}
          scale={new THREE.Vector3(
            clip.scale.x * (animProps.scaleMul ?? 1),
            clip.scale.y * (animProps.scaleMul ?? 1),
            clip.scale.z,
          )}
          color={style.color}
          fontSize={style.fontSize}
          font={undefined}
          anchorX="center"
          anchorY="middle"
          onPointerDown={handleSelect}
          rotation={new THREE.Euler(0, 0, (clip.rotation?.z || 0) + (animProps.rotationZ ?? 0))}
          material-transparent
          material-opacity={(clip.opacity ?? 1) * (animProps.opacityMul ?? 1)}
        >
          {content}
        </Text>
      </group>

      {isSelected && isActive && clip.visible && clip.track.visible && (
        <group>
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
          <mesh position={[halfW, halfH, 0.002]} onPointerDown={startResize}>
            <circleGeometry args={[0.05, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-halfW, halfH, 0.002]} onPointerDown={startResize}>
            <circleGeometry args={[0.05, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[halfW, -halfH, 0.002]} onPointerDown={startResize}>
            <circleGeometry args={[0.05, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-halfW, -halfH, 0.002]} onPointerDown={startResize}>
            <circleGeometry args={[0.05, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, halfH + 0.15, 0.002]} onPointerDown={startRotate}>
            <circleGeometry args={[0.05, 16]} />
            <meshBasicMaterial color="#ffcc00" />
          </mesh>
        </group>
      )}
    </group>
  );
};

export default TextClip;
