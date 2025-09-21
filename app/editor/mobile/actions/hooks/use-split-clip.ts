import { editorActions } from '../../../shared/store';
import { useScrollIntoView } from '../../../timeline/hooks/use-scroll-into-view';

/**
 * Hook to split a clip at the current playhead and scroll to the new piece
 */
export const useSplitClip = () => {
  const { scrollIntoView } = useScrollIntoView();

  const split = (clipId: string, atTime?: number) => {
    const id = editorActions.splitClipAt(clipId, atTime);
    if (id) {
      requestAnimationFrame(() => scrollIntoView(`[data-clip-id="${id}"]`));
    }
    return id;
  };

  return { split };
};

export default useSplitClip;
