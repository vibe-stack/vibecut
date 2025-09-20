import React from 'react';
import { Home, Upload, Monitor } from 'lucide-react';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from '../shared/store';

interface HeaderBarProps {
  onHome?: () => void;
  onExport?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ onHome, onExport }) => {
  const snap = useSnapshot(editorStore);
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-black/95 text-white backdrop-blur supports-[backdrop-filter]:bg-black/70">
      <div className="flex items-center gap-2">
        <button
          aria-label="Home"
          className="p-2 rounded-xl bg-white/5 active:bg-white/10"
          onClick={onHome}
        >
          <Home size={18} />
        </button>
        {/* Desktop toggle visible on desktop sizes, but inside the mobile header */}
        <button
          aria-label="Toggle desktop layout"
          className="hidden md:inline-flex p-2 rounded-xl bg-white/5 active:bg-white/10"
          onClick={() => editorActions.setDesktopMode(!snap.ui?.desktopMode)}
          title={snap.ui?.desktopMode ? 'Switch to mobile layout' : 'Switch to desktop layout'}
        >
          <Monitor size={18} />
        </button>
      </div>
      <div className="text-sm font-medium opacity-80">VibeCut</div>
      <button
        aria-label="Export"
        className="p-2 rounded-xl bg-white/5 active:bg-white/10"
        onClick={onExport}
      >
        <Upload size={18} />
      </button>
    </div>
  );
};

export default HeaderBar;
