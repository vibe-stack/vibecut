import React, { useCallback } from 'react';
import { useSnapshot } from 'valtio';
import editorStore from '../shared/store';
import type { Clip, Track } from '../shared/types';

interface TimelineClipProps {
  clip: Readonly<Clip>;
  track: Readonly<Track>;
  pixelsPerSecond: number;
  onSelect: (clipId: string, append: boolean) => void;
  onStartDrag: (clipId: string, dragType: 'move' | 'trim-start' | 'trim-end', startX: number) => void;
}

export const TimelineClip: React.FC<TimelineClipProps> = ({
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