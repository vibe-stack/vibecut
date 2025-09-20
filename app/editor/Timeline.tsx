import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import * as THREE from 'three';
import editorStore, { editorActions } from './store';
import type { Clip, Track } from './types';

interface TimelineClipProps {
  clip: Readonly<Clip>;
  track: Readonly<Track>;
  pixelsPerSecond: number;
  onSelect: (clipId: string, append: boolean) => void;
  onStartDrag: (clipId: string, dragType: 'move' | 'trim-start' | 'trim-end', startX: number) => void;
}

const TimelineClip: React.FC<TimelineClipProps> = ({
  clip,
  track,
  pixelsPerSecond,
  onSelect,
  onStartDrag,
}) => {
  const snapshot = useSnapshot(editorStore);
  const isSelected = snapshot.selectedClipIds.includes(clip.id);
  const asset = snapshot.assets[clip.assetId];
  
  const clipWidth = clip.duration * pixelsPerSecond;
  const clipLeft = clip.start * pixelsPerSecond;
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const isNearStart = relativeX < 10;
    const isNearEnd = relativeX > clipWidth - 10;
    
    if (e.shiftKey || e.metaKey) {
      onSelect(clip.id, true);
    } else {
      onSelect(clip.id, false);
    }
    
    if (isNearStart) {
      onStartDrag(clip.id, 'trim-start', e.clientX);
    } else if (isNearEnd) {
      onStartDrag(clip.id, 'trim-end', e.clientX);
    } else {
      onStartDrag(clip.id, 'move', e.clientX);
    }
  }, [clip.id, clipWidth, onSelect, onStartDrag]);

  return (
    <div
      className={`absolute h-12 bg-blue-500 border border-blue-600 rounded cursor-pointer select-none transition-colors ${
        isSelected ? 'ring-2 ring-yellow-400 bg-blue-400' : 'hover:bg-blue-400'
      }`}
      style={{
        left: `${clipLeft}px`,
        width: `${clipWidth}px`,
      }}
      onMouseDown={handleMouseDown}
      title={`${asset?.src?.split('/').pop() || 'Unknown'} (${clip.duration.toFixed(2)}s)`}
    >
      {/* Clip content */}
      <div className="h-full flex items-center px-2 text-white text-xs overflow-hidden">
        <span className="truncate">
          {asset?.src?.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Clip'}
        </span>
      </div>
      
      {/* Trim handles */}
      {isSelected && (
        <>
          <div className="absolute left-0 top-0 w-2 h-full bg-yellow-400 cursor-w-resize opacity-75 hover:opacity-100" />
          <div className="absolute right-0 top-0 w-2 h-full bg-yellow-400 cursor-e-resize opacity-75 hover:opacity-100" />
        </>
      )}
    </div>
  );
};

interface TimelineTrackProps {
  track: Readonly<Track>;
  trackIndex: number;
  pixelsPerSecond: number;
  timelineWidth: number;
  onSelectClip: (clipId: string, append: boolean) => void;
  onStartDrag: (clipId: string, dragType: 'move' | 'trim-start' | 'trim-end', startX: number) => void;
}

