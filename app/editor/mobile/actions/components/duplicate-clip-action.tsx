import React from 'react';
import { Copy } from 'lucide-react';
import ActionButton from './action-button';
import { editorActions } from '../../../shared/store';
import { useScrollIntoView } from '../../../timeline/hooks/use-scroll-into-view';

export const DuplicateClipAction: React.FC<{ clipId: string }> = ({ clipId }) => {
  const { scrollIntoView } = useScrollIntoView();

  const handleDuplicate = () => {
    const id = editorActions.duplicateClip(clipId);
    if (id) {
      requestAnimationFrame(() => scrollIntoView(`[data-clip-id="${id}"]`));
    }
  };

  return (
    <ActionButton onClick={handleDuplicate}>
      <Copy size={18} />
      <span className="text-[10px] opacity-80">Duplicate</span>
    </ActionButton>
  );
};

export default DuplicateClipAction;
