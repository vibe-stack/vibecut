import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import ActionButton from './action-button';
import { editorActions } from '../../../shared/store';

export const ToggleClipMuteAction: React.FC<{ clipId: string; muted: boolean }> = ({ clipId, muted }) => {
  return (
    <ActionButton onClick={() => editorActions.updateClip(clipId, { muted: !muted })}>
      {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      <span className="text-[10px] opacity-80">{muted ? 'Unmute' : 'Mute'}</span>
    </ActionButton>
  );
};

export default ToggleClipMuteAction;
