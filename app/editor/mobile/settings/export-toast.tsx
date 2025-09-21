import React from 'react';
import { useSnapshot } from 'valtio';
import exportStore from '../../shared/export-store';
import { Check } from 'lucide-react';

export const ExportToast: React.FC = () => {
  const snap = useSnapshot(exportStore);
  const visible = snap.isExporting || snap.phase === 'done' || snap.phase === 'error';
  if (!visible) return null;

  const isDone = snap.phase === 'done';
  const isError = snap.phase === 'error';

  return (
    <div className="absolute top-full right-0 mt-2 z-50">
      <div
        className={[
          'min-w-[160px] max-w-[240px] px-3 py-2 rounded-xl border text-xs shadow-lg',
          isDone ? 'bg-green-600/20 border-green-500/30 text-green-200' : isError ? 'bg-red-600/20 border-red-500/30 text-red-200' : 'bg-white/10 border-white/15 text-white/90',
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
          <div className="flex items-center gap-2">
            <div className="flex-1">Exporting…</div>
            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-white/60" style={{ width: `${Math.round((snap.progress || 0) * 100)}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportToast;
