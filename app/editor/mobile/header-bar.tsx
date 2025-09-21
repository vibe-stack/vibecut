import React from 'react';
import { Film } from 'lucide-react';
import { CompositionSettingsDrawer } from './settings/composition-drawer';
import { ExportSettingsDrawer } from './settings/export-drawer';
import ExportToast from './settings/export-toast';

interface HeaderBarProps {
  onHome?: () => void;
  onExport?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ onHome, onExport }) => {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-black/95 text-white backdrop-blur supports-[backdrop-filter]:bg-black/70">
      <CompositionSettingsDrawer>
        <button
          aria-label="Composition Settings"
          className="p-2 rounded-xl bg-white/5 active:bg-white/10"
        >
          <Film size={18} />
        </button>
      </CompositionSettingsDrawer>
      <div className="text-sm font-medium opacity-80">VibeCut</div>
      <div className="relative">
        <ExportSettingsDrawer>
          <button
            aria-label="Export"
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-sm font-medium"
            onClick={onExport}
          >
            Export
          </button>
        </ExportSettingsDrawer>
        <ExportToast />
      </div>
    </div>
  );
};

export default HeaderBar;
