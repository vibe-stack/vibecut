import React, { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Drawer } from 'vaul';
import ActionButton from './action-button';
import { editorActions } from '../../../shared/store';

export const ClipOpacityAction: React.FC<{ clipId: string; opacity: number }> = ({ clipId, opacity }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ActionButton onClick={() => setOpen(true)}>
        <SlidersHorizontal size={18} />
        <span className="text-[10px] opacity-80">Opacity</span>
      </ActionButton>
      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 rounded-t-2xl bg-neutral-900 text-white p-4">
            <div className="mx-auto max-w-md">
              <div className="h-1 w-12 rounded-full bg-white/20 mx-auto mb-3" />
              <div className="text-sm font-medium mb-4">Clip opacity</div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                className="w-full"
                value={opacity}
                onChange={(e) => editorActions.updateClip(clipId, { opacity: parseFloat(e.target.value) })}
              />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
};

export default ClipOpacityAction;
