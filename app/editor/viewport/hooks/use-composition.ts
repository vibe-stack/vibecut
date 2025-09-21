import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { useSnapshot } from 'valtio';
import editorStore from '../../shared/store';

/** Composition state hook */
export function useComposition() {
  const snap = useSnapshot(editorStore);
  const { aspectW, aspectH, fps, background } = snap.composition;
  return { aspectW, aspectH, fps, background } as const;
}

/** Calculates a plane size that fits entirely in the current camera view using the target aspect. */
export function useFittedFrameSize() {
  const { size, camera } = useThree();
  const { aspectW, aspectH } = useComposition();

  return useMemo(() => {
    // Compute frustum dimensions at z=0 for perspective camera
    const cam = camera as unknown as import('three').PerspectiveCamera;
    const distance = Math.abs(cam.position.z);
    const vH = 2 * Math.tan((cam.fov * Math.PI) / 360) * distance;
    const vW = (vH * size.width) / size.height;
    // Composition plane base is width=aspect, height=1 units
    const targetAspect = aspectW / aspectH;
    const contentW = targetAspect;
    const contentH = 1;
    const scale = Math.min(vW / contentW, vH / contentH) * 0.98; // tight but fully visible
    const width = contentW * scale;
    const height = contentH * scale;
    return { width, height, targetAspect };
  }, [size.width, size.height, (camera as any).fov, aspectW, aspectH]);
}

/** Returns a black matte size that fills the viewport (used implicitly by Canvas background). */
export function useViewportDimsAtPlane() {
  const { size, camera } = useThree();
  return useMemo(() => {
    const cam = camera as unknown as import('three').PerspectiveCamera;
    const distance = Math.abs(cam.position.z);
    const vH = 2 * Math.tan((cam.fov * Math.PI) / 360) * distance;
    const vW = (vH * size.width) / size.height;
    return { vW, vH };
  }, [size.width, size.height, (camera as any).fov]);
}

export const COMMON_ASPECTS: Array<{ label: string; value: string }> = [
  // Video/Film
  { label: 'HD 16:9 (1920x1080)', value: '16:9' },
  { label: '4K UHD 16:9 (3840x2160)', value: '16:9' },
  { label: 'DCI 4K 1.9:1 (4096x2160)', value: '256:135' },
  { label: 'Cinemascope 2.39:1', value: '239:100' },
  { label: 'Classic Film 4:3', value: '4:3' },
  // Social (popular formats)
  { label: 'TikTok/Reels/Shorts 9:16 (1080x1920)', value: '9:16' },
  { label: 'Instagram 4:5 (1080x1350)', value: '4:5' },
  { label: 'Facebook/IG Landscape 16:9', value: '16:9' },
  { label: 'YouTube 16:9', value: '16:9' },
  { label: 'Square 1:1 (1080x1080)', value: '1:1' },
  { label: 'Twitter/X Landscape 16:9', value: '16:9' },
  { label: 'Twitter/X Portrait 9:16', value: '9:16' },
  { label: 'LinkedIn Landscape 16:9', value: '16:9' },
];

export const DIMENSION_PRESETS: Array<{ label: string; width: number; height: number }> = [
  // Landscape
  { label: 'HD 1920×1080', width: 1920, height: 1080 },
  { label: '4K UHD 3840×2160', width: 3840, height: 2160 },
  { label: 'DCI 4K 4096×2160', width: 4096, height: 2160 },
  { label: 'Cinemascope 2560×1070', width: 2560, height: 1070 },
  // Portrait
  { label: 'Portrait 1080×1920', width: 1080, height: 1920 },
  { label: 'Portrait 720×1280', width: 720, height: 1280 },
  // Square
  { label: 'Square 1080×1080', width: 1080, height: 1080 },
];

export const FPS_PRESETS: Array<number> = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60];

export const PRESET_BACKGROUNDS: Array<{ label: string; hex: string }> = [
  { label: 'Onyx', hex: '#0b0b0f' },
  { label: 'Charcoal', hex: '#16161d' },
  { label: 'Gunmetal', hex: '#1f2428' },
  { label: 'Slate', hex: '#2a2f36' },
  { label: 'Ink', hex: '#0a0a0a' },
  { label: 'Eclipse', hex: '#1b1b22' },
];

export function parseAspect(value: string): { w: number; h: number } | null {
  const m = value.trim().toLowerCase().replace(/\s+/g, '').match(/^(\d+):(\d+)$/);
  if (!m) return null;
  const w = parseInt(m[1], 10);
  const h = parseInt(m[2], 10);
  if (!w || !h) return null;
  return { w, h };
}
