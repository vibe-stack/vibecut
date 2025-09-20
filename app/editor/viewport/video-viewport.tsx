import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { useSnapshot } from 'valtio';
import editorStore from '../shared/store';
import { VideoEditorRenderer } from './video-renderer';

/**
 * Main video editor viewport with 3D canvas
 */
export const VideoViewport: React.FC = () => {
  const snapshot = useSnapshot(editorStore);

  return (
    <div className="w-full h-full bg-black relative">
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
    </div>
  );
};