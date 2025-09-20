import React, { useState } from 'react';
import ActionButton from './action-button';
import { Pencil } from 'lucide-react';
import { Drawer } from 'vaul';
import editorStore, { editorActions } from '../../../shared/store';
import { useSnapshot } from 'valtio';

export const ChangeTextAction: React.FC<{ clipId: string }> = ({ clipId }) => {
  const [open, setOpen] = useState(false);
  const snap = useSnapshot(editorStore);
  const clip = snap.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
  const asset = clip ? snap.assets[clip.assetId] : null;
  if (!clip || !asset || asset.type !== 'text') return null;

  const [value, setValue] = useState(clip.textContent || 'Text');

  const save = () => {
    editorActions.setTextContent(clipId, value);
    setOpen(false);
  };

  return (
    <>
      <ActionButton onClick={() => setOpen(true)}>
        <Pencil size={18} />
        <span className="text-[10px] opacity-80">Change</span>
      </ActionButton>
      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 rounded-t-2xl bg-neutral-900 text-white p-4">
            <div className="mx-auto max-w-md">
              <div className="h-1 w-12 rounded-full bg-white/20 mx-auto mb-3" />
              <div className="text-sm font-medium mb-2">Edit text</div>
              <textarea
                className="w-full h-28 bg-neutral-800 text-white rounded-xl p-3 text-sm outline-none border border-white/10 focus:border-white/20"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm rounded-xl bg-white/10">Cancel</button>
                <button onClick={save} className="px-3 py-1.5 text-sm rounded-xl bg-white text-black">Save</button>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
};

export default ChangeTextAction;
