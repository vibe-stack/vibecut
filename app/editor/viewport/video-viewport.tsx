import React from 'react';
import { Canvas } from '@react-three/fiber';
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
        {/* Main video renderer */}
        <VideoEditorRenderer />
      </Canvas>
    </div>
  );
};