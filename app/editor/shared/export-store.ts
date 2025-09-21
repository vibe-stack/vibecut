import { proxy, snapshot } from 'valtio';

export type ExportPhase = 'idle' | 'preparing' | 'encoding' | 'finalizing' | 'done' | 'error';

interface ExportState {
  phase: ExportPhase;
  isExporting: boolean;
  progress: number; // 0..1
  message?: string;
  url?: string;
  startedAt?: number;
  finishedAt?: number;
}

export const exportStore = proxy<ExportState>({
  phase: 'idle',
  isExporting: false,
  progress: 0,
});

export const exportActions = {
  start(message?: string) {
    exportStore.phase = 'preparing';
    exportStore.isExporting = true;
    exportStore.progress = 0;
    exportStore.message = message;
    exportStore.url = undefined;
    exportStore.startedAt = performance.now();
    exportStore.finishedAt = undefined;
  },
  setPhase(phase: ExportPhase) {
    exportStore.phase = phase;
  },
  setProgress(p: number) {
    exportStore.progress = Math.max(0, Math.min(1, p));
  },
  setMessage(msg?: string) {
    exportStore.message = msg;
  },
  complete(url?: string) {
    exportStore.phase = 'done';
    exportStore.isExporting = false;
    exportStore.progress = 1;
    exportStore.url = url;
    exportStore.finishedAt = performance.now();
  },
  fail(message?: string) {
    exportStore.phase = 'error';
    exportStore.isExporting = false;
    exportStore.message = message || 'Export failed';
    exportStore.finishedAt = performance.now();
  },
  reset() {
    exportStore.phase = 'idle';
    exportStore.isExporting = false;
    exportStore.progress = 0;
    exportStore.message = undefined;
    exportStore.url = undefined;
    exportStore.startedAt = undefined;
    exportStore.finishedAt = undefined;
  },
  getSnapshot() {
    return snapshot(exportStore);
  },
};

export default exportStore;
