import { useRef, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import editorStore, { editorActions } from '../../shared/store';
import type { ActiveClip } from '../../shared/types';

export const useVideoPlayback = (clip: ActiveClip, isActive: boolean) => {
  const snapshot = useSnapshot(editorStore);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const textureRef = useRef<THREE.VideoTexture | null>(null);

  const asset = snapshot.assets[clip.assetId] as any;

  // Set up video texture when video loads
  useEffect(() => {
  if (asset && asset.type === 'video' && asset.loadState === 'loaded') {
      // Create a unique video element for this clip to avoid conflicts
      const video = document.createElement('video');
      // Attributes must be set before src for Safari/iOS
  video.crossOrigin = 'anonymous';
  video.setAttribute('crossorigin', 'anonymous');
      video.preload = 'metadata';
  video.muted = true; // Keep muted for 3D preview
  video.setAttribute('muted', '');
      // Autoplay + playsinline are required for iOS/Safari to start rendering frames without fullscreen
  video.autoplay = true;
  video.setAttribute('autoplay', '');
      // Both property and attribute for widest Safari support
      (video as any).playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.loop = false;
  video.src = asset.src;
      
      // Set up the video for playback
      const handleLoadedData = () => {
        // Set initial playback rate
        video.playbackRate = snapshot.playback.playbackRate;
        videoRef.current = video;
        // Try to grab an initial frame to populate the texture on Safari
        if (!snapshot.playback.isPlaying) {
          try {
            video.currentTime = clip.videoTime;
          } catch (e) {
            // ignore seek errors until canplay
          }
        }
      };
      
      const handleError = (e: Event) => {
      };
      
      const handleCanPlay = () => {
      };
      
      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('error', handleError);
      video.addEventListener('canplay', handleCanPlay);
      
      // Create texture after video is set up
      const createTextureIfNeeded = () => {
        if (!textureRef.current && videoRef.current) {
          const texture = new THREE.VideoTexture(videoRef.current);
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          // Safari is happier with RGB for video textures
          texture.format = THREE.RGBFormat;
          textureRef.current = texture;
        }
      };

      video.addEventListener('loadeddata', createTextureIfNeeded, { once: true });

      // Ensure the texture updates when the video produces frames
      let rafcHandle: number | null = null;
      const scheduleRVFC = () => {
        const v = videoRef.current;
        if (!v) return;
        const rvfc = (v as any).requestVideoFrameCallback as undefined | ((cb: (now: number, metadata: any) => void) => number);
        if (typeof rvfc === 'function') {
          rafcHandle = rvfc(() => {
            if (textureRef.current) textureRef.current.needsUpdate = true;
            // chain next callback while active
            scheduleRVFC();
          });
        }
      };

      // Fallbacks for browsers without RVFC or when paused/seeking
      const markNeedsUpdate = () => {
        if (textureRef.current) textureRef.current.needsUpdate = true;
      };

      const handleSeeked = markNeedsUpdate;
      const handleTimeUpdate = markNeedsUpdate;
      const handleCanPlayThrough = () => {
        // Start RVFC-based updates
        scheduleRVFC();
        // Kick a play to force first frame on Safari; it can remain paused after
        video.play().then(() => {
          if (!snapshot.playback.isPlaying) {
            // Pause immediately if timeline isn't playing
            video.pause();
            markNeedsUpdate();
          }
        }).catch(() => {
          // Autoplay might be blocked; rely on seeks/timeupdate
          markNeedsUpdate();
        });
      };

      video.addEventListener('seeked', handleSeeked);
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('canplaythrough', handleCanPlayThrough, { once: true });
      
      return () => {
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('error', handleError);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('seeked', handleSeeked);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('canplaythrough', handleCanPlayThrough as any);
        // cancel RVFC if used
        if (rafcHandle && (video as any).cancelVideoFrameCallback) {
          try { (video as any).cancelVideoFrameCallback(rafcHandle); } catch {}
        }
        
        // Clean up video element
        if (!video.paused) {
          video.pause();
        }
        video.src = '';
        video.load();
      };
    }
  }, [asset, clip.id, snapshot.playback.playbackRate]);

  // Control video playback based on timeline state
  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      
      if (isActive && snapshot.playback.isPlaying) {
        // Start playback if not already playing
        if (video.paused) {
          video.currentTime = clip.videoTime;
          video.play().catch(error => {
            console.warn(`Failed to play video for clip ${clip.id}:`, error);
          });
        } else {
          // Set exact time when paused
          video.currentTime = clip.videoTime;
        }
      } else {
        // Clip is inactive - pause the video but keep element alive
        if (!video.paused) {
          video.pause();
        }
      }
    }
  }, [isActive, snapshot.playback.isPlaying, clip.id]);

  // Update video playback rate when it changes
  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      const newRate = snapshot.playback.playbackRate;
      
      if (Math.abs(video.playbackRate - newRate) > 0.01) {
        video.playbackRate = newRate;
      }
    }
  }, [snapshot.playback.playbackRate, clip.id]);

  // Force update when timeline position changes (for manual seeking)
  useEffect(() => {
    if (videoRef.current && isActive && !snapshot.playback.isPlaying) {
      // Only force update when paused (for manual seeking)
      const video = videoRef.current;
      video.currentTime = clip.videoTime;
    }
  }, [clip.videoTime, isActive, snapshot.playback.isPlaying]);

  // Continuously sync video time with timeline (only for active clips)
  useEffect(() => {
    if (videoRef.current && isActive) {
      const video = videoRef.current;
      
      const syncVideoTime = () => {
        const expectedTime = clip.videoTime;
        
        if (snapshot.playback.isPlaying) {
          // During playback, ensure video is playing and in sync
          const actualTime = video.currentTime;
          const timeDrift = Math.abs(expectedTime - actualTime);
          
          // Check if video needs resyncing
          if (timeDrift > 0.3) {
            video.currentTime = expectedTime;
            if (textureRef.current) textureRef.current.needsUpdate = true;
          }
          
          // Ensure video is playing
          if (video.paused) {
            video.play().catch(console.warn);
          }
        } else {
          // When paused, set exact time for frame-accurate positioning
          video.currentTime = expectedTime;
          if (textureRef.current) textureRef.current.needsUpdate = true;
          
          // Ensure video is paused
          if (!video.paused) {
            video.pause();
          }
        }
      };
      
      // Set up periodic sync for active clips
      const syncInterval = setInterval(syncVideoTime, 100);
      
      return () => {
        clearInterval(syncInterval);
      };
    }
  }, [isActive, snapshot.playback.isPlaying, clip.videoTime, clip.id]);

  // Ensure texture refresh every frame as a last-resort fallback (helps Safari when paused)
  useFrame(() => {
    if (textureRef.current && videoRef.current) {
      // Mark update when enough data is available
      if (videoRef.current.readyState >= 2) {
        textureRef.current.needsUpdate = true;
      }
    }
  });

  // Cleanup texture on unmount
  useEffect(() => {
    return () => {
      if (textureRef.current) {
        textureRef.current.dispose();
      }
    };
  }, []);

  return {
    videoRef,
    materialRef,
    textureRef,
    asset
  };
};