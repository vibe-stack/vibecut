import React, { useMemo, useState } from 'react';
import ActionButton from './action-button';
import { SlidersHorizontal } from 'lucide-react';
import { Drawer } from 'vaul';
import editorStore, { editorActions } from '../../../shared/store';
import { useSnapshot } from 'valtio';

const fonts = ['Inter', 'Roboto', 'SF Pro', 'Arial', 'Georgia'];

export const TextStyleAction: React.FC<{ clipId: string }> = ({ clipId }) => {
  const [open, setOpen] = useState(false);
  const snap = useSnapshot(editorStore);
  const clip = snap.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
  const asset = clip ? snap.assets[clip.assetId] : null;
  if (!clip || !asset || asset.type !== 'text') return null;
  const style = clip.textStyle || snap.config.defaultTextStyle!;

  const [local, setLocal] = useState(style);

  const apply = () => {
    editorActions.setTextStyle(clipId, local);
    setOpen(false);
  };

  const reset = () => {
    editorActions.resetTextStyle(clipId);
    setLocal(snap.config.defaultTextStyle!);
  };

  return (
    <>
      <ActionButton onClick={() => setOpen(true)}>
        <SlidersHorizontal size={18} />
        <span className="text-[10px] opacity-80">Adjust</span>
      </ActionButton>
      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 rounded-t-2xl bg-neutral-900 text-white p-4">
            <div className="mx-auto max-w-md">
              <div className="h-1 w-12 rounded-full bg-white/20 mx-auto mb-3" />
              <div className="flex items-center gap-2 mb-4">
                <div className="text-sm font-medium">Text style</div>
                <button onClick={reset} className="ml-auto text-white/60 hover:text-white/90 text-[11px]">Reset</button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                  <label className="text-[11px] text-white/60">Font</label>
                  <select
                    className="bg-neutral-800 text-white rounded-xl px-2 py-1 text-sm border border-white/10"
                    value={local.fontFamily}
                    onChange={(e) => setLocal({ ...local, fontFamily: e.target.value })}
                  >
                    {fonts.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-[80px_1fr_48px] items-center gap-2">
                  <label className="text-[11px] text-white/60">Size</label>
                  <input
                    type="range"
                    min={0.1}
                    max={1.5}
                    step={0.05}
                    className="w-full accent-white/80"
                    value={local.fontSize}
                    onChange={(e) => setLocal({ ...local, fontSize: parseFloat(e.target.value) })}
                  />
                  <div className="text-[10px] text-white/60 tabular-nums text-right">{local.fontSize.toFixed(2)}</div>
                </div>
                <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                  <label className="text-[11px] text-white/60">Color</label>
                  <input
                    type="color"
                    value={local.color}
                    onChange={(e) => setLocal({ ...local, color: e.target.value })}
                    className="h-8 w-full rounded-xl overflow-hidden bg-neutral-800 border border-white/10"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-[11px] text-white/60">Bold</label>
                  <input type="checkbox" checked={local.bold} onChange={(e) => setLocal({ ...local, bold: e.target.checked })} />
                  <label className="text-[11px] text-white/60 ml-4">Italic</label>
                  <input type="checkbox" checked={local.italic} onChange={(e) => setLocal({ ...local, italic: e.target.checked })} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm rounded-xl bg-white/10">Close</button>
                <button onClick={apply} className="px-3 py-1.5 text-sm rounded-xl bg-white text-black">Apply</button>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
};

export default TextStyleAction;
