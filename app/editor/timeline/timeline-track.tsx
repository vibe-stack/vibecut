import React from 'react';
import type { Track } from '../shared/types';
import { TimelineClip } from './timeline-clip';

interface TimelineTrackProps {
  track: Readonly<Track>;
  trackIndex: number;
  pixelsPerSecond: number;
  timelineWidth: number;
  onSelectClip: (clipId: string, append: boolean) => void;
  onStartDrag: (clipId: string, dragType: 'move' | 'trim-start' | 'trim-end', startX: number) => void;
}

export const TimelineTrack: React.FC<TimelineTrackProps> = ({
  track,
  trackIndex,
  pixelsPerSecond,
  timelineWidth,
  onSelectClip,
  onStartDrag,
}) => {
  const trackHeight = 60; // pixels
  
  return (
    <div 
      className="relative border-b border-gray-600"
      style={{ height: `${trackHeight}px` }}
    >
      {/* Track header */}
      <div className="absolute left-0 top-0 w-48 h-full bg-gray-700 border-r border-gray-600 px-3 py-2 flex flex-col justify-center">
        <div className="text-white text-sm font-medium truncate">{track.name}</div>
        <div className="text-gray-400 text-xs">
          Track {trackIndex + 1} • {track.clips.length} clips
        </div>
      </div>
      
      {/* Track timeline area */}
      <div 
        className="absolute bg-gray-800"
        style={{ 
          left: '192px', // Track header width
          top: 0,
          width: `${timelineWidth}px`,
          height: '100%'
        }}
      >
        {/* Track clips */}
        {track.clips.map(clip => (
          <TimelineClip
            key={clip.id}
            clip={clip}
            track={track}
            pixelsPerSecond={pixelsPerSecond}
            onSelect={onSelectClip}
            onStartDrag={onStartDrag}
          />
        ))}
      </div>
    </div>
  );
};