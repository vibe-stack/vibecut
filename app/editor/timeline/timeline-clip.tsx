import React, { useCallback, useMemo, useRef } from 'react';
import { useSnapshot } from 'valtio';
import editorStore from '../shared/store';
import type { Clip, Track } from '../shared/types';

interface TimelineClipProps {
  clip: Readonly<Clip>;
  track: Readonly<Track>;
  pixelsPerSecond: number;
  onSelect: (clipId: string, append: boolean) => void;
  onStartDrag: (clipId: string, dragType: 'move' | 'trim-start' | 'trim-end', startX: number) => void;
  onStartCustomDrag?: (clipId: string, trackId: string, pointerOffsetX: number, startX: number, startY: number) => void;
  isDragging?: boolean;
}

export const TimelineClip: React.FC<TimelineClipProps> = ({
  clip,
  track,
  pixelsPerSecond,
  onSelect,
  onStartDrag,
  onStartCustomDrag,
  isDragging = false,
}) => {
  const snapshot = useSnapshot(editorStore);
  const isSelected = snapshot.selectedClipIds.includes(clip.id);
  const asset = snapshot.assets[clip.assetId];
  const clipRef = useRef<HTMLDivElement>(null);

  const clipWidth = clip.duration * pixelsPerSecond;
  const clipLeft = clip.start * pixelsPerSecond;

  const style = useMemo(() => {
    const baseStyle: React.CSSProperties = {
      left: `${clipLeft}px`,
      width: `${clipWidth}px`,
      touchAction: 'none',
    };

    if (isDragging) {
      baseStyle.transform = 'scale(1.03)';
      baseStyle.zIndex = 1000;
      baseStyle.boxShadow = '0 8px 28px rgba(0,0,0,0.35)';
    }

    return baseStyle;
  }, [clipLeft, clipWidth, isDragging]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!onStartCustomDrag) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = clipRef.current?.getBoundingClientRect();
    const pointerOffsetX = rect ? e.clientX - rect.left : 0;
    
    onStartCustomDrag(clip.id, track.id, pointerOffsetX, e.clientX, e.clientY);
  }, [clip.id, track.id, onStartCustomDrag]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    console.log('Clip clicked:', clip.id, 'isDragging:', isDragging);
    e.stopPropagation();
    if (e.shiftKey || e.metaKey) {
      onSelect(clip.id, true);
    } else {
      onSelect(clip.id, false);
    }
  }, [clip.id, onSelect, isDragging]);

  const bgColor = asset.type === "text" ? "bg-orange-700 hover:bg-orange-800": asset.type === "image" ? "bg-green-700 hover:bg-green-800" : asset.type === "audio" ? "bg-blue-600 hover:bg-blue-700" : "bg-purple-700 hover:bg-purple-800";
  const selectedBgColor = asset.type === "text" ? "ring-orange-400/50": asset.type === "image" ? "ring-green-400/50" : asset.type === "audio" ? "ring-blue-400/50" : "ring-purple-400/50";

  return (
    <div
      ref={clipRef}
      className={`absolute h-12 rounded-xl mt-2 cursor-pointer select-none transition-colors ${bgColor} ${isSelected ? selectedBgColor  : ''
        } ${isDragging ? 'shadow-2xl shadow-black/50' : ''}`}
      data-clip-id={clip.id}
      style={style}
      title={`${asset?.src?.split('/').pop() || 'Unknown'} (${clip.duration.toFixed(2)}s)`}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
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