const TimelineTrack: React.FC<TimelineTrackProps> = ({
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

interface TimelineRulerProps {
  duration: number;
  pixelsPerSecond: number;
  timelineWidth: number;
}

const TimelineRuler: React.FC<TimelineRulerProps> = ({
  duration,
  pixelsPerSecond,
  timelineWidth,
}) => {
  const majorTicks = [];
  const minorTicks = [];
  
  // Calculate tick intervals based on zoom level
  let majorInterval = 1; // seconds
  if (pixelsPerSecond < 10) majorInterval = 10;
  else if (pixelsPerSecond < 50) majorInterval = 5;
  else if (pixelsPerSecond > 100) majorInterval = 0.5;
  
  const minorInterval = majorInterval / 5;
  
  // Generate major ticks
  for (let time = 0; time <= duration; time += majorInterval) {
    const x = time * pixelsPerSecond;
    if (x <= timelineWidth) {
      majorTicks.push({ time, x });
    }
  }
  
  // Generate minor ticks
  for (let time = 0; time <= duration; time += minorInterval) {
    const x = time * pixelsPerSecond;
    if (x <= timelineWidth) {
      minorTicks.push({ time, x });
    }
  }
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="relative h-8 bg-gray-700 border-b border-gray-600">
      {/* Track header spacer */}
      <div className="absolute left-0 top-0 w-48 h-full bg-gray-700 border-r border-gray-600" />
      
      {/* Ruler area */}
      <div 
        className="absolute bg-gray-700"
        style={{ 
          left: '192px',
          top: 0,
          width: `${timelineWidth}px`,
          height: '100%'
        }}
      >
        {/* Minor ticks */}
        {minorTicks.map(({ time, x }) => (
          <div
            key={`minor-${time}`}
            className="absolute top-6 w-px h-2 bg-gray-500"
            style={{ left: `${x}px` }}
          />
        ))}
        
        {/* Major ticks and labels */}
        {majorTicks.map(({ time, x }) => (
          <div key={`major-${time}`} className="absolute" style={{ left: `${x}px` }}>
            <div className="w-px h-4 bg-gray-300" />
            <div className="absolute top-0 left-1 text-xs text-gray-300 whitespace-nowrap">
              {formatTime(time)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface TimelinePlayheadProps {
  currentTime: number;
  pixelsPerSecond: number;
  timelineHeight: number;
}

const TimelinePlayhead: React.FC<TimelinePlayheadProps> = ({
  currentTime,
  pixelsPerSecond,
  timelineHeight,
}) => {
  const x = currentTime * pixelsPerSecond;
  
  return (
    <div
      className="absolute pointer-events-none z-10"
      style={{
        left: `${192 + x}px`, // Track header offset
        top: 0,
        height: `${timelineHeight}px`,
      }}
    >
      {/* Playhead line */}
      <div className="w-0.5 h-full bg-red-500" />
      
      {/* Playhead handle */}
      <div className="absolute -top-1 -left-2 w-4 h-4 bg-red-500 rounded-sm pointer-events-auto cursor-pointer" />
    </div>
  );
};

export const Timeline: React.FC = () => {
  const snapshot = useSnapshot(editorStore);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<{
    clipId: string;
    type: 'move' | 'trim-start' | 'trim-end';
    startX: number;
    originalClip: Clip;
  } | null>(null);
  
  const timelineWidth = Math.max(1000, snapshot.totalDuration * snapshot.timelineZoom);
  const timelineHeight = 32 + (snapshot.tracks.length * 60); // Ruler + tracks
  
  const handleSelectClip = useCallback((clipId: string, append: boolean) => {
    editorActions.selectClips([clipId], append);
  }, []);
  
  const handleStartDrag = useCallback((clipId: string, dragType: 'move' | 'trim-start' | 'trim-end', startX: number) => {
    // Find the original clip
    const originalClip = snapshot.tracks
      .flatMap(track => track.clips)
      .find(clip => clip.id === clipId);
      
    if (originalClip) {
      setIsDragging({
        clipId,
        type: dragType,
        startX,
        originalClip: originalClip as Clip,
      });
    }
  }, [snapshot.tracks]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - isDragging.startX;
    const deltaTime = deltaX / snapshot.timelineZoom;
    
    switch (isDragging.type) {
      case 'move':
        const newStart = Math.max(0, isDragging.originalClip.start + deltaTime);
        const newEnd = newStart + isDragging.originalClip.duration;
        editorActions.updateClip(isDragging.clipId, {
          start: newStart,
          end: newEnd,
        });
        break;
        
      case 'trim-start':
        const newTrimStart = Math.max(0, isDragging.originalClip.trimStart + deltaTime);
        const maxTrimStart = isDragging.originalClip.trimEnd || 
          (snapshot.assets[isDragging.originalClip.assetId]?.duration || 0);
        
        if (newTrimStart < maxTrimStart) {
          editorActions.updateClip(isDragging.clipId, {
            trimStart: newTrimStart,
            start: isDragging.originalClip.start + deltaTime,
          });
        }
        break;
        
      case 'trim-end':
        const asset = snapshot.assets[isDragging.originalClip.assetId];
        const maxDuration = asset?.duration || 0;
        const newTrimEnd = Math.min(maxDuration, 
          (isDragging.originalClip.trimEnd || maxDuration) + deltaTime);
        
        if (newTrimEnd > isDragging.originalClip.trimStart) {
          editorActions.updateClip(isDragging.clipId, {
            trimEnd: newTrimEnd,
            end: isDragging.originalClip.start + (newTrimEnd - isDragging.originalClip.trimStart),
          });
        }
        break;
    }
  }, [isDragging, snapshot.timelineZoom, snapshot.assets]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);
  
  // Global mouse event handlers for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  // Handle timeline click for seeking
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (isDragging) return;
    
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const clickX = e.clientX - rect.left - 192; // Account for track header
    const clickTime = clickX / snapshot.timelineZoom;
    
    if (clickTime >= 0 && clickTime <= snapshot.totalDuration) {
      editorActions.seekTo(clickTime);
    }
  }, [isDragging, snapshot.timelineZoom, snapshot.totalDuration]);

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
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);
  
  return (
    <div className="bg-gray-800 border-t border-gray-600 overflow-auto max-h-96">
      <div
        ref={timelineRef}
        className="relative"
        style={{ width: `${192 + timelineWidth}px`, height: `${timelineHeight}px` }}
        onClick={handleTimelineClick}
        onDrop={handleTimelineDrop}
        onDragOver={handleTimelineDragOver}
      >
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