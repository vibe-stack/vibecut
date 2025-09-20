import React from 'react';
import { Trash2 } from 'lucide-react';
import ActionButton from './action-button';
import { editorActions } from '../../../shared/store';

export const RemoveClipAction: React.FC<{ clipId: string }> = ({ clipId }) => {
  return (
    <ActionButton onClick={() => editorActions.removeClip(clipId)} className="bg-red-500/20 text-red-300 active:bg-red-500/30">
      <Trash2 size={18} />
      <span className="text-[10px] opacity-80">Remove</span>
    </ActionButton>
  );
};

export default RemoveClipAction;
