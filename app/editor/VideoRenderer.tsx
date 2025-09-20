import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSnapshot } from 'valtio';
import * as THREE from 'three';
import type { Mesh, VideoTexture } from 'three';
import editorStore, { editorActions } from './store';
import type { Clip, Track, ActiveClip } from './types';

/**
 * Individual video clip component for R3F
 */
interface VideoClipProps {
  clip: ActiveClip;
  isActive: boolean;
}

export const VideoClip: React.FC<VideoClipProps> = ({ clip, isActive }) => {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const textureRef = useRef<VideoTexture | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  const snapshot = useSnapshot(editorStore);
  const asset = snapshot.assets[clip.assetId];

  // Get the actual video element (not the proxy)
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
      
      video.addEventListener('loadeddata', handleLoadedData, { once: true });
      video.addEventListener('error', handleError);
      video.addEventListener('canplay', handleCanPlay, { once: true });
      video.load();
      
      return () => {
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('error', handleError);
        video.removeEventListener('canplay', handleCanPlay);
        if (videoRef.current === video) {
          video.pause();
          video.src = '';
          videoRef.current = null;
        }
      };
    }
  }, [asset?.src, asset?.loadState, clip.id, snapshot.playback.playbackRate]);

  // Create video texture
  const videoTexture = useMemo(() => {
    if (!videoRef.current) return null;
    
    const texture = new THREE.VideoTexture(videoRef.current);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;
    texture.flipY = true; // Fix the mirroring issue
    textureRef.current = texture;
    
    return texture;
  }, [videoRef.current]);

  // Update video playback time and sync with timeline
  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      
      if (isActive) {
        console.log(`Clip ${clip.id} became active at time ${clip.videoTime.toFixed(2)}`);
        
        // Handle play/pause state changes for active clips
        if (snapshot.playback.isPlaying) {
          // Set position and start playing
          video.currentTime = clip.videoTime;
          video.playbackRate = snapshot.playback.playbackRate;
          
          video.play().catch(error => {
            console.warn(`Failed to play video for clip ${clip.id}:`, error);
          });
        } else {
          if (!video.paused) {
            video.pause();
          }
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

  // Handle clip activation during playback
  useEffect(() => {
    if (videoRef.current && isActive && snapshot.playback.isPlaying) {
      const video = videoRef.current;
      
      // When a clip becomes active during playback, ensure it starts properly
      console.log(`Activating clip ${clip.id} during playback at time ${clip.videoTime.toFixed(2)}`);
      video.currentTime = clip.videoTime;
      video.playbackRate = snapshot.playback.playbackRate;
      
      // Start playback immediately
      video.play().catch(error => {
        console.warn(`Failed to start playback for newly active clip ${clip.id}:`, error);
      });
    }
  }, [isActive, clip.id]);

  // Continuously sync video time with timeline (this is crucial for smooth playback)
  useEffect(() => {
    if (videoRef.current && isActive) {
      const video = videoRef.current;
      
      const syncVideoTime = () => {
        const expectedTime = clip.videoTime;
        
        if (snapshot.playback.isPlaying) {
          // During playback, check if video is properly playing
          const actualTime = video.currentTime;
          const timeDrift = Math.abs(expectedTime - actualTime);
          
          // For new clips or major drift, resync immediately
          if (timeDrift > 0.5 || video.paused) {
            console.log(`Syncing clip ${clip.id}: expected ${expectedTime.toFixed(2)}, actual ${actualTime.toFixed(2)}, paused: ${video.paused}`);
            video.currentTime = expectedTime;
            
            // Ensure video is playing
            if (video.paused) {
              video.play().catch(error => {
                console.warn(`Failed to resume playback for clip ${clip.id}:`, error);
              });
            }
          }
        } else {
          // When paused, set exact time for frame-accurate positioning
          if (Math.abs(video.currentTime - expectedTime) > 0.1) {
            video.currentTime = expectedTime;
          }
          
          // Ensure video is paused
          if (!video.paused) {
            video.pause();
          }
        }
      };
      
      // Sync immediately when clip becomes active
      syncVideoTime();
      
      // Set up periodic sync - more frequent for active clips
      const syncInterval = setInterval(syncVideoTime, snapshot.playback.isPlaying ? 200 : 100);
      
      return () => {
        clearInterval(syncInterval);
      };
    }
  }, [clip.videoTime, isActive, snapshot.playback.isPlaying, clip.id]);

  // Calculate aspect ratio for plane geometry
  const aspectRatio = asset?.aspectRatio || (16 / 9);
  const planeArgs: [number, number] = [aspectRatio, 1];

  // Update material properties
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.opacity = clip.opacity * (clip.track.visible ? 1 : 0);
      materialRef.current.transparent = clip.opacity < 1 || !clip.track.visible;
      materialRef.current.visible = clip.visible && clip.track.visible;
    }
  }, [clip.opacity, clip.visible, clip.track.visible]);

  // Cleanup texture on unmount
  useEffect(() => {
    return () => {
      if (textureRef.current) {
        textureRef.current.dispose();
      }
    };
  }, []);

  if (!asset || !videoTexture) return null;

  return (
    <mesh
      ref={meshRef}
      position={clip.position}
      rotation={clip.rotation}
      scale={clip.scale}
      visible={isActive && clip.visible && clip.track.visible}
    >
      <planeGeometry args={planeArgs} />
      <meshBasicMaterial
        ref={materialRef}
        map={videoTexture}
        transparent
        opacity={clip.opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

/**
 * Track layer component that renders all clips in a track
 */
interface TrackLayerProps {
  track: Readonly<Track>;
  currentTime: number;
}

export const TrackLayer: React.FC<TrackLayerProps> = ({ track, currentTime }) => {
  return (
    <group position={[0, 0, track.zIndex]} visible={track.visible}>
      {track.clips.map(clip => {
        // Calculate if this clip is active at current time
        const isActive = currentTime >= clip.start && currentTime < clip.end;
        
        // Calculate video time if active
        const videoTime = isActive ? clip.trimStart + (currentTime - clip.start) : 0;
        
        // Create active clip object
        const activeClip: ActiveClip = {
          ...clip,
          videoTime,
          track,
        };
        
        return (
          <VideoClip
            key={clip.id}
            clip={activeClip}
            isActive={isActive}
          />
        );
      })}
    </group>
  );
};

/**
 * Main video renderer that handles all tracks and clips
 */
export const VideoRenderer: React.FC = () => {
  const snapshot = useSnapshot(editorStore);

  return (
    <>
      {snapshot.tracks.map(track => (
        <TrackLayer
          key={track.id}
          track={track as Readonly<Track>}
          currentTime={snapshot.playback.currentTime}
        />
      ))}
    </>
  );
};

/**
 * Playback controller that handles timeline advancement
 */
export const PlaybackController: React.FC = () => {
  const snapshot = useSnapshot(editorStore);
  const lastUpdateTimeRef = useRef<number>(0);
  const wasPlayingRef = useRef<boolean>(false);
  
  useFrame((state, delta) => {
    const isCurrentlyPlaying = snapshot.playback.isPlaying;
    
    // Reset timing when starting playback
    if (isCurrentlyPlaying && !wasPlayingRef.current) {
      lastUpdateTimeRef.current = 0;
      wasPlayingRef.current = true;
      return;
    }
    
    // Clear timing when stopping playback
    if (!isCurrentlyPlaying && wasPlayingRef.current) {
      lastUpdateTimeRef.current = 0;
      wasPlayingRef.current = false;
      return;
    }
    
    if (!isCurrentlyPlaying) {
      return;
    }
    
    // Use more precise timing for smooth playback
    const currentTime = performance.now();
    
    if (lastUpdateTimeRef.current === 0) {
      lastUpdateTimeRef.current = currentTime;
      return;
    }
    
    const realDelta = (currentTime - lastUpdateTimeRef.current) / 1000; // Convert to seconds
    lastUpdateTimeRef.current = currentTime;
    
    // Apply playback rate
    const adjustedDelta = realDelta * snapshot.playback.playbackRate;
    const newTime = snapshot.playback.currentTime + adjustedDelta;
    
    // Check if we've reached the end
    if (newTime >= snapshot.totalDuration) {
      if (snapshot.playback.loop) {
        editorActions.seekTo(snapshot.playback.startTime);
      } else {
        editorActions.setPlaying(false);
        editorActions.seekTo(snapshot.totalDuration);
      }
    } else {
      editorActions.setCurrentTime(newTime);
    }
  });

  return null;
};

/**
 * Preview grid for 3D positioning
 */
interface PreviewGridProps {
  size?: number;
  divisions?: number;
  color?: string;
}

export const PreviewGrid: React.FC<PreviewGridProps> = ({
  size = 10,
  divisions = 10,
  color = '#666666'
}) => {
  const snapshot = useSnapshot(editorStore);
  
  if (!snapshot.config.gridSnap) return null;

  return (
    <gridHelper
      args={[size, divisions, color, color]}
      rotation={[Math.PI / 2, 0, 0]}
    />
  );
};

/**
 * 3D gizmo for clip positioning (optional enhancement)
 */
interface ClipGizmoProps {
  clipId: string;
  visible?: boolean;
}

export const ClipGizmo: React.FC<ClipGizmoProps> = ({ clipId, visible = true }) => {
  const snapshot = useSnapshot(editorStore);
  const isSelected = snapshot.selectedClipIds.includes(clipId);
  
  // Find the clip
  const clip = snapshot.tracks
    .flatMap(track => track.clips)
    .find(c => c.id === clipId);
  
  if (!clip || !isSelected || !visible) return null;

  return (
    <group position={clip.position}>
      {/* Simple wireframe box to show selection */}
      <mesh>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshBasicMaterial color="#ffff00" wireframe />
      </mesh>
    </group>
  );
};

/**
 * Camera controller for video editor viewport
 */
export const EditorCamera: React.FC = () => {
  const snapshot = useSnapshot(editorStore);
  
  // Auto-frame content or use default camera position
  const cameraPosition: [number, number, number] = [0, 0, 5];
  
  useFrame((state) => {
    // Optional: Auto-focus on selected clips
    if (snapshot.selectedClipIds.length > 0) {
      // Could implement auto-framing logic here
    }
  });

  return null; // Camera is handled by Canvas component
};

/**
 * Composite video renderer with all necessary components
 */
export const VideoEditorRenderer: React.FC = () => {
  return (
    <>
      <PlaybackController />
      <VideoRenderer />
      <PreviewGrid />
      
      {/* Render gizmos for selected clips */}
      <group>
        {editorStore.selectedClipIds.map(clipId => (
          <ClipGizmo key={clipId} clipId={clipId} />
        ))}
      </group>
      
      {/* Basic lighting for 3D objects */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
    </>
  );
};