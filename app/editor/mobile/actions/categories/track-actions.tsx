import React from 'react';
import ActionsRow from '../actions-row';
import AddVideoAction from '../components/add-video-action';
import AddTrackAction from '../components/add-track-action';
import ToggleTrackVisibilityAction from '../components/toggle-track-visibility-action';
import ToggleTrackMuteAction from '../components/toggle-track-mute-action';
import TrackVolumeAction from '../components/track-volume-action';
import RemoveTrackAction from '../components/remove-track-action';
import { useSnapshot } from 'valtio';
import editorStore from '../../../shared/store';
import AddTextAction from '../components/add-text-action';

export const TrackActions: React.FC<{ trackId: string }> = ({ trackId }) => {
  const snap = useSnapshot(editorStore);
  const track = snap.tracks.find(t => t.id === trackId);
  if (!track) return null;

  return (
    <div className="px-3 pb-3 pt-1">
      <ActionsRow>
        <AddVideoAction />
        <AddTextAction />
        <AddTrackAction />
        <ToggleTrackVisibilityAction trackId={track.id} visible={track.visible} />
        <ToggleTrackMuteAction trackId={track.id} muted={track.muted} />
        <TrackVolumeAction trackId={track.id} volume={track.volume} />
        <RemoveTrackAction trackId={track.id} />
      </ActionsRow>
    </div>
  );
};

export default TrackActions;
