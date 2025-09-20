import React, { useCallback, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { useSnapshot } from 'valtio';

// Import our custom components
import editorStore, { editorActions } from './store';
import { VideoEditorRenderer } from './VideoRenderer';
import { TimelineControls } from './TimelineControls';
import { Timeline } from './Timeline';
import { AssetLibrary, TrackManager, ClipProperties } from './ClipManager';
import { loadVideoAsset } from './assets';
import * as THREE from 'three';

/**
 * Main video editor viewport with 3D canvas
 */
const VideoViewport: React.FC = () => {
  const snapshot = useSnapshot(editorStore);

  return (
    <div className="flex-1 bg-black relative">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ 
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true 
        }}
      >
        {/* 3D Environment */}
        <Environment preset="studio" />
        
        {/* Camera controls */}
        <OrbitControls 
          enableDamping 
          dampingFactor={0.1}
          rotateSpeed={0.5}
          panSpeed={0.5}
          zoomSpeed={1}
          maxDistance={20}
          minDistance={1}
        />
        
        {/* Grid helper for 3D positioning */}
        {snapshot.config.gridSnap && (
          <Grid 
            args={[20, 20]} 
            cellSize={snapshot.config.gridSize} 
            cellThickness={0.5} 
            cellColor="#666" 
            sectionSize={5} 
            sectionThickness={1} 
            sectionColor="#888"
            fadeDistance={20}
            fadeStrength={1}
          />
        )}
        
        {/* Main video renderer */}
        <VideoEditorRenderer />
      </Canvas>
      
      {/* Overlay UI */}
      <div className="absolute top-4 left-4 text-white bg-black bg-opacity-50 px-3 py-2 rounded">
        <div className="text-sm">
          Time: {snapshot.playback.currentTime.toFixed(2)}s / {snapshot.totalDuration.toFixed(2)}s
        </div>
        <div className="text-xs text-gray-300">
          Tracks: {snapshot.tracks.length} | Active Clips: {editorActions.getActiveClips().length}
        </div>
      </div>
      
      {/* Export/Settings Button */}
      <div className="absolute top-4 right-4">
        <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors">
          Export Video
        </button>
      </div>
    </div>
  );
};

/**
 * Main video editor interface
 */
export const VideoEditor: React.FC = () => {
  const snapshot = useSnapshot(editorStore);

  // Initialize with a default track if none exist
  useEffect(() => {
    if (snapshot.tracks.length === 0) {
      editorActions.addTrack({ name: 'Video Track 1' });
    }
  }, [snapshot.tracks.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          editorActions.togglePlayback();
          break;
          
        case 'Home':
          e.preventDefault();
          editorActions.seekTo(0);
          break;
          
        case 'End':
          e.preventDefault();
          editorActions.seekTo(snapshot.totalDuration);
          break;
          
        case 'ArrowLeft':
          if (e.shiftKey) {
            // Frame step backward
            const frameTime = 1 / snapshot.config.editorFps;
            editorActions.seekTo(Math.max(0, snapshot.playback.currentTime - frameTime));
          } else {
            // Larger step backward
            editorActions.seekTo(Math.max(0, snapshot.playback.currentTime - 1));
          }
          break;
          
        case 'ArrowRight':
          if (e.shiftKey) {
            // Frame step forward
            const frameTime = 1 / snapshot.config.editorFps;
            editorActions.seekTo(Math.min(snapshot.totalDuration, snapshot.playback.currentTime + frameTime));
          } else {
            // Larger step forward
            editorActions.seekTo(Math.min(snapshot.totalDuration, snapshot.playback.currentTime + 1));
          }
          break;
          
        case 'Delete':
        case 'Backspace':
          if (snapshot.selectedClipIds.length > 0) {
            if (confirm(`Delete ${snapshot.selectedClipIds.length} selected clip(s)?`)) {
              snapshot.selectedClipIds.forEach(clipId => {
                editorActions.removeClip(clipId);
              });
              editorActions.clearSelection();
            }
          }
          break;
          
        case 'KeyA':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            // Select all clips
            const allClipIds = snapshot.tracks.flatMap(track => track.clips.map(clip => clip.id));
            editorActions.selectClips(allClipIds);
          }
          break;
          
        case 'Escape':
          editorActions.clearSelection();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [snapshot.playback.currentTime, snapshot.totalDuration, snapshot.config.editorFps, snapshot.selectedClipIds, snapshot.tracks]);

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-600 px-4 py-2 flex justify-between items-center">
        <h1 className="text-xl font-bold">VibeCut Video Editor</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{snapshot.projectName}</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">
              File
            </button>
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">
              Edit
            </button>
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">
              View
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Assets */}
        <AssetLibrary />
        
        {/* Track Manager */}
        <TrackManager />
        
        {/* Center - Video Viewport */}
        <div className="flex-1 flex flex-col">
          <VideoViewport />
          
          {/* Timeline Controls */}
          <TimelineControls />
          
          {/* Timeline */}
          <Timeline />
        </div>
        
        {/* Right Sidebar - Properties */}
        <ClipProperties />
      </div>

      {/* Status Bar */}
      <div className="bg-gray-800 border-t border-gray-600 px-4 py-2 text-sm text-gray-400 flex justify-between">
        <div className="flex gap-4">
          <span>Zoom: {Math.round(snapshot.timelineZoom)}px/s</span>
          <span>FPS: {snapshot.config.editorFps}</span>
          <span>Grid: {snapshot.config.gridSnap ? 'On' : 'Off'}</span>
        </div>
        <div className="flex gap-4">
          <span>Assets: {Object.keys(snapshot.assets).length}</span>
          <span>Tracks: {snapshot.tracks.length}</span>
          <span>Selected: {snapshot.selectedClipIds.length}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Demo utility function to create sample content
 */
export const createDemoProject = async () => {
  // Reset the project
  editorActions.resetProject();
  
  // Add a demo track
  const trackId = editorActions.addTrack({ name: 'Demo Track' });
  
  // Update project name
  editorStore.projectName = 'Demo Project';
  
  console.log('Demo project created! Add video files using the Asset Library.');
};

export default VideoEditor;