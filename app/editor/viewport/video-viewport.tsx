import React from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { VideoEditorRenderer } from './video-renderer';
import { setRendererContext } from './hooks/export-context';
import { useComposition, useFittedFrameSize } from './hooks/use-composition';

const ContextBridge: React.FC = () => {
  const { gl, scene, camera, size } = useThree();
  // Publish context for export consumers
  React.useEffect(() => {
    setRendererContext({
      gl: gl as any,
      scene: scene as any,
      camera: camera as any,
      size: { width: size.width, height: size.height, pixelRatio: gl.getPixelRatio() },
    });
  }, [gl, scene, camera, size.width, size.height]);
  return null;
};

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
        <ContextBridge />
        <VideoEditorRenderer />
      </Canvas>
    </div>
  );
};