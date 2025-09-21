/*
  Export hook: renders the R3F scene offscreen at target resolution and encodes video.
  - Uses export-context to access gl, scene, camera
  - Computes composition cutout from fitted frame size
  - Uses MediaBunny for encoding with proper audio mixing
*/
import { useCallback } from 'react';
import * as THREE from 'three';
import { getRendererContext } from './export-context';
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
    
    // First render the scene at normal resolution
    gl.clear(true, true, true);
    gl.render(scene, camera);
    
    // Calculate the composition bounds in the current viewport
    const cam = camera as unknown as THREE.PerspectiveCamera;
    const distance = Math.abs((cam as any).position.z || 5);
    const vH = 2 * Math.tan(((cam.fov ?? 75) * Math.PI) / 360) * distance;
    const vW = (vH * size.width) / size.height;
    
    // Composition dimensions in world space
    const targetAspect = aspectW / aspectH;
    const contentW = targetAspect;
    const contentH = 1;
  // Use exact fit (no extra padding) so the exported crop matches the on-canvas composition
  const scale = Math.min(vW / contentW, vH / contentH);
    const compWorldW = contentW * scale;
    const compWorldH = contentH * scale;
    
    // Convert to viewport pixel coordinates
    const pxPerWorldX = size.width / vW;
    const pxPerWorldY = size.height / vH;
    const compPxW = compWorldW * pxPerWorldX;
    const compPxH = compWorldH * pxPerWorldY;
    const compPxX = (size.width - compPxW) / 2;
    const compPxY = (size.height - compPxH) / 2;

    // Calculate DPR needed for high quality export
    const neededDprW = w / compPxW;
    const neededDprH = h / compPxH;
    const targetDpr = Math.min(4, Math.max(2, Math.max(neededDprW, neededDprH)));
    
    // Re-render at higher DPR if needed
    if (targetDpr !== prevPixelRatio) {
      gl.setPixelRatio(targetDpr);
      gl.clear(true, true, true);
      gl.render(scene, camera);
    }
    
    // Calculate source crop coordinates scaled by DPR
    const sX = Math.floor(compPxX * targetDpr);
    const sY = Math.floor(compPxY * targetDpr);
    const sW = Math.floor(compPxW * targetDpr);
    const sH = Math.floor(compPxH * targetDpr);

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
    exportActions.setPhase('preparing');

    // Build Mediabunny pipeline
    const MB = await getMediaBunny();
    const { Output, BufferTarget, Mp4OutputFormat, WebmOutputFormat, CanvasSource, AudioBufferSource } = MB;
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

    // Create audio source for mixed audio
    const audioSource = new AudioBufferSource({
      codec: useMp4 ? 'aac' : 'opus',
      bitrate: 128_000,
    });
    output.addAudioTrack(audioSource);

    // Build mixed audio buffers that we'll add to the audio source at precise timing
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ac: AudioContext | null = AC ? new AC() : null;
    const audioClips: Array<{
      audioBuffer: AudioBuffer;
      startTime: number;
      endTime: number;
      volume: number;
    }> = [];

    // Pre-load and decode all audio clips
    if (ac) {
      for (const track of snap.tracks) {
        if (track.muted) continue;
        for (const clip of track.clips) {
          const asset = snap.assets[clip.assetId] as any;
          if (!asset) continue;
          if ((asset.type === 'audio' || asset.type === 'video') && !clip.muted && (clip.volume ?? 1) > 0 && (track.volume ?? 1) > 0) {
            try {
              const response = await fetch(asset.src);
              const arrayBuffer = await response.arrayBuffer();
              const audioBuffer = await ac.decodeAudioData(arrayBuffer);
              
              audioClips.push({
                audioBuffer,
                startTime: clip.start,
                endTime: clip.end,
                volume: (clip.volume ?? 1) * (track.volume ?? 1),
              });
            } catch (error) {
              console.warn('Failed to load audio clip:', asset.src, error);
            }
          }
        }
      }
    }

    await output.start();
    exportActions.setPhase('encoding');

    // Create mixed audio buffer and add to audio source
    if (ac && audioClips.length > 0) {
      // Create a buffer for the entire duration
      const sampleRate = 48000;
      const numChannels = 2;
      const bufferLength = Math.ceil(duration * sampleRate);
      const mixedBuffer = ac.createBuffer(numChannels, bufferLength, sampleRate);
      
      // Mix all audio clips into the buffer
      for (const clip of audioClips) {
        const startSample = Math.floor(clip.startTime * sampleRate);
        const endSample = Math.floor(clip.endTime * sampleRate);
        const clipLength = Math.min(endSample - startSample, clip.audioBuffer.length);
        
        for (let channel = 0; channel < numChannels; channel++) {
          const sourceChannel = Math.min(channel, clip.audioBuffer.numberOfChannels - 1);
          const sourceData = clip.audioBuffer.getChannelData(sourceChannel);
          const mixedData = mixedBuffer.getChannelData(channel);
          
          for (let i = 0; i < clipLength; i++) {
            const destIndex = startSample + i;
            if (destIndex < bufferLength) {
              mixedData[destIndex] += sourceData[i] * clip.volume;
            }
          }
        }
      }
      
      // Add the mixed buffer to the audio source
      await audioSource.add(mixedBuffer);
    }

    // Pump frames into CanvasSource
    const ctx2d = captureCanvas.getContext('2d');
    if (!ctx2d) throw new Error('2D context not available');
    const totalFrames = Math.ceil(duration * fps);
    for (let i = 0; i < totalFrames; i++) {
      const t = Math.min(duration - 1e-6, i / fps);
      const frame = await renderFrameToCanvas(width, height, t);
      ctx2d.clearRect(0, 0, width, height);
      ctx2d.drawImage(frame, 0, 0);
      await vsrc.add(t, 1 / fps);
      if (i % Math.max(1, Math.round(fps / 5)) === 0) exportActions.setProgress(i / totalFrames);
      await new Promise(r => setTimeout(r, 0));
    }

    // Close audio source
    if (audioClips.length > 0) {
      audioSource.close();
    }
    
    await output.finalize();
    exportActions.setPhase('finalizing');
    const mime = output.format.mimeType;
    const buf: ArrayBuffer | null = output.target.buffer;
    if (!buf) throw new Error('No output produced');
    const blob = new Blob([buf], { type: mime });
    const url = URL.createObjectURL(blob);
    exportActions.complete(url);
    return url;
  }, [snap.totalDuration, snap.tracks, snap.assets, snap.exportSettings.width, snap.exportSettings.height, snap.exportSettings.fps, aspectW, aspectH]);

  return { exportVideo } as const;
}

export default useExport;