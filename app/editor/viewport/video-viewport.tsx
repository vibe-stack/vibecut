import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from '../shared/store';
import { VideoEditorRenderer } from './video-renderer';

/**
 * Main video editor viewport with 3D canvas
 */
export const VideoViewport: React.FC = () => {
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