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
        let newTrimStart = Math.max(0, isDragging.originalClip.trimStart + deltaTime);
        const maxTrimStart = isDragging.originalClip.trimEnd || 
          (snapshot.assets[isDragging.originalClip.assetId]?.duration || 0);
        // Clamp to avoid overlapping left neighbor on the same track
        const track = snapshot.tracks.find(t => t.clips.some(c => c.id === isDragging.clipId));
        if (track) {
          const proposedStart = isDragging.originalClip.start + deltaTime;
          const clampedStart = clampTrimStartToLeft(track as any, isDragging.originalClip as any, proposedStart);
          // also reflect the corresponding trimStart shift
          const appliedDelta = clampedStart - isDragging.originalClip.start;
          newTrimStart = Math.max(0, isDragging.originalClip.trimStart + appliedDelta);
          if (newTrimStart < maxTrimStart) {
            editorActions.updateClip(isDragging.clipId, {
              trimStart: newTrimStart,
              start: clampedStart,
            });
          }
        }
        break;
        
      case 'trim-end':
        const asset = snapshot.assets[isDragging.originalClip.assetId];
        const maxDuration = asset?.duration || 0;
        let newTrimEnd = Math.min(maxDuration, 
          (isDragging.originalClip.trimEnd || maxDuration) + deltaTime);
        // Clamp to avoid overlapping right neighbor on the same track
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

  return {
    isDragging,
    handleStartDrag
  };
};