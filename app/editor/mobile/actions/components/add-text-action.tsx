import React from 'react';
import ActionButton from './action-button';
import { Type as TypeIcon } from 'lucide-react';
import { editorActions } from '../../../shared/store';

export const AddTextAction: React.FC = () => {
  const handleClick = () => {
    editorActions.addTextClip({
      duration: 15,
    });
  };
  return (
    <ActionButton onClick={handleClick}>
      <TypeIcon size={18} />
      <span className="text-[10px] opacity-80">Add text</span>
    </ActionButton>
  );
};

export default AddTextAction;
