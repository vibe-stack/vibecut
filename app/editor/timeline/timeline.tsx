import React, { useRef, useCallback } from 'react';
import { useSnapshot } from 'valtio';
import * as THREE from 'three';
import editorStore, { editorActions } from '../shared/store';
import { useTimelineDrag } from './hooks/use-timeline-drag';
import { useTimelineSelection } from './hooks/use-timeline-selection';
import { TimelineRuler } from './timeline-ruler';
import { TimelineTrack } from './timeline-track';
import { TimelinePlayhead } from './timeline-playhead';
import { useScrollSyncedPlayhead } from './hooks/use-scroll-synced-playhead';

export const Timeline: React.FC = () => {
  const snapshot = useSnapshot(editorStore);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const { isDragging, handleStartDrag } = useTimelineDrag();
  const { handleSelectClip } = useTimelineSelection();
  
  const timelineWidth = Math.max(1000, snapshot.totalDuration * snapshot.timelineZoom);
  const timelineHeight = 32 + (snapshot.tracks.length * 60); // Ruler + tracks
  
  // Sync playhead to horizontal center when idle (not playing)
  useScrollSyncedPlayhead(timelineRef);

  // Handle asset drop onto timeline
  const handleTimelineDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      
      if (data.type === 'asset' && data.assetId) {
        const asset = snapshot.assets[data.assetId];
        if (!asset || asset.loadState !== 'loaded') return;
        
        const rect = timelineRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        // Calculate drop position on timeline
        const dropX = e.clientX - rect.left - 192; // Account for track header
        const dropY = e.clientY - rect.top;
        const dropTime = Math.max(0, dropX / snapshot.timelineZoom);
        
        // Find target track based on Y position
        const rulerHeight = 32;
        const trackHeight = 60;
        const trackIndex = Math.floor((dropY - rulerHeight) / trackHeight);
        const targetTrack = snapshot.tracks[trackIndex];
        
        if (!targetTrack || trackIndex < 0) {
          console.warn('Invalid drop target track');
          return;
        }
        
        // Create clip on the target track
        editorActions.addClip(targetTrack.id, {
          assetId: data.assetId,
          start: dropTime,
          end: dropTime + asset.duration,
          trimStart: 0,
          trimEnd: null,
          position: new THREE.Vector3(0, 0, 0),
          rotation: new THREE.Euler(0, 0, 0),
          scale: new THREE.Vector3(1, 1, 1),
          opacity: 1,
          visible: true,
          volume: 1,
          muted: false,
        });
      }
    } catch (error) {
      console.error('Failed to handle timeline drop:', error);
    }
  }, [snapshot.assets, snapshot.tracks, snapshot.timelineZoom]);

  const handleTimelineDragOver = useCallback((e: React.DragEvent) => {
    // Only prevent default for desktop drag events
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);
  
  return (
    <div className="bg-transparent">
      <div
        ref={timelineRef}
        className="relative"
        style={{ width: `${192 + timelineWidth}px`, height: `${timelineHeight}px` }}
        onDrop={handleTimelineDrop}
        onDragOver={handleTimelineDragOver}
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
    </div>
  );
};