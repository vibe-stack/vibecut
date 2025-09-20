import React from 'react';
import { PlaybackControls } from './playback-controls';
import { TimelineScrubber } from './timeline-scrubber';
import { FrameControls } from './frame-controls';
import { ZoomControls } from './zoom-controls';

/**
 * Combined timeline controls component
 */
export const TimelineControls: React.FC = () => {
  return (
    <div className="bg-gray-800 border-b border-gray-600">
      {/* Main playback controls */}
      <PlaybackControls />
      
      {/* Timeline scrubber */}
      <div className="px-4 pb-4">
        <TimelineScrubber />
      </div>
      
      {/* Additional controls */}
      <div className="flex justify-between items-center px-4 pb-2">
        <FrameControls />
        <ZoomControls />
      </div>
    </div>
  );
};