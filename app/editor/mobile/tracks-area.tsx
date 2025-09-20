import React from 'react';
import { Timeline } from '../timeline/timeline';

export const TracksArea: React.FC = () => {
  return (
    <div className="px-3 h-full min-h-0 overflow-hidden">
      <div className="rounded-2xl bg-black/50 backdrop-blur h-full min-h-0 overflow-hidden">
        <div
          className="h-full min-h-0 overflow-x-auto overflow-y-auto overscroll-contain no-scrollbar"
          style={{ touchAction: 'pan-x pan-y', WebkitOverflowScrolling: 'touch' }}
        >
          <Timeline />
        </div>
      </div>
    </div>
  );
};

export default TracksArea;
