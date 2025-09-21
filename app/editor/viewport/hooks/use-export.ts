/*
  Export hook: renders the R3F scene  const renderFrameToCanvas = async (w: number, h: number, timeSec: number): Promise<HTMLCanvasElement> => {
    // Advance playhead to desired time for deterministic render
    editorActions.seekTo(timeSec);

    const ctx = getRendererContext();
    console.log('Getting renderer context for export:', !!ctx);
    if (!ctx) {
      throw new Error('Renderer context not available - this should not happen if the editor is working');
    }en at target resolution and encodes video.
  - Uses export-context to access gl, scene, camera
  - Computes composition cutout from fitted frame size
  - Uses Mediabunny (ESM import) for encoding and audio muxing
*/
import { useCallback } from 'react';
import * as THREE from 'three';
import { getRendererContext, whenRendererReady } from './export-context';
import editorStore, { editorActions } from '../../shared/store';
import { useSnapshot } from 'valtio';
import { useFittedFrameSize, useComposition } from './use-composition';
import { exportActions } from '../../shared/export-store';

// ESM dynamic import for Mediabunny
let _mbPromise: Promise<any> | null = null;
async function getMediaBunny(): Promise<any> {
  if (_mbPromise) return _mbPromise;
  _mbPromise = import('mediabunny');
  return _mbPromise;
}

type ExportFormat = 'mp4' | 'webm' | 'mov';

export interface ExportOptions {
  width?: number;
  height?: number;
  fps?: number;
  bitrate?: number; // kbps
  quality?: number; // 0..1
  format?: ExportFormat;
  // Optional encoder provider (e.g., pass MediaBunny import directly)
  encoder?: any;
}

