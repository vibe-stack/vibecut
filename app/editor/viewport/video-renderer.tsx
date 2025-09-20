import React, { useRef } from 'react';
import { useSnapshot } from 'valtio';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import editorStore, { editorActions } from '../shared/store';
import type { Track, ActiveClip } from '../shared/types';
import { VideoClip } from './video-clip';
import { ImageClip, TextClip } from './index';

/**
 * Track layer component that renders all clips in a track
 */
interface TrackLayerProps {
  track: Readonly<Track>;
  currentTime: number;
}

export const TrackLayer: React.FC<TrackLayerProps> = ({ track, currentTime }) => {
  const snap = useSnapshot(editorStore);
  return (
    <group position={[0, 0, 0]} renderOrder={track.zIndex} visible={track.visible}>
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
        
        const t = snap.assets[clip.assetId]?.type;
        if (t === 'image') {
          return <ImageClip key={clip.id} clip={activeClip} isActive={isActive} />;
        }
        if (t === 'text') {
          return <TextClip key={clip.id} clip={activeClip} isActive={isActive} />;
        }
        return <VideoClip key={clip.id} clip={activeClip} isActive={isActive} />;
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
 * Composite video renderer with all necessary components
 */
export const VideoEditorRenderer: React.FC = () => {
  const snapshot = useSnapshot(editorStore);

  return (
    <>
      <PlaybackController />
      <VideoRenderer />
      <PreviewGrid />
      
      {/* Render gizmos for selected clips */}
      <group>
        {snapshot.selectedClipIds.map(clipId => (
          <ClipGizmo key={clipId} clipId={clipId} />
        ))}
      </group>
      
      {/* Basic lighting for 3D objects */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
    </>
  );
};