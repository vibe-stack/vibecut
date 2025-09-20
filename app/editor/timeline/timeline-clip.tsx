import React, { useCallback, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import editorStore from '../shared/store';
import type { Clip, Track } from '../shared/types';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { getDraggableData } from './dnd';

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

  const draggable = useDraggable({
    id: `clip-${clip.id}`,
    data: getDraggableData(clip as any, track.id, 0),
  });
  
  const translate = CSS.Translate.toString(draggable.transform);
  const transform = draggable.isDragging
    ? `${translate || ''} scale(1.1)`
    : translate || undefined;
  const style = { transform } as React.CSSProperties;
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    console.log('Clip clicked:', clip.id, 'isDragging:', draggable.isDragging);
    // Handle selection when clicked
    e.stopPropagation();
    if (e.shiftKey || e.metaKey) {
      onSelect(clip.id, true);
    } else {
      onSelect(clip.id, false);
    }
  }, [clip.id, onSelect, draggable.isDragging]);

  return (
    <div
      className={`absolute h-12 rounded-xl cursor-pointer select-none transition-colors bg-white/10 hover:bg-white/15 ${
        isSelected ? 'ring-2 ring-white/50' : ''
      } ${draggable.isDragging ? 'shadow-2xl shadow-black/50' : ''}`}
      data-clip-id={clip.id}
      style={{
        left: `${clipLeft}px`,
        width: `${clipWidth}px`,
        touchAction: 'none',
        ...style,
      }}
      ref={draggable.setNodeRef}
      {...draggable.listeners}
      {...draggable.attributes}
      title={`${asset?.src?.split('/').pop() || 'Unknown'} (${clip.duration.toFixed(2)}s)`}
      onClick={handleClick}
    >
      {/* Clip content */}
      <div 
        className="h-full flex items-center px-2 pl-8 text-white text-xs overflow-hidden"
        style={{ touchAction: 'none' }}
      >
        <span className="truncate">
          {asset?.type === 'text' ? (clip as any).textContent || 'Text' : (asset?.src?.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Clip')}
        </span>
      </div>
      
      {/* Trim handles */}
      {isSelected && (
        <>
          {/* Left handle */}
          <div
            className="absolute left-0 top-0 w-4 h-full bg-white/50 hover:bg-white/90 cursor-w-resize z-10 flex items-center justify-center rounded-l-xl"
            style={{ touchAction: 'none' }}
            onPointerDown={(e: React.PointerEvent) => {
              // Fully block DnD pointer sensor on handle drags
              e.stopPropagation();
              e.preventDefault();
            }}
            onMouseDown={(e: React.MouseEvent) => {
              e.stopPropagation();
              e.preventDefault();
              onSelect(clip.id, false);
              onStartDrag(clip.id, 'trim-start', e.clientX);
            }}
            onTouchStart={(e: React.TouchEvent) => {
              e.stopPropagation();
              // prevent scrolling; iOS requires non-passive listeners upstream which we add in the hook
              e.preventDefault();
              onSelect(clip.id, false);
              const touch = e.touches[0];
              onStartDrag(clip.id, 'trim-start', touch.clientX);
            }}
          >
            <div className="w-0.5 h-6 bg-gray-700"></div>
          </div>
          {/* Right handle */}
          <div
            className="absolute right-0 top-0 w-4 h-full bg-white/50 hover:bg-white/90 cursor-e-resize z-10 flex items-center justify-center rounded-r-xl"
            style={{ touchAction: 'none' }}
            onPointerDown={(e: React.PointerEvent) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onMouseDown={(e: React.MouseEvent) => {
              e.stopPropagation();
              e.preventDefault();
              onSelect(clip.id, false);
              onStartDrag(clip.id, 'trim-end', e.clientX);
            }}
            onTouchStart={(e: React.TouchEvent) => {
              e.stopPropagation();
              e.preventDefault();
              onSelect(clip.id, false);
              const touch = e.touches[0];
              onStartDrag(clip.id, 'trim-end', touch.clientX);
            }}
          >
            <div className="w-0.5 h-6 bg-gray-700"></div>
          </div>
        </>
      )}
    </div>
  );
};