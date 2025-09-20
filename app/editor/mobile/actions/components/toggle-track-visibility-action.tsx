import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import ActionButton from './action-button';
import { editorActions } from '../../../shared/store';

export const ToggleTrackVisibilityAction: React.FC<{ trackId: string; visible: boolean }> = ({ trackId, visible }) => {
  return (
    <ActionButton onClick={() => editorActions.updateTrack(trackId, { visible: !visible })}>
      {visible ? <Eye size={18} /> : <EyeOff size={18} />}
      <span className="text-[10px] opacity-80">{visible ? 'Hide' : 'Show'}</span>
    </ActionButton>
  );
};

export default ToggleTrackVisibilityAction;
