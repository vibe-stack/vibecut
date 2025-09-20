import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import ActionButton from './action-button';
import { editorActions } from '../../../shared/store';

export const ToggleClipVisibilityAction: React.FC<{ clipId: string; visible: boolean }> = ({ clipId, visible }) => {
  return (
    <ActionButton onClick={() => editorActions.updateClip(clipId, { visible: !visible })}>
      {visible ? <Eye size={18} /> : <EyeOff size={18} />}
      <span className="text-[10px] opacity-80">{visible ? 'Hide' : 'Show'}</span>
    </ActionButton>
  );
};

export default ToggleClipVisibilityAction;
