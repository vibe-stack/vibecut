import React, { useMemo } from 'react';
import { useSnapshot } from 'valtio';
import editorStore from '../shared/store';
import GeneralActions from './actions/categories/general-actions';
import TrackActions from './actions/categories/track-actions';
import ClipActions from './actions/categories/clip-actions';

export const ActionsArea: React.FC = () => {
  const snap = useSnapshot(editorStore);
  const selectedTrack = useMemo(
    () => snap.tracks.find(t => snap.selectedTrackIds.includes(t.id)),
    [snap.selectedTrackIds, snap.tracks]
  );
  const selectedClipId = snap.selectedClipIds[0];

  if (!selectedTrack && !selectedClipId) return <GeneralActions />;
  if (selectedTrack && !selectedClipId) return <TrackActions trackId={selectedTrack.id} />;
  if (selectedClipId) return <ClipActions clipId={selectedClipId} />;
  return null;
};

export default ActionsArea;
