import React, { useMemo, useState } from 'react';
import { Drawer } from 'vaul';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from '../../shared/store';
import { COMMON_ASPECTS, PRESET_BACKGROUNDS, DIMENSION_PRESETS, FPS_PRESETS, parseAspect } from '../../viewport/hooks/use-composition';

interface Props {
  children: React.ReactNode; // trigger button
}

export const CompositionSettingsDrawer: React.FC<Props> = ({ children }) => {
  const snap = useSnapshot(editorStore);
  const [open, setOpen] = useState(false);

  const aspectStr = `${snap.composition.aspectW}:${snap.composition.aspectH}`;

  const handleAspectChange = (val: string) => {
    const parsed = parseAspect(val);
    if (parsed) {
      editorActions.setAspectRatio(parsed.w, parsed.h);
    }
  };

  const handlePresetAspect = (val: string) => {
    const parsed = parseAspect(val);
    if (parsed) editorActions.setAspectRatio(parsed.w, parsed.h);
  };

  const handleFpsChange = (val: string) => {
    const num = parseInt(val, 10);
    if (!Number.isNaN(num)) editorActions.setBaseFps(num);
  };

  const bgSwatches = useMemo(() => PRESET_BACKGROUNDS, []);

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        {children}
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 rounded-t-2xl bg-neutral-950 text-white p-4 border-t border-white/10">
          <div className="mx-auto max-w-md">
            <div className="h-1.5 w-10 rounded-full bg-white/15 mx-auto mb-4" />
            <div className="space-y-5">
              <div>
                <div className="text-sm font-medium mb-2 opacity-80">Aspect ratio</div>
                <div className="flex items-center gap-2">
                  <input
                    aria-label="Aspect ratio"
                    defaultValue={aspectStr}
                    onBlur={(e) => handleAspectChange(e.currentTarget.value)}
                    placeholder="16:9"
                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
                <div className="mt-2">
                  <select
                    aria-label="Aspect presets"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10"
                    onChange={(e) => handlePresetAspect(e.currentTarget.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>Common aspect presets</option>
                    {COMMON_ASPECTS.map(a => (
                      <option key={a.label} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2 opacity-80">Dimensions</div>
                <div className="flex items-center gap-2">
                  <select
                    aria-label="Dimension presets"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10"
                    defaultValue=""
                    onChange={(e) => {
                      const preset = DIMENSION_PRESETS.find(p => p.label === e.currentTarget.value);
                      if (preset) {
                        editorActions.setExportDimensions(preset.width, preset.height);
                      }
                    }}
                  >
                    <option value="" disabled>Select dimensions preset</option>
                    {DIMENSION_PRESETS.map(p => (
                      <option key={p.label} value={p.label}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-2 text-xs opacity-70">Current: {snap.exportSettings.width}×{snap.exportSettings.height}</div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2 opacity-80">Base FPS</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    step={1}
                    value={snap.composition.fps}
                    onChange={(e) => handleFpsChange(e.currentTarget.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                  <select
                    aria-label="FPS presets"
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10"
                    defaultValue=""
                    onChange={(e) => {
                      const val = parseFloat(e.currentTarget.value);
                      if (!Number.isNaN(val)) editorActions.setBaseFps(val);
                    }}
                  >
                    <option value="" disabled>Preset</option>
                    {FPS_PRESETS.map(f => (
                      <option key={f} value={String(f)}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2 opacity-80">Canvas background</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {bgSwatches.map(s => (
                    <button
                      key={s.hex}
                      aria-label={s.label}
                      className="w-9 h-9 rounded-xl border border-white/10 outline-none focus:ring-2 focus:ring-white/20"
                      style={{ background: s.hex }}
                      onClick={() => editorActions.setCompositionBackground(s.hex)}
                    />
                  ))}
                  <label className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 inline-flex items-center justify-center">
                    <input
                      type="color"
                      aria-label="Custom background color"
                      value={snap.composition.background}
                      onChange={(e) => editorActions.setCompositionBackground(e.currentTarget.value)}
                      className="opacity-0 w-0 h-0"
                    />
                    <div className="w-4 h-4 rounded" style={{ background: snap.composition.background }} />
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-6 text-right">
              <button
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20"
                onClick={() => setOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
