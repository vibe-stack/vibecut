import React, { useMemo, useState } from 'react';
import ActionButton from '../action-button';
import { Sparkles } from 'lucide-react';
import { Drawer } from 'vaul';
import editorStore, { editorActions } from '../../../../shared/store';
import { useSnapshot } from 'valtio';

// Arbitrary categories and items; keys are not hardcoded in types.
const CATEGORIES: { name: string; items: { key: string; label: string }[] }[] = [
  { name: 'Basic', items: [
    { key: 'fade-in', label: 'Fade In' },
    { key: 'fade-out', label: 'Fade Out' },
  ]},
  { name: 'Title', items: [
    { key: 'slide-up', label: 'Slide Up' },
    { key: 'pop-bounce', label: 'Pop Bounce' },
  ]},
  { name: 'Vlog', items: [
    { key: 'pop-bounce', label: 'Pop Bounce' },
  ]},
  { name: 'Retro', items: [
    { key: 'glitch', label: 'Glitch' },
  ]},
];

export const TextAnimationsAction: React.FC<{ clipId: string }> = ({ clipId }) => {
  const [open, setOpen] = useState(false);
  const snap = useSnapshot(editorStore);
  const clip = snap.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
  const asset = clip ? snap.assets[clip.assetId] : null;
  if (!clip || !asset || asset.type !== 'text') return null;

  const active = clip.textAnimations || [];

  const toggle = (key: string) => {
    const exists = active.find(a => a.key === key);
    if (exists) {
      editorActions.removeTextAnimation(clipId, key);
    } else {
      editorActions.addTextAnimation(clipId, { key, enabled: true });
    }
  };

  const setEnabled = (key: string, enabled: boolean) => {
    editorActions.updateTextAnimation(clipId, key, { enabled });
  };

  const setSetting = (key: string, patch: Record<string, any>) => {
    editorActions.updateTextAnimation(clipId, key, { settings: patch });
  };

  return (
    <>
      <ActionButton onClick={() => setOpen(true)}>
        <Sparkles size={18} />
        <span className="text-[10px] opacity-80">Animate</span>
      </ActionButton>
      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 rounded-t-2xl bg-neutral-900 text-white p-4">
            <div className="mx-auto max-w-md">
              <div className="h-1 w-12 rounded-full bg-white/20 mx-auto mb-3" />
              <div className="flex items-center gap-2 mb-3">
                <div className="text-sm font-medium">Text animations</div>
              </div>

              <div className="space-y-5 max-h-[50vh] overflow-y-auto pr-1">
                {CATEGORIES.map(cat => (
                  <div key={cat.name}>
                    <div className="text-xs text-white/60 mb-2">{cat.name}</div>
                    <div className="grid grid-cols-3 gap-2">
                      {cat.items.map(item => {
                        const isOn = !!active.find(a => a.key === item.key);
                        return (
                          <button
                            key={item.key}
                            onClick={() => toggle(item.key)}
                            className={`rounded-2xl border px-3 py-2 text-xs text-left transition-colors ${isOn ? 'border-white/30 bg-white/10' : 'border-white/10 bg-white/5'}`}
                          >
                            <div className="font-medium">{item.label}</div>
                            <div className="text-[10px] text-white/50">{item.key}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {active.length > 0 && (
                <div className="mt-4 border-t border-white/10 pt-3">
                  <div className="text-xs text-white/60 mb-2">Settings</div>
                  <div className="space-y-3">
                    {active.map((a) => (
                      <div key={a.key} className="rounded-xl bg-white/5 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-sm font-medium">{a.key}</div>
                          <div className="ml-auto text-[11px] text-white/60">Enabled</div>
                          <input type="checkbox" checked={a.enabled} onChange={(e) => setEnabled(a.key, e.target.checked)} />
                        </div>
                        {a.key === 'fade-in' && (
                          <div className="grid grid-cols-[80px_1fr_48px] items-center gap-2">
                            <label className="text-[11px] text-white/60">Portion</label>
                            <input
                              type="range"
                              min={0.05}
                              max={0.8}
                              step={0.05}
                              className="w-full accent-white/80"
                              value={(a.settings?.portion ?? 0.2)}
                              onChange={(e) => setSetting(a.key, { portion: parseFloat(e.target.value) })}
                            />
                            <div className="text-[10px] text-white/60 tabular-nums text-right">{(a.settings?.portion ?? 0.2).toFixed(2)}</div>
                          </div>
                        )}
                        {a.key === 'fade-out' && (
                          <div className="grid grid-cols-[80px_1fr_48px] items-center gap-2">
                            <label className="text-[11px] text-white/60">Portion</label>
                            <input
                              type="range"
                              min={0.05}
                              max={0.8}
                              step={0.05}
                              className="w-full accent-white/80"
                              value={(a.settings?.portion ?? 0.2)}
                              onChange={(e) => setSetting(a.key, { portion: parseFloat(e.target.value) })}
                            />
                            <div className="text-[10px] text-white/60 tabular-nums text-right">{(a.settings?.portion ?? 0.2).toFixed(2)}</div>
                          </div>
                        )}
                        {a.key === 'slide-up' && (
                          <>
                            <div className="grid grid-cols-[80px_1fr_48px] items-center gap-2">
                              <label className="text-[11px] text-white/60">Portion</label>
                              <input
                                type="range"
                                min={0.1}
                                max={0.8}
                                step={0.05}
                                className="w-full accent-white/80"
                                value={(a.settings?.portion ?? 0.3)}
                                onChange={(e) => setSetting(a.key, { portion: parseFloat(e.target.value) })}
                              />
                              <div className="text-[10px] text-white/60 tabular-nums text-right">{(a.settings?.portion ?? 0.3).toFixed(2)}</div>
                            </div>
                            <div className="grid grid-cols-[80px_1fr_48px] items-center gap-2">
                              <label className="text-[11px] text-white/60">Distance</label>
                              <input
                                type="range"
                                min={0.1}
                                max={2}
                                step={0.05}
                                className="w-full accent-white/80"
                                value={(a.settings?.distance ?? 0.5)}
                                onChange={(e) => setSetting(a.key, { distance: parseFloat(e.target.value) })}
                              />
                              <div className="text-[10px] text-white/60 tabular-nums text-right">{(a.settings?.distance ?? 0.5).toFixed(2)}</div>
                            </div>
                          </>
                        )}
                        {a.key === 'pop-bounce' && (
                          <div className="grid grid-cols-[80px_1fr_48px] items-center gap-2">
                            <label className="text-[11px] text-white/60">Portion</label>
                            <input
                              type="range"
                              min={0.1}
                              max={0.6}
                              step={0.05}
                              className="w-full accent-white/80"
                              value={(a.settings?.portion ?? 0.25)}
                              onChange={(e) => setSetting(a.key, { portion: parseFloat(e.target.value) })}
                            />
                            <div className="text-[10px] text-white/60 tabular-nums text-right">{(a.settings?.portion ?? 0.25).toFixed(2)}</div>
                          </div>
                        )}
                        {a.key === 'glitch' && (
                          <div className="grid grid-cols-[80px_1fr_48px] items-center gap-2">
                            <label className="text-[11px] text-white/60">Strength</label>
                            <input
                              type="range"
                              min={0}
                              max={0.1}
                              step={0.005}
                              className="w-full accent-white/80"
                              value={(a.settings?.strength ?? 0.03)}
                              onChange={(e) => setSetting(a.key, { strength: parseFloat(e.target.value) })}
                            />
                            <div className="text-[10px] text-white/60 tabular-nums text-right">{(a.settings?.strength ?? 0.03).toFixed(3)}</div>
                          </div>
                        )}
                        {/* Additional animation settings UIs can be added per key */}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm rounded-xl bg-white/10">Close</button>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
};

export default TextAnimationsAction;
