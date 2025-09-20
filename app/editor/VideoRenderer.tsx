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
      // Use the asset's video element directly, but clone it for independent playback control
      const originalVideo = asset.video as any; // Cast to avoid proxy issues
      
      // Create a new video element with the same source for independent control
      const video = document.createElement('video');
      video.src = asset.src;
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      video.muted = true; // Keep muted for 3D preview
      video.loop = false;
      
      // Set up the video for playback
      const handleLoadedData = () => {
        console.log(`Video loaded for clip ${clip.id}:`, video.duration, 'seconds');
        videoRef.current = video;
      };
      
      const handleError = (e: Event) => {
        console.error(`Video error for clip ${clip.id}:`, e);
      };
      
      video.addEventListener('loadeddata', handleLoadedData, { once: true });
      video.addEventListener('error', handleError);
      video.load();
      
      return () => {
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('error', handleError);
        if (videoRef.current === video) {
          video.pause();
          video.src = '';
          videoRef.current = null;
        }
      };
    }
  }, [asset?.src, asset?.loadState]);

  // Create video texture
  const videoTexture = useMemo(() => {
    if (!videoRef.current) return null;
    
    const texture = new THREE.VideoTexture(videoRef.current);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;
    texture.flipY = false;
    textureRef.current = texture;
    
    return texture;
  }, [videoRef.current]);

  // Update video playback time and sync with timeline
  useEffect(() => {
    if (videoRef.current && isActive) {
      const video = videoRef.current;
      
      // Set initial time
      video.currentTime = clip.videoTime;
      
      // Handle play/pause state
      if (snapshot.playback.isPlaying) {
        video.play().catch(console.warn);
      } else {
        video.pause();
      }
    } else if (videoRef.current && !isActive) {
      videoRef.current.pause();
    }
  }, [isActive, snapshot.playback.isPlaying]);

  // Continuously sync video time with timeline (this is crucial for smooth playback)
  useEffect(() => {
    if (videoRef.current && isActive) {
      const video = videoRef.current;
      
      const syncVideoTime = () => {
        if (snapshot.playback.isPlaying) {
          const expectedTime = clip.videoTime;
          const actualTime = video.currentTime;
          const timeDrift = Math.abs(expectedTime - actualTime);
          
          // If drift is too large (>0.2 seconds), resync
          if (timeDrift > 0.2) {
            video.currentTime = expectedTime;
          }
          
          // Ensure video is playing if timeline is playing
          if (video.paused && snapshot.playback.isPlaying) {
            video.play().catch(console.warn);
          }
        } else {
          // Pause video if timeline is paused
          if (!video.paused) {
            video.pause();
          }
          // Set exact time when paused for frame-accurate positioning
          video.currentTime = clip.videoTime;
        }
      };
      
      // Sync immediately
      syncVideoTime();
      
      // Set up a timer to periodically check sync (every 100ms)
      const syncInterval = setInterval(syncVideoTime, 100);
      
      return () => {
        clearInterval(syncInterval);
      };
    }
  }, [clip.videoTime, isActive, snapshot.playback.isPlaying]);

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
      visible={clip.visible && clip.track.visible}
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
  activeClips: ActiveClip[];
}

export const TrackLayer: React.FC<TrackLayerProps> = ({ track, activeClips }) => {
  const trackClips = activeClips.filter(clip => clip.track.id === track.id);

  return (
    <group position={[0, 0, track.zIndex]} visible={track.visible}>
      {trackClips.map(clip => (
        <VideoClip
          key={clip.id}
          clip={clip}
          isActive={true}
        />
      ))}
    </group>
  );
};

/**
 * Main video renderer that handles all tracks and clips
 */
export const VideoRenderer: React.FC = () => {
  const snapshot = useSnapshot(editorStore);
  
  // Get active clips at current time
  const activeClips = useMemo(() => {
    return editorActions.getActiveClips();
  }, [snapshot.playback.currentTime, snapshot.tracks]);

  return (
    <>
      {snapshot.tracks.map(track => (
        <TrackLayer
          key={track.id}
          track={track as Readonly<Track>}
          activeClips={activeClips}
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
  
  useFrame((state, delta) => {
    if (!snapshot.playback.isPlaying) {
      lastUpdateTimeRef.current = 0;
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