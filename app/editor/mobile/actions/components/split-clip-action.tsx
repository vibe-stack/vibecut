import React from 'react';
import { Scissors } from 'lucide-react';
import ActionButton from './action-button';
import { useSplitClip } from '../hooks/use-split-clip';

export const SplitClipAction: React.FC<{ clipId: string }> = ({ clipId }) => {
  const { split } = useSplitClip();

  return (
    <ActionButton onClick={() => split(clipId)} aria-label="Split clip">
      <Scissors size={18} />
      <span className="text-[10px] opacity-80">Split</span>
    </ActionButton>
  );
};

export default SplitClipAction;