export function useExport() {
  const snap = useSnapshot(editorStore);
  const { aspectW, aspectH } = useComposition();

  const renderFrameToCanvas = async (w: number, h: number, timeSec: number): Promise<HTMLCanvasElement> => {
    // Advance playhead to desired time for deterministic render
    editorActions.seekTo(timeSec);

    const ctx = getRendererContext();
    if (!ctx) {
      throw new Error('Renderer context not available - this should not happen if the editor is working');
    }

  const { gl, scene, camera, size } = ctx;
  const prevPixelRatio = gl.getPixelRatio();
  // We'll compute the composition rect first using current DPR, then choose a DPR ensuring source >= target
  gl.setPixelRatio(prevPixelRatio);
    gl.clear(true, true, true);
    gl.render(scene, camera);

    // Compute composition plane size in CSS px using current camera+viewport (mirrors useFittedFrameSize)
    const cam = camera as unknown as THREE.PerspectiveCamera;
    const distance = Math.abs((cam as any).position.z || 5);
    const vH = 2 * Math.tan(((cam.fov ?? 75) * Math.PI) / 360) * distance;
    const vW = (vH * size.width) / size.height;
    const targetAspect = aspectW / aspectH;
    const contentW = targetAspect;
    const contentH = 1;
  // Use exact fit (no 0.98 padding) for export math
  const scale = Math.min(vW / contentW, vH / contentH);
    const compWorldW = contentW * scale;
    const compWorldH = contentH * scale;
    const pxPerWorldX = size.width / vW;
    const pxPerWorldY = size.height / vH;
    const compPxW = compWorldW * pxPerWorldX;
    const compPxH = compWorldH * pxPerWorldY;
    const compPxX = Math.round((size.width - compPxW) / 2);
    const compPxY = Math.round((size.height - compPxH) / 2);

    // Source intrinsic pixel rect needs to be scaled by DPR
  // Compute DPR needed so that composition crop >= target size
  const needDprW = w / Math.max(1, compPxW);
  const needDprH = h / Math.max(1, compPxH);
  const neededDpr = Math.max(needDprW, needDprH, prevPixelRatio);
  const targetDpr = Math.min(4, neededDpr);
  gl.setPixelRatio(targetDpr);
  gl.clear(true, true, true);
  gl.render(scene, camera);
  const sX = Math.max(0, Math.floor(compPxX * targetDpr));
  const sY = Math.max(0, Math.floor(compPxY * targetDpr));
  const sW = Math.max(1, Math.floor(compPxW * targetDpr));
  const sH = Math.max(1, Math.floor(compPxH * targetDpr));

  const sourceCanvas = gl.domElement;

    const copy = document.createElement('canvas');
    copy.width = w;
    copy.height = h;
    const c2d = copy.getContext('2d');
    if (!c2d) throw new Error('2D context unavailable');
    c2d.imageSmoothingEnabled = true;
    c2d.drawImage(sourceCanvas, sX, sY, sW, sH, 0, 0, w, h);

    // restore DPR
    gl.setPixelRatio(prevPixelRatio);
    return copy;
  };

  const exportVideo = useCallback(async (opts?: ExportOptions) => {
    const width = opts?.width ?? snap.exportSettings.width;
    const height = opts?.height ?? snap.exportSettings.height;
    const fps = opts?.fps ?? snap.exportSettings.fps ?? snap.composition.fps;
    const bitrate = opts?.bitrate ?? 8000;
    const quality = Math.max(0, Math.min(1, opts?.quality ?? snap.exportSettings.quality ?? 0.9));
    const format: ExportFormat = opts?.format ?? 'mp4';

    const duration = snap.totalDuration || 0;
    if (duration <= 0) throw new Error('Nothing to export');

    // Start export
    exportActions.setPhase('preparing');    // Prefer MediaBunny if present for proper encoding + audio mux
    const MB = await getMediaBunny();
    const { Output, BufferTarget, Mp4OutputFormat, WebmOutputFormat, CanvasSource, MediaStreamAudioTrackSource } = MB;
    const useMp4 = format !== 'webm';
    const output = new Output({
      format: useMp4 ? new Mp4OutputFormat() : new WebmOutputFormat(),
      target: new BufferTarget(),
    });

    // Prepare capture canvas and video source
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = width;
    captureCanvas.height = height;
    const vsrc = new CanvasSource(captureCanvas, {
      codec: useMp4 ? 'avc' : 'vp9',
      bitrate: Math.max(300, bitrate) * 1000,
      quality,
    });
    output.addVideoTrack(vsrc, { frameRate: fps });

    // Build audio mix stream and add as track if present
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ac: AudioContext | null = AC ? new AC() : null;
    const audioEls: HTMLAudioElement[] = [];
    if (ac) {
      const dest = ac.createMediaStreamDestination();
      snap.tracks.forEach(track => {
        if (track.muted) return;
        track.clips.forEach(clip => {
          const asset = snap.assets[clip.assetId] as any;
          if (!asset) return;
          if ((asset.type === 'audio' || asset.type === 'video') && !clip.muted && (clip.volume ?? 1) > 0 && (track.volume ?? 1) > 0) {
            const el = new Audio(asset.src);
            el.crossOrigin = 'anonymous';
            el.preload = 'auto';
            el.loop = false;
            try { el.currentTime = Math.max(0, clip.trimStart || 0); } catch {}
            const src = ac.createMediaElementSource(el);
            const gain = ac.createGain();
            gain.gain.value = Math.max(0, Math.min(1, (clip.volume ?? 1) * (track.volume ?? 1)));
            src.connect(gain).connect(dest);
            audioEls.push(el);
          }
        });
      });
      const aTrack = dest.stream.getAudioTracks()[0];
      if (aTrack) {
        const asrc = new MediaStreamAudioTrackSource(aTrack, { codec: useMp4 ? 'aac' : 'opus', bitrate: 128_000 });
        output.addAudioTrack(asrc);
      }
    }

    await output.start();
    exportActions.setPhase('encoding');

    // Start audio playback during export so there’s actual audio to capture
    audioEls.forEach((el) => el.play().catch(()=>{}));

    // Pump frames into CanvasSource
    const ctx2d = captureCanvas.getContext('2d');
    if (!ctx2d) throw new Error('2D context not available');
    const totalFrames = Math.ceil(duration * fps);
    for (let i = 0; i < totalFrames; i++) {
      const t = Math.min(duration - 1e-6, i / fps);
      const frame = await renderFrameToCanvas(width, height, t);
      ctx2d.clearRect(0, 0, width, height);
      ctx2d.drawImage(frame, 0, 0);
      vsrc.add(t, 1 / fps);
      if (i % Math.max(1, Math.round(fps / 5)) === 0) exportActions.setProgress(i / totalFrames);
      await new Promise(r => setTimeout(r, 0));
    }

    audioEls.forEach(el => { try { el.pause(); } catch {} });
    await output.finalize();
    exportActions.setPhase('finalizing');
    const mime = output.format.mimeType;
    const buf: ArrayBuffer | null = output.target.buffer;
    if (!buf) throw new Error('No output produced');
    const blob = new Blob([buf], { type: mime });
    const url = URL.createObjectURL(blob);
    exportActions.complete(url);
    return url;

    // No fallback path needed; Mediabunny handles both mp4 and webm
  }, [snap.totalDuration, snap.tracks, snap.assets, snap.exportSettings.width, snap.exportSettings.height, snap.exportSettings.fps]);

  return { exportVideo } as const;
}

export default useExport;
