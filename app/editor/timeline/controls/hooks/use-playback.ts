import { useCallback } from 'react';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from '../../../shared/store';

export const usePlayback = () => {
  const snapshot = useSnapshot(editorStore);
  
  const handlePlayPause = useCallback(() => {
    editorActions.togglePlayback();
  }, []);

  const handleStop = useCallback(() => {
    editorActions.setPlaying(false);
    editorActions.seekTo(0);
  }, []);

  const handleSpeedChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    editorActions.setPlaybackRate(parseFloat(e.target.value));
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return {
    snapshot,
    handlePlayPause,
    handleStop,
    handleSpeedChange,
    formatTime
  };
};