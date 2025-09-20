import { useCallback, useState, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from '../../shared/store';
import type { Clip } from '../../shared/types';
import { clampTrimEndToRight, clampTrimStartToLeft } from '../utils/timeline-collision';

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
        const a = snapshot.assets[isDragging.originalClip.assetId];
        const track = snapshot.tracks.find(t => t.clips.some(c => c.id === isDragging.clipId));
        if (track) {
          const proposedStart = isDragging.originalClip.start + deltaTime;
          const clampedStart = clampTrimStartToLeft(track as any, isDragging.originalClip as any, proposedStart);
          if (a && (a.type === 'video' || a.type === 'audio')) {
            let newTrimStart = Math.max(0, isDragging.originalClip.trimStart + (clampedStart - isDragging.originalClip.start));
            const maxTrimStart = isDragging.originalClip.trimEnd || a.duration;
            if (newTrimStart < maxTrimStart) {
              editorActions.updateClip(isDragging.clipId, {
                trimStart: newTrimStart,
                start: clampedStart,
              });
            }
          } else {
            // Image: no trimStart, just move left edge (start)
            editorActions.updateClip(isDragging.clipId, {
              start: clampedStart,
            });
          }
        }
        break;
        
      case 'trim-end':
        const asset = snapshot.assets[isDragging.originalClip.assetId];
  if (asset && (asset.type === 'video' || asset.type === 'audio')) {
          const maxDuration = asset.duration || 0;
          let newTrimEnd = Math.min(maxDuration, 
            (isDragging.originalClip.trimEnd || maxDuration) + deltaTime);
          const track2 = snapshot.tracks.find(t => t.clips.some(c => c.id === isDragging.clipId));
          if (track2) {
            const proposedEnd = isDragging.originalClip.start + (newTrimEnd - isDragging.originalClip.trimStart);
            const clampedEnd = clampTrimEndToRight(track2 as any, isDragging.originalClip as any, proposedEnd);
            newTrimEnd = isDragging.originalClip.trimStart + (clampedEnd - isDragging.originalClip.start);
          }
          if (newTrimEnd > isDragging.originalClip.trimStart) {
            editorActions.updateClip(isDragging.clipId, {
              trimEnd: newTrimEnd,
              end: isDragging.originalClip.start + (newTrimEnd - isDragging.originalClip.trimStart),
            });
          }
        } else {
          // Image: change the clip end directly, clamp to avoid overlap
          const track2 = snapshot.tracks.find(t => t.clips.some(c => c.id === isDragging.clipId));
          if (track2) {
            const proposedEnd = isDragging.originalClip.end + deltaTime;
            const clampedEnd = clampTrimEndToRight(track2 as any, isDragging.originalClip as any, proposedEnd);
            if (clampedEnd > isDragging.originalClip.start) {
              editorActions.updateClip(isDragging.clipId, {
                end: clampedEnd,
              });
            }
          }
        }
        break;
    }
  }, [isDragging, snapshot.timelineZoom, snapshot.assets]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);
  
  // Pointer handlers (covers pen/touch-as-pointer)
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging) return;
    // Prevent scrolling/selection while dragging
    try { e.preventDefault(); } catch {}
    const deltaX = e.clientX - isDragging.startX;
    const deltaTime = deltaX / snapshot.timelineZoom;
    
    switch (isDragging.type) {
      case 'move': {
        const newStart = Math.max(0, isDragging.originalClip.start + deltaTime);
        const newEnd = newStart + isDragging.originalClip.duration;
        editorActions.updateClip(isDragging.clipId, { start: newStart, end: newEnd });
        break;
      }
      case 'trim-start': {
        const a = snapshot.assets[isDragging.originalClip.assetId];
        const track = snapshot.tracks.find(t => t.clips.some(c => c.id === isDragging.clipId));
        if (track) {
          const proposedStart = isDragging.originalClip.start + deltaTime;
          const clampedStart = clampTrimStartToLeft(track as any, isDragging.originalClip as any, proposedStart);
          if (a && (a.type === 'video' || a.type === 'audio')) {
            let newTrimStart = Math.max(0, isDragging.originalClip.trimStart + (clampedStart - isDragging.originalClip.start));
            const maxTrimStart = isDragging.originalClip.trimEnd || a.duration;
            if (newTrimStart < maxTrimStart) {
              editorActions.updateClip(isDragging.clipId, { trimStart: newTrimStart, start: clampedStart });
            }
          } else {
            editorActions.updateClip(isDragging.clipId, { start: clampedStart });
          }
        }
        break;
      }
      case 'trim-end': {
        const asset = snapshot.assets[isDragging.originalClip.assetId];
  if (asset && (asset.type === 'video' || asset.type === 'audio')) {
          const maxDuration = asset.duration || 0;
          let newTrimEnd = Math.min(maxDuration, (isDragging.originalClip.trimEnd || maxDuration) + deltaTime);
          const track2 = snapshot.tracks.find(t => t.clips.some(c => c.id === isDragging.clipId));
          if (track2) {
            const proposedEnd = isDragging.originalClip.start + (newTrimEnd - isDragging.originalClip.trimStart);
            const clampedEnd = clampTrimEndToRight(track2 as any, isDragging.originalClip as any, proposedEnd);
            newTrimEnd = isDragging.originalClip.trimStart + (clampedEnd - isDragging.originalClip.start);
          }
          if (newTrimEnd > isDragging.originalClip.trimStart) {
            editorActions.updateClip(isDragging.clipId, { trimEnd: newTrimEnd, end: isDragging.originalClip.start + (newTrimEnd - isDragging.originalClip.trimStart) });
          }
        } else {
          const track2 = snapshot.tracks.find(t => t.clips.some(c => c.id === isDragging.clipId));
          if (track2) {
            const proposedEnd = isDragging.originalClip.end + deltaTime;
            const clampedEnd = clampTrimEndToRight(track2 as any, isDragging.originalClip as any, proposedEnd);
            if (clampedEnd > isDragging.originalClip.start) {
              editorActions.updateClip(isDragging.clipId, { end: clampedEnd });
            }
          }
        }
        break;
      }
    }
  }, [isDragging, snapshot.timelineZoom, snapshot.assets]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(null);
  }, []);
  
  // Touch handlers (iOS Safari support)
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    // prevent the page from scrolling while trimming
    try { e.preventDefault(); } catch {}
    const touch = e.touches[0] || e.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - isDragging.startX;
    const deltaTime = deltaX / snapshot.timelineZoom;

    switch (isDragging.type) {
      case 'move': {
        const newStart = Math.max(0, isDragging.originalClip.start + deltaTime);
        const newEnd = newStart + isDragging.originalClip.duration;
        editorActions.updateClip(isDragging.clipId, {
          start: newStart,
          end: newEnd,
        });
        break;
      }
      case 'trim-start': {
        const a = snapshot.assets[isDragging.originalClip.assetId];
        const track = snapshot.tracks.find(t => t.clips.some(c => c.id === isDragging.clipId));
        if (track) {
          const proposedStart = isDragging.originalClip.start + deltaTime;
          const clampedStart = clampTrimStartToLeft(track as any, isDragging.originalClip as any, proposedStart);
          if (a && (a.type === 'video' || a.type === 'audio')) {
            let newTrimStart = Math.max(0, isDragging.originalClip.trimStart + (clampedStart - isDragging.originalClip.start));
            const maxTrimStart = isDragging.originalClip.trimEnd || a.duration;
            if (newTrimStart < maxTrimStart) {
              editorActions.updateClip(isDragging.clipId, {
                trimStart: newTrimStart,
                start: clampedStart,
              });
            }
          } else {
            editorActions.updateClip(isDragging.clipId, {
              start: clampedStart,
            });
          }
        }
        break;
      }
      case 'trim-end': {
        const asset = snapshot.assets[isDragging.originalClip.assetId];
  if (asset && (asset.type === 'video' || asset.type === 'audio')) {
          const maxDuration = asset.duration || 0;
          let newTrimEnd = Math.min(maxDuration, (isDragging.originalClip.trimEnd || maxDuration) + deltaTime);
          const track2 = snapshot.tracks.find(t => t.clips.some(c => c.id === isDragging.clipId));
          if (track2) {
            const proposedEnd = isDragging.originalClip.start + (newTrimEnd - isDragging.originalClip.trimStart);
            const clampedEnd = clampTrimEndToRight(track2 as any, isDragging.originalClip as any, proposedEnd);
            newTrimEnd = isDragging.originalClip.trimStart + (clampedEnd - isDragging.originalClip.start);
          }
          if (newTrimEnd > isDragging.originalClip.trimStart) {
            editorActions.updateClip(isDragging.clipId, {
              trimEnd: newTrimEnd,
              end: isDragging.originalClip.start + (newTrimEnd - isDragging.originalClip.trimStart),
            });
          }
        } else {
          const track2 = snapshot.tracks.find(t => t.clips.some(c => c.id === isDragging.clipId));
          if (track2) {
            const proposedEnd = isDragging.originalClip.end + deltaTime;
            const clampedEnd = clampTrimEndToRight(track2 as any, isDragging.originalClip as any, proposedEnd);
            if (clampedEnd > isDragging.originalClip.start) {
              editorActions.updateClip(isDragging.clipId, { end: clampedEnd });
            }
          }
        }
        break;
      }
    }
  }, [isDragging, snapshot.timelineZoom, snapshot.assets]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(null);
  }, []);
  
  // Global mouse event handlers for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Touch listeners (non-passive to allow preventDefault)
      document.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false });
      document.addEventListener('touchend', handleTouchEnd as EventListener);
      document.addEventListener('touchcancel', handleTouchEnd as EventListener);
      // Pointer listeners
      document.addEventListener('pointermove', handlePointerMove as EventListener, { passive: false });
      document.addEventListener('pointerup', handlePointerUp as EventListener);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove as EventListener);
        document.removeEventListener('touchend', handleTouchEnd as EventListener);
        document.removeEventListener('touchcancel', handleTouchEnd as EventListener);
        document.removeEventListener('pointermove', handlePointerMove as EventListener);
        document.removeEventListener('pointerup', handlePointerUp as EventListener);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd, handlePointerMove, handlePointerUp]);

  return {
    isDragging,
    handleStartDrag
  };
};