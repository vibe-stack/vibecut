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
  isGlobalDragActive?: boolean; // New prop to know if any drag is active globally
}

export const TimelineClip: React.FC<TimelineClipProps> = ({
  clip,
  track,
  pixelsPerSecond,
  onSelect,
  onStartDrag,
  onStartCustomDrag,
  isDragging = false,
  isGlobalDragActive = false,
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

  const activationTimeoutRef = useRef<number | null>(null);
  const startPosRef = useRef<{x:number;y:number}|null>(null);
  const activatedRef = useRef(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    console.log('Clip clicked:', clip.id, 'isDragging:', isDragging);
    e.stopPropagation();
    if (e.shiftKey || e.metaKey) {
      onSelect(clip.id, true);
    } else {
      onSelect(clip.id, false);
    }
  }, [clip.id, onSelect, isDragging]);

  const clearActivation = () => {
    if (activationTimeoutRef.current) {
      window.clearTimeout(activationTimeoutRef.current);
      activationTimeoutRef.current = null;
    }
    activatedRef.current = false;
    startPosRef.current = null;
  };

  const startActivation = (clientX: number, clientY: number) => {
    // Only allow dragging selected clips
    if (!isSelected) return;
    
    startPosRef.current = { x: clientX, y: clientY };
    activatedRef.current = false;
    activationTimeoutRef.current = window.setTimeout(() => {
      activatedRef.current = true;
      if (!onStartCustomDrag) return;
      const rect = clipRef.current?.getBoundingClientRect();
      const pointerOffsetX = rect ? clientX - rect.left : 0;
      onStartCustomDrag(clip.id, track.id, pointerOffsetX, clientX, clientY);
    }, 120); // slight delay to distinguish from click
  };

  const movementExceeded = (x: number, y: number) => {
    const start = startPosRef.current;
    if (!start) return false;
    const dx = Math.abs(x - start.x);
    const dy = Math.abs(y - start.y);
    return dx > 4 || dy > 4;
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // If not primary touch (multi-touch), likely pinch/gesture; do nothing
    if (e.pointerType === 'touch' && e.isPrimary === false) return;
    e.stopPropagation();
    startActivation(e.clientX, e.clientY);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!startPosRef.current || !isSelected) return;
    // If user moves before activation delay, activate drag immediately
    if (!activatedRef.current && movementExceeded(e.clientX, e.clientY)) {
      if (activationTimeoutRef.current) {
        window.clearTimeout(activationTimeoutRef.current);
        activationTimeoutRef.current = null;
      }
      activatedRef.current = true;
      if (!onStartCustomDrag) return;
      const rect = clipRef.current?.getBoundingClientRect();
      const pointerOffsetX = rect ? e.clientX - rect.left : 0;
      onStartCustomDrag(clip.id, track.id, pointerOffsetX, e.clientX, e.clientY);
    }
  }, [onStartCustomDrag, track.id, clip.id, isSelected]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    // If global drag is active, don't handle pointer up - let global handler manage it
    if (isGlobalDragActive) {
      return;
    }
    
    // If not activated, treat as click selection
    if (!activatedRef.current) {
      handleClick(e as any as React.MouseEvent);
    }
    clearActivation();
  }, [handleClick, isGlobalDragActive]);

  // Touch handling with pinch guard
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 1) return; // pinch/zoom; ignore
    const t = e.touches[0];
    startActivation(t.clientX, t.clientY);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 1 || !isSelected) return; // pinch/zoom; ignore
    const t = e.touches[0];
    if (!activatedRef.current && movementExceeded(t.clientX, t.clientY)) {
      if (activationTimeoutRef.current) {
        window.clearTimeout(activationTimeoutRef.current);
        activationTimeoutRef.current = null;
      }
      activatedRef.current = true;
      if (!onStartCustomDrag) return;
      const rect = clipRef.current?.getBoundingClientRect();
      const pointerOffsetX = rect ? t.clientX - rect.left : 0;
      onStartCustomDrag(clip.id, track.id, pointerOffsetX, t.clientX, t.clientY);
      // Do not preventDefault here; global touchmove in hook will handle when single touch
    }
  }, [onStartCustomDrag, track.id, clip.id, isSelected]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // If global drag is active, don't handle touch end - let global handler manage it
    if (isGlobalDragActive) {
      return;
    }
    
    if (!activatedRef.current) {
      // select on tap
      onSelect(clip.id, false);
    }
    clearActivation();
  }, [onSelect, clip.id, isGlobalDragActive]);

  

  const bgColor = asset.type === "text" ? "bg-orange-700 hover:bg-orange-800": asset.type === "image" ? "bg-green-700 hover:bg-green-800" : asset.type === "audio" ? "bg-blue-600 hover:bg-blue-700" : "bg-purple-700 hover:bg-purple-800";
  const selectedBgColor = asset.type === "text" ? "ring-orange-400/50": asset.type === "image" ? "ring-green-400/50" : asset.type === "audio" ? "ring-blue-400/50" : "ring-purple-400/50";

  return (
    <div
      ref={(ref) => {
        clipRef.current = ref;
        // Expose clearActivation for timeline cleanup
        if (ref) {
          (ref as any)._clearActivation = clearActivation;
        }
      }}
      className={`absolute h-12 rounded-xl mt-2 cursor-pointer select-none transition-colors ${bgColor} ${isSelected ? selectedBgColor  : ''
        } ${isDragging ? 'shadow-2xl shadow-black/50' : ''}`}
      data-clip-id={clip.id}
      style={style}
      title={`${asset?.src?.split('/').pop() || 'Unknown'} (${clip.duration.toFixed(2)}s)`}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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