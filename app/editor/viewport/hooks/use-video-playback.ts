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

  const asset = snapshot.assets[clip.assetId];

  // Set up video texture when video loads
  useEffect(() => {
    if (asset?.video && asset.loadState === 'loaded') {
      // Create a unique video element for this clip to avoid conflicts
      const video = document.createElement('video');
      video.src = asset.src;
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      video.muted = true; // Keep muted for 3D preview
      video.loop = false;
      
      // Set up the video for playback
      const handleLoadedData = () => {
        console.log(`Video loaded for clip ${clip.id}:`, video.duration, 'seconds');
        // Set initial playback rate
        video.playbackRate = snapshot.playback.playbackRate;
        videoRef.current = video;
      };
      
      const handleError = (e: Event) => {
        console.error(`Video error for clip ${clip.id}:`, e);
      };
      
      const handleCanPlay = () => {
        console.log(`Video can play for clip ${clip.id}`);
      };
      
      video.addEventListener('loadeddata', handleLoadedData);
      video.addEventListener('error', handleError);
      video.addEventListener('canplay', handleCanPlay);
      
      // Create texture after video is set up
      video.addEventListener('loadeddata', () => {
        if (!textureRef.current && videoRef.current) {
          console.log(`Creating texture for clip ${clip.id}`);
          const texture = new THREE.VideoTexture(videoRef.current);
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.format = THREE.RGBAFormat;
          textureRef.current = texture;
        }
      }, { once: true });
      
      return () => {
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('error', handleError);
        video.removeEventListener('canplay', handleCanPlay);
        
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
          console.log(`Starting playback for clip ${clip.id} at time ${clip.videoTime.toFixed(2)}`);
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
          console.log(`Clip ${clip.id} became inactive - pausing`);
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
        console.log(`Updating playback rate for clip ${clip.id}: ${video.playbackRate} -> ${newRate}`);
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
            console.log(`Resyncing clip ${clip.id}: expected ${expectedTime.toFixed(2)}, actual ${actualTime.toFixed(2)}`);
            video.currentTime = expectedTime;
          }
          
          // Ensure video is playing
          if (video.paused) {
            console.log(`Resuming playback for clip ${clip.id}`);
            video.play().catch(console.warn);
          }
        } else {
          // When paused, set exact time for frame-accurate positioning
          video.currentTime = expectedTime;
          
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