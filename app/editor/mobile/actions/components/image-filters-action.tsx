import React, { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { Drawer } from 'vaul';
import ActionButton from './action-button';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from '../../../shared/store';

const PRESETS: { id: any; name: string }[] = [
  { id: 'none', name: 'None' },
  { id: 'mono', name: 'Mono' },
  { id: 'sepia', name: 'Sepia' },
  { id: 'film', name: 'Film' },
  { id: 'vintage', name: 'Vintage' },
  { id: 'cool', name: 'Cool' },
  { id: 'warm', name: 'Warm' },
  { id: 'pop', name: 'Pop' },
  { id: 'fade', name: 'Fade' },
  { id: 'dramatic', name: 'Dramatic' },
];

export const ImageFiltersAction: React.FC<{ clipId: string }> = ({ clipId }) => {
  const [open, setOpen] = useState(false);
  const snap = useSnapshot(editorStore);
  const clip = snap.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
  const asset = clip ? snap.assets[clip.assetId] : null;
  if (!clip || !asset || asset.type !== 'image') return null;

  const current = clip.imageFilterPreset || 'none';

  return (
    <>
      <ActionButton onClick={() => setOpen(true)}>
        <Wand2 size={18} />
        <span className="text-[10px] opacity-80">Filters</span>
      </ActionButton>
      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 rounded-t-2xl bg-neutral-900 text-white p-4">
            <div className="mx-auto max-w-md">
              <div className="h-1 w-12 rounded-full bg-white/20 mx-auto mb-3" />
              <div className="flex items-center gap-2 mb-4">
                <div className="text-sm font-medium">Image filters</div>
                {current !== 'none' && (
                  <button
                    onClick={() => editorActions.setImageFilterPreset(clipId, 'none')}
                    className="ml-auto text-white/60 hover:text-white/90 text-[11px]"
                  >Clear</button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => editorActions.setImageFilterPreset(clipId, p.id)}
                    className={`px-2 py-2 rounded-lg text-[11px] border transition-colors ${
                      current === p.id ? 'bg-white/20 border-white/30' : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >{p.name}</button>
                ))}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
};

export default ImageFiltersAction;
