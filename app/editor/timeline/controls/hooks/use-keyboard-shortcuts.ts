import { useEffect } from 'react';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from '../../../shared/store';

export const useKeyboardShortcuts = () => {
  const snapshot = useSnapshot(editorStore);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          editorActions.togglePlayback();
          break;
          
        case 'Home':
          e.preventDefault();
          editorActions.seekTo(0);
          break;
          
        case 'End':
          e.preventDefault();
          editorActions.seekTo(snapshot.totalDuration);
          break;
          
        case 'ArrowLeft':
          if (e.shiftKey) {
            // Frame step backward
            const frameTime = 1 / snapshot.config.editorFps;
            editorActions.seekTo(Math.max(0, snapshot.playback.currentTime - frameTime));
          } else {
            // Larger step backward
            editorActions.seekTo(Math.max(0, snapshot.playback.currentTime - 1));
          }
          break;
          
        case 'ArrowRight':
          if (e.shiftKey) {
            // Frame step forward
            const frameTime = 1 / snapshot.config.editorFps;
            editorActions.seekTo(Math.min(snapshot.totalDuration, snapshot.playback.currentTime + frameTime));
          } else {
            // Larger step forward
            editorActions.seekTo(Math.min(snapshot.totalDuration, snapshot.playback.currentTime + 1));
          }
          break;
          
        case 'Delete':
        case 'Backspace':
          if (snapshot.selectedClipIds.length > 0) {
            if (confirm(`Delete ${snapshot.selectedClipIds.length} selected clip(s)?`)) {
              snapshot.selectedClipIds.forEach(clipId => {
                editorActions.removeClip(clipId);
              });
              editorActions.clearSelection();
            }
          }
          break;
          
        case 'KeyA':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            // Select all clips
            const allClipIds = snapshot.tracks.flatMap(track => track.clips.map(clip => clip.id));
            editorActions.selectClips(allClipIds);
          }
          break;
          
        case 'Escape':
          editorActions.clearSelection();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [snapshot.playback.currentTime, snapshot.totalDuration, snapshot.config.editorFps, snapshot.selectedClipIds, snapshot.tracks]);
};