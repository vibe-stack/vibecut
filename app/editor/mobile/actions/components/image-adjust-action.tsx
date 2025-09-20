import React, { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Drawer } from 'vaul';
import ActionButton from './action-button';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from '../../../shared/store';

export const ImageAdjustAction: React.FC<{ clipId: string }> = ({ clipId }) => {
  const [open, setOpen] = useState(false);
  const snap = useSnapshot(editorStore);
  const clip = snap.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
  const asset = clip ? snap.assets[clip.assetId] : null;
  if (!clip || !asset || asset.type !== 'image') return null;

  const adj = clip.imageAdjustments || {
    brightness: 0, contrast: 0, saturation: 0, sharpen: 0,
    highlights: 0, shadows: 0, temperature: 0, hue: 0, vignette: 0,
  };

  const set = (k: keyof typeof adj, v: number) => editorActions.setImageAdjustments(clipId, { [k]: v } as any);
  const reset = () => editorActions.setImageAdjustments(clipId, {
    brightness: 0, contrast: 0, saturation: 0, sharpen: 0,
    highlights: 0, shadows: 0, temperature: 0, hue: 0, vignette: 0,
  });

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
                <div className="text-sm font-medium">Image adjustments</div>
                <button onClick={reset} className="ml-auto text-white/60 hover:text-white/90 text-[11px]">Reset</button>
              </div>
              <div className="space-y-2">
                {([
                  ['Brightness','brightness',-1,1,0.01],
                  ['Contrast','contrast',-1,1,0.01],
                  ['Saturation','saturation',-1,1,0.01],
                  ['Sharpen','sharpen',0,1,0.01],
                  ['Highlights','highlights',-1,1,0.01],
                  ['Shadows','shadows',-1,1,0.01],
                  ['Temperature','temperature',-1,1,0.01],
                  ['Hue','hue',-1,1,0.01],
                  ['Vignette','vignette',0,1,0.01],
                ] as const).map(([label, key, min, max, step]) => (
                  <div key={key} className="grid grid-cols-[80px_1fr_48px] items-center gap-2">
                    <label className="text-[11px] text-white/60">{label}</label>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      className="w-full accent-white/80"
                      value={(adj as any)[key]}
                      onChange={(e) => set(key as any, parseFloat(e.target.value))}
                    />
                    <div className="text-[10px] text-white/60 tabular-nums text-right">{(adj as any)[key].toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
};

export default ImageAdjustAction;
