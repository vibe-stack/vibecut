// @ts-nocheck
import { useEffect, useMemo, useRef } from 'react';
import { useSnapshot } from 'valtio';
import editorStore from '../../shared/store';
import type { ActiveClip } from '../../shared/types';

/**
 * Hook to play audio for an active audio clip without visual rendering.
 * - Syncs to timeline currentTime
 * - Applies per-clip audioEffects: fadeInSec, fadeOutSec, speed
 * - Respects clip volume, mute, track mute/volume, and global playback rate
 * - iOS Safari compatible: uses Web Audio API for volume control
 */
export const useAudioPlayback = (clip: ActiveClip, isActive: boolean) => {
  const snap = useSnapshot(editorStore);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const lastSeekTimeRef = useRef<number>(-1);
  const isSyncingRef = useRef<boolean>(false);
  const lastVolumeRef = useRef<number>(-1);
  const asset = snap.assets[clip.assetId] as any;

  // Create/attach audio element per clip instance with Web Audio API for iOS Safari compatibility
  useEffect(() => {
    if (!asset || asset.type !== 'audio' || asset.loadState !== 'loaded') return;
    
    const a = new Audio();
    a.crossOrigin = 'anonymous';
    a.preload = 'auto';
    a.src = asset.src;
    a.loop = false;
    a.muted = false;
    
    // iOS Safari specific attributes
    a.setAttribute('playsinline', '');
    a.setAttribute('webkit-playsinline', '');
    
    audioRef.current = a;

    // Set up Web Audio API for volume control (iOS Safari compatible)
    const setupWebAudio = () => {
      try {
        // Use global audio context if available, or create a new one
        let ctx = (window as any).__editorAudioContext;
        if (!ctx) {
          ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          (window as any).__editorAudioContext = ctx;
        }
        
        audioContextRef.current = ctx;
        
        if (ctx.state === 'suspended') {
          // Try to resume context - iOS Safari requires user interaction
          ctx.resume().catch(() => {});
        }
        
        if (!sourceNodeRef.current && !gainNodeRef.current) {
          const source = ctx.createMediaElementSource(a);
          const gainNode = ctx.createGain();
          
          source.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          sourceNodeRef.current = source;
          gainNodeRef.current = gainNode;
        }
      } catch (error) {
        console.warn('Web Audio API not available, falling back to basic audio control:', error);
      }
    };

    // Set up Web Audio on first user interaction if needed
    const handleFirstPlay = () => {
      setupWebAudio();
    };

    a.addEventListener('play', handleFirstPlay, { once: true });

    const cleanup = () => {
      a.removeEventListener('play', handleFirstPlay);
      if (!a.paused) { 
        try { a.pause(); } catch {} 
      }
      
      // Clean up Web Audio nodes
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
        } catch {}
        sourceNodeRef.current = null;
      }
      if (gainNodeRef.current) {
        gainNodeRef.current = null;
      }
      
      a.src = '';
      a.load();
    };
    return cleanup;
  }, [asset?.id, asset?.src, asset?.loadState]);

  // Helper to apply volume using Web Audio API (iOS Safari compatible) with smoothing
  const setAudioVolume = (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    // Skip if volume hasn't changed significantly
    if (Math.abs(lastVolumeRef.current - clampedVolume) < 0.005) {
      return;
    }
    lastVolumeRef.current = clampedVolume;
    
    if (gainNodeRef.current && audioContextRef.current) {
      // Use Web Audio API for volume control with smooth transitions
      try {
        const now = audioContextRef.current.currentTime;
        gainNodeRef.current.gain.setTargetAtTime(clampedVolume, now, 0.01); // 10ms smooth transition
      } catch (error) {
        console.warn('Failed to set gain value:', error);
      }
    } else {
      // Fallback to element volume (doesn't work on iOS Safari but works elsewhere)
      if (audioRef.current) {
        audioRef.current.volume = clampedVolume;
      }
    }
  };
  // Compute base gain from clip/track mute+volume
  const baseGain = useMemo(() => {
    const track = clip.track;
    const clipMuted = clip.muted;
    const trackMuted = track.muted;
    if (clipMuted || trackMuted) return 0;
    return Math.max(0, Math.min(1, (clip.volume ?? 1) * (track.volume ?? 1)));
  }, [clip.muted, clip.volume, clip.track.muted, clip.track.volume]);

  // Helper to compute fade multiplier at a given local time within the clip
  const fadeMultiplierAt = (tLocal: number): number => {
    const eff = clip.audioEffects || { fadeInSec: 0, fadeOutSec: 0, speed: 1 };
    const dur = Math.max(0, clip.duration);
    if (dur <= 0) return 0;
    const fi = Math.max(0, eff.fadeInSec || 0);
    const fo = Math.max(0, eff.fadeOutSec || 0);
    let m = 1;
    if (fi > 0 && tLocal < fi) {
      m *= (tLocal / fi);
    }
    if (fo > 0 && tLocal > dur - fo) {
      const tOut = Math.max(0, dur - tLocal);
      m *= (tOut / fo);
    }
    return Math.max(0, Math.min(1, m));
  };

  // Active playback syncing - let audio play naturally during playback
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const eff = clip.audioEffects || { fadeInSec: 0, fadeOutSec: 0, speed: 1 };
    // Effective playback rate is product of global rate and per-clip speed
    const rate = Math.max(0.1, Math.min(4, (snap.playback.playbackRate || 1) * (eff.speed || 1)));
    
    // Set playback rate only if changed significantly
    if (Math.abs(a.playbackRate - rate) > 0.05) {
      a.playbackRate = rate;
    }

    // Volume sync function - only updates volume
    const syncVolume = () => {
      if (isSyncingRef.current) return;

      // Calculate volume with fades
      const localTime = Math.max(0, snap.playback.currentTime - clip.start);
      const fadeMul = fadeMultiplierAt(localTime);
      const finalVolume = baseGain * fadeMul;
      
      // setAudioVolume handles its own change detection
      setAudioVolume(finalVolume);
    };

    let volumeInterval: NodeJS.Timeout | null = null;

    // Start/stop depending on active + playing
    if (isActive && snap.playback.isPlaying) {
      // Start playing with robust seek-before-play — especially for iOS Safari
      const attemptPlay = async () => {
        try {
          const expectedTime = clip.trimStart + (snap.playback.currentTime - clip.start);
          const clamp = (t: number) => Math.max(0, Math.min(t, asset?.duration || 0));

          // Ensure metadata is ready for seeks
          const ensureReady = async () => {
            const aEl = a as HTMLAudioElement;
            if (aEl.readyState >= 1) return; // HAVE_METADATA
            await new Promise<void>((resolve) => {
              const onLM = () => { aEl.removeEventListener('loadedmetadata', onLM); resolve(); };
              const onCP = () => { aEl.removeEventListener('canplay', onCP); resolve(); };
              aEl.addEventListener('loadedmetadata', onLM, { once: true });
              aEl.addEventListener('canplay', onCP, { once: true });
              // Fallback timeout
              setTimeout(() => { aEl.removeEventListener('loadedmetadata', onLM); aEl.removeEventListener('canplay', onCP); resolve(); }, 150);
            });
          };

          // Seek helper that waits briefly for iOS
          const seekTo = async (t: number) => {
            const aEl = a as HTMLAudioElement;
            try { aEl.currentTime = clamp(t); } catch {}
            await new Promise<void>((resolve) => {
              let done = false;
              const cleanup = () => { if (done) return; done = true; aEl.removeEventListener('seeked', onSeeked); aEl.removeEventListener('timeupdate', onTimeUpdate); resolve(); };
              const onSeeked = () => cleanup();
              const onTimeUpdate = () => cleanup();
              aEl.addEventListener('seeked', onSeeked, { once: true });
              aEl.addEventListener('timeupdate', onTimeUpdate, { once: true });
              setTimeout(cleanup, 120); // small grace period
            });
          };

          // 1) Ensure metadata
          await ensureReady();
          // 2) Pause to be safe before seeking
          try { a.pause(); } catch {}
          // 3) Seek to expected position
          if (Number.isFinite(expectedTime)) {
            await seekTo(expectedTime);
          }
          // 4) Play
          await a.play();

          // 5) Verify shortly after start; if wrong, do a single corrective cycle
          setTimeout(async () => {
            if (!isActive || !snap.playback.isPlaying || a.paused) return;
            const nowExpected = clip.trimStart + (snap.playback.currentTime - clip.start);
            if (!Number.isFinite(nowExpected)) return;
            const drift = Math.abs((a.currentTime || 0) - clamp(nowExpected));
            if (drift > 0.35) {
              try { a.pause(); } catch {}
              await seekTo(nowExpected);
              try { await a.play(); } catch {}
            }
          }, 60);

          // Volume updates only
          syncVolume();
          volumeInterval = setInterval(syncVolume, 100);
        } catch (error) {
          // Retry once after a short delay for iOS Safari
          setTimeout(() => {
            if (isActive && snap.playback.isPlaying) {
              a.play().catch(() => {});
            }
          }, 120);
        }
      };

      attemptPlay();
      
    } else {
      // When paused or inactive, sync volume and pause
      syncVolume();
      
      if (!a.paused) {
        try { 
          a.pause();
        } catch (error) {
          console.warn('Failed to pause audio:', error);
        }
      }
    }

    return () => {
      if (volumeInterval) {
        clearInterval(volumeInterval);
      }
    };
  }, [isActive, snap.playback.isPlaying, snap.playback.playbackRate, baseGain, clip.audioEffects?.fadeInSec, clip.audioEffects?.fadeOutSec, clip.audioEffects?.speed]); // Minimal dependencies

  // Separate effect for position changes when paused (seeking) - only when timeline changes
  useEffect(() => {
    const a = audioRef.current;
    if (!a || snap.playback.isPlaying || !isActive) return;

    // Only update position when paused and timeline position changes
    const timelineTime = clip.trimStart + (snap.playback.currentTime - clip.start);
    if (Number.isFinite(timelineTime) && timelineTime >= 0) {
      const drift = Math.abs((a.currentTime || 0) - timelineTime);
      if (drift > 0.1) {
        try {
          a.currentTime = Math.max(0, Math.min(timelineTime, asset?.duration || 0));
        } catch (error) {
          console.warn('Failed to seek audio while paused:', error);
        }
      }
    }
  }, [snap.playback.currentTime, isActive, snap.playback.isPlaying, clip.trimStart, clip.start, asset?.duration]);

  return { audioRef };
};

export default useAudioPlayback;