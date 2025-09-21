import React, { useMemo, useState } from 'react';
import { Drawer } from 'vaul';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from '../../shared/store';
import { DIMENSION_PRESETS, FPS_PRESETS } from '../../viewport/hooks/use-composition';
import { useExport } from '../../viewport/hooks/use-export';
import exportStore, { exportActions } from '../../shared/export-store';
import ExportToast from './export-toast';
import { Slider } from '@base-ui-components/react/slider';
import { resolutionFromBase } from '../../shared/export-utils';

interface Props { children: React.ReactNode }

export const ExportSettingsDrawer: React.FC<Props> = ({ children }) => {
  const snap = useSnapshot(editorStore);
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<'mp4' | 'webm' | 'mov'>('mp4');
  const [bitrate, setBitrate] = useState<number>(8000);
  const [quality, setQuality] = useState<number>(Math.round((snap.exportSettings.quality ?? 0.9) * 100));
  const [fps, setFps] = useState<number>(snap.exportSettings.fps || snap.composition.fps || 30);
  // Discrete resolution choices
  const RES_OPTIONS = [720, 1080, 1440, 2160] as const;
  // Use vertical base for landscape/square (height) and width for portrait
  const [resIndex, setResIndex] = useState<number>(() => {
    const ar = snap.composition.aspectW / snap.composition.aspectH;
    const base = ar >= 1 ? snap.exportSettings.height : snap.exportSettings.width;
    let best = 0;
    let bestDiff = Infinity;
    RES_OPTIONS.forEach((v, i) => {
      const d = Math.abs(v - base);
      if (d < bestDiff) { best = i; bestDiff = d; }
    });
    return best;
  });
  const [isExporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const exportSnap = useSnapshot(exportStore);
  const { exportVideo } = useExport();

  // Poll progress from MediaBunny if available
  React.useEffect(() => {
    if (!isExporting) return;
    const iv = setInterval(() => {
      const p = (window as any).__exportProgress;
      if (typeof p === 'number') {
        setProgress(Math.max(0, Math.min(1, p)));
        exportActions.setProgress(p);
      }
    }, 120);
    return () => clearInterval(iv);
  }, [isExporting]);

  const startExport = async () => {
    setExporting(true);
    setProgress(0);
    try {
      exportActions.start('Exporting…');
      // Close the drawer while exporting
      setOpen(false);

  const base = RES_OPTIONS[resIndex] ?? 1080;
  const { width, height } = resolutionFromBase(base, snap.composition.aspectW, snap.composition.aspectH);

      const url = await exportVideo({
        width,
        height,
        fps,
        bitrate,
        quality: quality / 100,
        format,
      });
      if (typeof url === 'string') {
        const ext = format === 'webm' ? 'webm' : 'mp4';
        const a = document.createElement('a');
        a.href = url;
        a.download = `${snap.projectName || 'export'}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        exportActions.complete(url);
      }
    } catch (e) {
      console.error('Export failed', e);
      exportActions.fail(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>{children}</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 rounded-t-2xl bg-neutral-950 text-white p-4 border-t border-white/10">
          <div className="mx-auto max-w-md">
            <div className="h-1.5 w-10 rounded-full bg-white/15 mx-auto mb-4" />
            <div className="space-y-5">
              <div>
                <div className="text-sm font-medium mb-2 opacity-80">Format</div>
                <div className="flex items-center gap-2">
                  <select className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10" value={format} onChange={(e)=>setFormat(e.currentTarget.value as any)}>
                    <option value="mp4">MP4 (H.264)</option>
                    <option value="webm">WebM (VP9)</option>
                    <option value="mov">MOV (H.264)</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium opacity-80">Resolution</div>
                  <div className="text-xs opacity-60">{snap.exportSettings.width}×{snap.exportSettings.height}</div>
                </div>
                <div className="py-2" data-vaul-no-drag>
                  <Slider.Root
                    min={0}
                    max={RES_OPTIONS.length - 1}
                    step={1}
                    value={[resIndex]}
                    onValueChange={(vals: number[]) => {
                      const idx = Math.round(vals[0]);
                      setResIndex(idx);
                      const base = RES_OPTIONS[idx] ?? 1080;
                      const { width, height } = resolutionFromBase(base, snap.composition.aspectW, snap.composition.aspectH);
                      editorActions.setExportDimensions(width, height);
                    }}
                    className="w-full"
                  >
                    <Slider.Control className="relative h-6">
                      <Slider.Track className="h-1.5 bg-white/10 rounded-full">
                        <Slider.Indicator className="h-full bg-white/60 rounded-full" />
                        <Slider.Thumb className="-mt-1.5 h-4 w-4 rounded-full bg-white shadow" />
                      </Slider.Track>
                    </Slider.Control>
                  </Slider.Root>
                  <div className="mt-2 flex justify-between text-[11px] text-white/60">
                    <span>720p</span>
                    <span>1080p</span>
                    <span>1440p</span>
                    <span>2160p</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2 opacity-80">Framerate</div>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} max={120} step={1} value={fps} onChange={(e)=>setFps(parseInt(e.currentTarget.value||'0',10)||fps)} className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20" />
                  <select className="px-3 py-2 rounded-xl bg-white/5 border border-white/10" defaultValue="" onChange={(e)=>{ const v=parseFloat(e.currentTarget.value); if(!Number.isNaN(v)) setFps(v as number); }}>
                    <option value="" disabled>Preset</option>
                    {FPS_PRESETS.map(f => (<option key={f} value={String(f)}>{f}</option>))}
                  </select>
                </div>
              </div>
              <div data-vaul-no-drag>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium opacity-80">Bitrate</div>
                  <div className="text-xs opacity-60">{bitrate.toLocaleString()} kbps</div>
                </div>
                <Slider.Root
                  min={1000}
                  max={50000}
                  step={500}
                  value={[bitrate]}
                  onValueChange={(vals: number[]) => setBitrate(Math.round(vals[0]))}
                  className="w-full py-2"
                >
                  <Slider.Control className="relative h-6">
                    <Slider.Track className="h-1.5 bg-white/10 rounded-full">
                      <Slider.Indicator className="h-full bg-white/60 rounded-full" />
                      <Slider.Thumb className="-mt-1.5 h-4 w-4 rounded-full bg-white shadow" />
                    </Slider.Track>
                  </Slider.Control>
                </Slider.Root>
                <div className="mt-2 flex justify-between text-[11px] text-white/60">
                  <span>1 Mbps</span>
                  <span>8 Mbps</span>
                  <span>20 Mbps</span>
                  <span>50 Mbps</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium opacity-80">Quality</div>
                  <div className="text-xs opacity-60">{quality}%</div>
                </div>
                <input type="range" min={50} max={100} value={quality} onChange={(e)=>setQuality(parseInt(e.currentTarget.value,10))} className="w-full" />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between">
              {isExporting ? (
                <div className="flex-1 mr-3 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-white/40" style={{ width: `${Math.round(progress*100)}%` }} />
                </div>
              ) : (
                <div />
              )}
              <button disabled={isExporting} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 disabled:opacity-50" onClick={startExport}>
                {isExporting ? 'Exporting…' : 'Export'}
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

export default ExportSettingsDrawer;
