import { useCallback, useState, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from '../../shared/store';
import type { Clip } from '../../shared/types';

export const useTimelineDrag = () => {
  const snapshot = useSnapshot(editorStore);
  const [isDragging, setIsDragging] = useState<{
    clipId: string;
    type: 'move' | 'trim-start' | 'trim-end';
    startX: number;
    originalClip: Clip;
  } | null>(null);

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

  const applyDelta = useCallback((deltaX: number) => {
    if (!isDragging) return;
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

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - isDragging.startX;
    applyDelta(deltaX);
  }, [isDragging, snapshot.timelineZoom, snapshot.assets]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    if (e.touches.length < 1) return;
    const x = e.touches[0].clientX;
    const deltaX = x - isDragging.startX;
    e.preventDefault();
    applyDelta(deltaX);
  }, [isDragging, applyDelta]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(null);
  }, []);
  
  // Global mouse event handlers for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove as any);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return {
    isDragging,
    handleStartDrag
  };
};