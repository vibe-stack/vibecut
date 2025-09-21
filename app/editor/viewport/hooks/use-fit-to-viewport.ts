import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { editorActions } from '../../shared/store';
import type { ActiveClip } from '../../shared/types';

/**
 * Ensures the clip initially fits into the visible viewport. Runs once for a clip when it becomes active
 * or when its asset metrics become available. It scales uniformly to fit within the frustum height/width.
 */
export function useFitToViewport(
  clip: ActiveClip,
  asset?: { id?: string; aspectRatio?: number } | undefined
) {
  const { camera, size } = useThree();
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

    // Compute viewport dimensions at z=0 for perspective camera
    const cam = camera as THREE.PerspectiveCamera;
    const distance = Math.abs(cam.position.z); // plane at z=0
    const vH = 2 * Math.tan((cam.fov * Math.PI) / 360) * distance;
    const vW = (vH * size.width) / size.height;

    // Our plane geometry is aspectRatio x 1 units; content size before scale is width=aspect, height=1
  const aspect = asset.aspectRatio || 16 / 9;
    const contentW = aspect;
    const contentH = 1;

    const scaleToFit = Math.min(vW / contentW, vH / contentH) * 0.9; // keep 10% padding
    const newScale = new THREE.Vector3(scaleToFit, scaleToFit, clip.scale.z);
    editorActions.updateClip(clip.id, { scale: newScale });
    fittedRef.current = key;
  }, [asset?.id, asset?.aspectRatio, camera, size.width, size.height, clip.id]);
}
