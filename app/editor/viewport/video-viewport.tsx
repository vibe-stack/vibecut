import React from 'react';
import { Canvas } from '@react-three/fiber';
import { VideoEditorRenderer } from './video-renderer';

/**
 * Main video editor viewport with 3D canvas
 */
export const VideoViewport: React.FC = () => {
  return (
    <div
      className="w-full h-full bg-black relative"
      style={{
        touchAction: 'none', // disable browser gestures (pinch/pan/double-tap) over the viewport
        WebkitOverflowScrolling: 'auto',
        overscrollBehavior: 'none',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{ width: '100%', height: '100%', WebkitTransform: 'translateZ(0)', touchAction: 'none' }}
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance'
        }}
      >

        {/* Main video renderer */}
        <VideoEditorRenderer />
      </Canvas>
    </div>
  );
};