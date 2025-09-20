import { useCallback } from 'react';
import { editorActions } from '../../shared/store';

export const useTimelineSelection = () => {
  const handleSelectClip = useCallback((clipId: string, append: boolean) => {
    editorActions.selectClips([clipId], append);
  }, []);

  return {
    handleSelectClip
  };
};