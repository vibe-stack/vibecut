import React, { useEffect } from 'react';
import { useSnapshot } from 'valtio';
import exportStore from '../../shared/export-store';
import { Check } from 'lucide-react';
import { createPortal } from 'react-dom';

export const ExportToast: React.FC = () => {
  const snap = useSnapshot(exportStore);
  const visible = snap.isExporting || snap.phase === 'done' || snap.phase === 'error';

  useEffect(() => {
    if (snap.phase === 'done' || snap.phase === 'error') {
      const iv = setTimeout(() => {
        exportStore.phase = 'idle';
      }, 4000);
      return () => clearTimeout(iv);
    }
  }, [snap.phase])

  if (!visible) return null;

  const isDone = snap.phase === 'done';
  const isError = snap.phase === 'error';

  return createPortal(
    <div className="fixed top-3 right-3 z-[100]">
      <div
        className={[
          'min-w-[180px] max-w-[280px] px-3.5 py-2.5 rounded-2xl border text-xs shadow-lg backdrop-blur supports-[backdrop-filter]:bg-black/50',
          isDone
            ? 'bg-green-500/15 border-green-500/30 text-green-100'
            : isError
            ? 'bg-red-500/15 border-red-500/30 text-red-100'
            : 'bg-white/10 border-white/15 text-white/90',
        ].join(' ')}
      >
        {isDone ? (
          <div className="flex items-center gap-2">
            <Check size={14} />
            <span>Export finished</span>
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2">
            <span>Export failed</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex-1">Exporting…</div>
            <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-white/70" style={{ width: `${Math.round((snap.progress || 0) * 100)}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ExportToast;
