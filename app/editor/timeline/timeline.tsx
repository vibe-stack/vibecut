import React, { useRef } from 'react';
import { useSnapshot } from 'valtio';
import editorStore from '../shared/store';
import { useTimelineDrag } from './hooks/use-timeline-drag';
import { useTimelineSelection } from './hooks/use-timeline-selection';
import { TimelineRuler } from './timeline-ruler';
import { TimelineTrack } from './timeline-track';
import { TimelinePlayhead } from './timeline-playhead';
import { useScrollSyncedPlayhead } from './hooks/use-scroll-synced-playhead';
import { useTimelinePinchZoom } from './hooks/use-timeline-pinch-zoom';
import { useTimelineDnd } from './dnd';

export const Timeline: React.FC<{ scrollContainer?: HTMLElement | null }> = ({ scrollContainer = null }) => {
  const snapshot = useSnapshot(editorStore);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const { isDragging, handleStartDrag } = useTimelineDrag();
  const { handleSelectClip } = useTimelineSelection();
  const { 
    DndProvider, 
    dragHandlers, 
    dragState, 
    setTimelineRef,
    setStartPosition,
    activeId,
  } = useTimelineDnd({ 
    pixelsPerSecond: snapshot.timelineZoom, 
    scrollContainer 
  });
  
  const timelineWidth = Math.max(1000, snapshot.totalDuration * snapshot.timelineZoom);
  const timelineHeight = 32 + (snapshot.tracks.length * 60); // Ruler + tracks
  
  // Sync playhead to horizontal center when idle (not playing)
  useScrollSyncedPlayhead(timelineRef);
  // Enable pinch zoom on touch devices
  useTimelinePinchZoom(timelineRef);

  // Set timeline ref for drag system
  React.useEffect(() => {
    if (timelineRef.current) {
      setTimelineRef(timelineRef.current);
    }
  }, [setTimelineRef]);

  const handleCustomDragStart = (clipId: string, trackId: string, pointerOffsetX: number, startX: number, startY: number) => {
    dragHandlers.onDragStart(clipId, trackId, pointerOffsetX);
    setStartPosition(startX, startY);
  };

  
  return (
    <div className="bg-transparent">
      <DndProvider>
        <div
          ref={timelineRef}
          className="relative"
          style={{ width: `${192 + timelineWidth}px`, height: `${timelineHeight}px` }}
        >
        {/* Track header background (below ruler) */}
        <div
          className="absolute left-0"
          style={{ top: `32px`, width: '192px', height: `${timelineHeight - 32}px`, backgroundColor: 'rgba(255,255,255,0.05)' }}
        />

        {/* Timeline ruler */}
        <TimelineRuler
          duration={snapshot.totalDuration}
          pixelsPerSecond={snapshot.timelineZoom}
          timelineWidth={timelineWidth}
        />
        
        {/* Tracks */}
        {snapshot.tracks.map((track, index) => (
          <div key={track.id} style={{ position: 'absolute', top: `${32 + index * 60}px` }}>
            <TimelineTrack
              track={track as any} // Type assertion to handle Valtio readonly proxy
              trackIndex={index}
              pixelsPerSecond={snapshot.timelineZoom}
              timelineWidth={timelineWidth}
              onSelectClip={handleSelectClip}
              onStartDrag={handleStartDrag}
              onStartCustomDrag={handleCustomDragStart}
              isHighlighted={dragState.hoveredTrackId === track.id}
              draggedClipId={activeId}
            />
          </div>
        ))}
        
        {/* Playhead */}
        <TimelinePlayhead
          currentTime={snapshot.playback.currentTime}
          pixelsPerSecond={snapshot.timelineZoom}
          timelineHeight={timelineHeight}
        />
        </div>
      </DndProvider>
    </div>
  );
};