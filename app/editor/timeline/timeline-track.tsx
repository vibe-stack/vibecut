import React from 'react';
import type { Track } from '../shared/types';
import { TimelineClip } from './timeline-clip';
import { editorActions } from '../shared/store';

interface TimelineTrackProps {
  track: Readonly<Track>;
  trackIndex: number;
  pixelsPerSecond: number;
  timelineWidth: number;
  onSelectClip: (clipId: string, append: boolean) => void;
  onStartDrag: (clipId: string, dragType: 'move' | 'trim-start' | 'trim-end', startX: number) => void;
  onStartCustomDrag?: (clipId: string, trackId: string, pointerOffsetX: number, startX: number, startY: number) => void;
  isHighlighted?: boolean;
  draggedClipId?: string | null;
  isGlobalDragActive?: boolean;
}

export const TimelineTrack: React.FC<TimelineTrackProps> = ({
  track,
  trackIndex,
  pixelsPerSecond,
  timelineWidth,
  onSelectClip,
  onStartDrag,
  onStartCustomDrag,
  isHighlighted = false,
  draggedClipId = null,
  isGlobalDragActive = false,
}) => {
  const trackHeight = 60; // pixels
  
  return (
    <div 
      className="relative"
      style={{ height: `${trackHeight}px` }}
      data-track-id={track.id}
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
          height: '100%',
          touchAction: 'manipulation',
        }}
        data-track-id={track.id}
      >
        {/* Drag highlight overlay */}
        {isHighlighted && draggedClipId && (
          <div 
            className="absolute inset-0 bg-zinc-500/15 border border-zinc-400/30 rounded-lg transition-all duration-150 pointer-events-none"
          />
        )}
        
        {/* Track clips */}
        {track.clips.map(clip => (
          <TimelineClip
            key={clip.id}
            clip={clip}
            track={track}
            pixelsPerSecond={pixelsPerSecond}
            onSelect={onSelectClip}
            onStartDrag={onStartDrag}
            onStartCustomDrag={onStartCustomDrag}
            isDragging={draggedClipId === clip.id}
            isGlobalDragActive={isGlobalDragActive}
          />
        ))}
      </div>
    </div>
  );
};