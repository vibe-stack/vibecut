import { useCallback, useRef, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from '../../../shared/store';

export const useScrubber = () => {
  const snapshot = useSnapshot(editorStore);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrubberRef.current) return;
    
    isDraggingRef.current = true;
    const rect = scrubberRef.current.getBoundingClientRect();
    const progress = (e.clientX - rect.left) / rect.width;
    const time = progress * snapshot.totalDuration;
    editorActions.seekTo(Math.max(0, Math.min(time, snapshot.totalDuration)));
  }, [snapshot.totalDuration]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current || !scrubberRef.current) return;
    
    const rect = scrubberRef.current.getBoundingClientRect();
    const progress = (e.clientX - rect.left) / rect.width;
    const time = progress * snapshot.totalDuration;
    editorActions.seekTo(Math.max(0, Math.min(time, snapshot.totalDuration)));
  }, [snapshot.totalDuration]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Add global mouse events for dragging
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const progress = snapshot.totalDuration > 0 
    ? (snapshot.playback.currentTime / snapshot.totalDuration) * 100 
    : 0;

  return {
    snapshot,
    scrubberRef,
    handleMouseDown,
    progress
  };
};