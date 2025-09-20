import React from 'react';
import { Home, Upload } from 'lucide-react';

interface HeaderBarProps {
  onHome?: () => void;
  onExport?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ onHome, onExport }) => {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-black/95 text-white backdrop-blur supports-[backdrop-filter]:bg-black/70">
      <button
        aria-label="Home"
        className="p-2 rounded-xl bg-white/5 active:bg-white/10"
        onClick={onHome}
      >
        <Home size={18} />
      </button>
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
