import React, { useState } from 'react';
import { Gauge } from 'lucide-react';
import { Drawer } from 'vaul';
import ActionButton from './action-button';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from '../../../shared/store';

export const AVSpeedAction: React.FC<{ clipId: string }> = ({ clipId }) => {
  const [open, setOpen] = useState(false);
  const snap = useSnapshot(editorStore);
  const clip = snap.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
  const asset = clip ? snap.assets[clip.assetId] : null;
  if (!clip || !asset || (asset.type !== 'video' && asset.type !== 'audio')) return null;

  const speed = clip.speed ?? 1;
  const setValue = (v: number) => editorActions.setClipSpeed(clipId, Math.max(0.1, Math.min(4, v)));
  const reset = () => editorActions.setClipSpeed(clipId, 1);

  return (
    <>
      <ActionButton onClick={() => setOpen(true)}>
        <Gauge size={18} />
        <span className="text-[10px] opacity-80">Speed</span>
      </ActionButton>
      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 rounded-t-2xl bg-neutral-900 text-white p-4">
            <div className="mx-auto max-w-md">
              <div className="h-1 w-12 rounded-full bg-white/20 mx-auto mb-3" />
              <div className="flex items-center gap-2 mb-4">
                <div className="text-sm font-medium">Clip speed</div>
                {Math.abs((speed || 1) - 1) > 0.001 && (
                  <button onClick={reset} className="ml-auto text-white/60 hover:text-white/90 text-[11px]">Reset</button>
                )}
              </div>
              <div className="grid grid-cols-[80px_1fr_48px] items-center gap-2">
                <label className="text-[11px] text-white/60">Rate</label>
                <input
                  type="range"
                  min={0.1}
                  max={4}
                  step={0.05}
                  value={speed}
                  onChange={(e) => setValue(parseFloat(e.target.value))}
                  className="w-full accent-white/80"
                />
                <div className="text-[10px] text-white/60 tabular-nums text-right">{speed.toFixed(2)}×</div>
              </div>
              <div className="mt-2 text-[11px] text-white/50">Changes this clip's duration. For audio, pitch is not corrected.</div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
};

export default AVSpeedAction;
