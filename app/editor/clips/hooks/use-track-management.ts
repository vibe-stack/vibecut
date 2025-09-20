import { useCallback } from 'react';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from '../../shared/store';

export const useTrackManagement = () => {
  const snapshot = useSnapshot(editorStore);

  const handleAddTrack = useCallback(() => {
    editorActions.addTrack();
  }, []);

  const handleDeleteTrack = useCallback((trackId: string) => {
    if (snapshot.tracks.length <= 1) {
      alert('Cannot delete the last track');
      return;
    }
    
    if (confirm('Are you sure you want to delete this track and all its clips?')) {
      editorActions.removeTrack(trackId);
    }
  }, [snapshot.tracks.length]);

  const handleToggleTrackVisibility = useCallback((trackId: string) => {
    const track = snapshot.tracks.find(t => t.id === trackId);
    if (track) {
      editorActions.updateTrack(trackId, { visible: !track.visible });
    }
  }, [snapshot.tracks]);

  const handleToggleTrackMute = useCallback((trackId: string) => {
    const track = snapshot.tracks.find(t => t.id === trackId);
    if (track) {
      editorActions.updateTrack(trackId, { muted: !track.muted });
    }
  }, [snapshot.tracks]);

  const handleTrackVolumeChange = useCallback((trackId: string, volume: number) => {
    editorActions.updateTrack(trackId, { volume });
  }, []);

  return {
    snapshot,
    handleAddTrack,
    handleDeleteTrack,
    handleToggleTrackVisibility,
    handleToggleTrackMute,
    handleTrackVolumeChange
  };
};