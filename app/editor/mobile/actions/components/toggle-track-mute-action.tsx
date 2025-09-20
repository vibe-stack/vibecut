import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import ActionButton from './action-button';
import { editorActions } from '../../../shared/store';

export const ToggleTrackMuteAction: React.FC<{ trackId: string; muted: boolean }> = ({ trackId, muted }) => {
  return (
    <ActionButton onClick={() => editorActions.updateTrack(trackId, { muted: !muted })}>
      {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      <span className="text-[10px] opacity-80">{muted ? 'Unmute' : 'Mute'}</span>
    </ActionButton>
  );
};

export default ToggleTrackMuteAction;
