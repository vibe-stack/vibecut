import React, { useMemo, useRef } from 'react';
import { useSnapshot } from 'valtio';
import * as THREE from 'three';
import editorStore, { editorActions } from '../shared/store';
import type { ActiveClip } from '../shared/types';
import { Text } from '@react-three/drei';
import { SelectionOverlay } from './selection-overlay';
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
