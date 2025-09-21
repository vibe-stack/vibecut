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
import * as motion from "motion/react-client";

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
    scrollTick,
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

  // Clear activation state after drag completes to prevent immediate re-drag
  React.useEffect(() => {
    if (!dragState.isDragging && activeId) {
      // Give a small delay to ensure all pointer events are processed
      const timeout = setTimeout(() => {
        // Clear activation state on all clips
        document.querySelectorAll('[data-clip-id]').forEach(element => {
          const clipElement = element as any;
          if (clipElement._clearActivation) {
            clipElement._clearActivation();
          }
        });
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [dragState.isDragging, activeId]);

  
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
        
        {/* Drag overlay (follows pointer) */}
        {activeId && dragState.isDragging && (() => {
          const clip = snapshot.tracks.flatMap(t => t.clips).find(c => c.id === activeId);
          const asset = clip ? snapshot.assets[clip.assetId] : null;
          if (!clip || !asset) return null;
          const width = clip.duration * snapshot.timelineZoom;
          
          // Calculate left position using same logic as drop calculation for consistency
          const headerWidth = 192;
          const scrollLeft = timelineRef.current?.scrollLeft ?? 0;
          const containerRect = timelineRef.current?.getBoundingClientRect();
          let left = 0;
          if (containerRect) {
            // Use the same calculation as drop for perfect alignment
            const contentX = scrollLeft + (dragState.currentPosition.x - containerRect.left) - headerWidth - dragState.pointerOffsetX;
            left = headerWidth + contentX;
          }
          
          // Position vertically near the hovered track (fallback to origin clip track)
          const originTrackId = snapshot.tracks.find(t => t.clips.some(c => c.id === clip.id))?.id;
          const hoveredId = dragState.hoveredTrackId ?? originTrackId ?? snapshot.tracks[0]?.id;
          const trackIndex = Math.max(0, snapshot.tracks.findIndex(t => t.id === hoveredId));
          const top = 32 + trackIndex * 60 + 8; // within track area
          const bg = asset.type === 'text' ? 'bg-orange-700' : asset.type === 'image' ? 'bg-green-700' : asset.type === 'audio' ? 'bg-blue-600' : 'bg-purple-700';
          const opacity = 0.75;
          return (
            <div
              className={`absolute h-12 rounded-xl pointer-events-none ${bg}`}
              style={{
                left,
                top,
                width,
                opacity,
                transform: 'scale(1.03)',
                boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
                zIndex: 2000,
              }}
              // force rerender when scroll changes during drag
              data-scroll-tick={scrollTick}
            />
          );
        })()}

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
              isGlobalDragActive={dragState.isDragging}
            />
          </div>
        ))}
        
        {/* Playhead (ensure highest z) */}
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