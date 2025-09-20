import React from 'react';
import { Timeline } from '../timeline/timeline';

export const TracksArea: React.FC = () => {
  return (
    <div className="px-3">
      <div className="rounded-2xl overflow-hidden bg-black/50 backdrop-blur">
        <Timeline />
      </div>
    </div>
  );
};

export default TracksArea;
