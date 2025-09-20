import React from 'react';
import type { Track } from '../shared/types';
import { TimelineClip } from './timeline-clip';
import { editorActions } from '../shared/store';
import { useDroppable } from '@dnd-kit/core';

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
  const { setNodeRef } = useDroppable({ id: `track-${track.id}` });
  
  return (
    <div 
      className="relative"
      style={{ height: `${trackHeight}px` }}
      ref={setNodeRef}
    >
      {/* Track header */}
      <button
        className="absolute left-0 top-0 w-48 h-full bg-transparent hover:bg-white/5 active:bg-white/10 px-3 py-2 flex flex-col justify-center text-left rounded-none"
        onClick={(e) => {
          e.stopPropagation();
          editorActions.selectTracks([track.id]);
        }}
      >
        <div className="text-white text-sm font-medium truncate">{track.name}</div>
      </button>
      
      {/* Track timeline area */}
      <div 
        className="absolute"
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