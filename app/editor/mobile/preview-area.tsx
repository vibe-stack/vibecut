import React from 'react';
import { VideoViewport } from '../viewport/video-viewport';

export const PreviewArea: React.FC = () => {
  return (
    <div className="relative" style={{ height: '40dvh' }}>
      <div className="absolute inset-0 rounded-2xl overflow-hidden bg-black/80 backdrop-blur">
        <VideoViewport />
      </div>
    </div>
  );
};

export default PreviewArea;
