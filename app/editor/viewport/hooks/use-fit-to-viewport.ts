import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { editorActions } from '../../shared/store';
import type { ActiveClip } from '../../shared/types';
import { useFittedFrameSize } from './use-composition';

/**
 * Ensures the clip initially fits into the visible viewport. Runs once for a clip when it becomes active
 * or when its asset metrics become available. It scales uniformly to fit within the frustum height/width.
 * This guarantees the content lies fully within the composition frame which itself fits entirely.
 */
export function useFitToViewport(
  clip: ActiveClip,
  asset?: { id?: string; aspectRatio?: number } | undefined
) {
  const { width: frameW, height: frameH } = useFittedFrameSize();
  const fittedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!asset) return;
    // Avoid repeated fits per clip/asset id
    const key = `${clip.id}:${asset.id ?? 'na'}`;
    if (fittedRef.current === key) return;

    // Only apply on first mount-ish: if clip was already transformed away from default, skip.
    // Accept both legacy default scale (4) and neutral scale (1) as "unconfigured" states.
    const near = (a: number, b: number) => Math.abs(a - b) < 1e-3;
    const isDefault =
      (near(clip.scale.x, 1) && near(clip.scale.y, 1)) ||
      (near(clip.scale.x, 4) && near(clip.scale.y, 4));
  if (!isDefault) return;

    // Fit to composition frame size, not entire viewport
    // Our plane geometry is aspectRatio x 1 units; content size before scale is width=aspect, height=1
    const aspect = asset.aspectRatio || 16 / 9;
    const contentW = aspect;
    const contentH = 1;

    const scaleToFit = Math.min(frameW / contentW, frameH / contentH);
    const newScale = new THREE.Vector3(scaleToFit, scaleToFit, clip.scale.z);
    editorActions.updateClip(clip.id, { scale: newScale });
    fittedRef.current = key;
  }, [asset?.id, asset?.aspectRatio, frameW, frameH, clip.id]);
}
