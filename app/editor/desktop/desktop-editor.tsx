import React from 'react';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from '../shared/store';
import { VideoViewport } from '../viewport/video-viewport';
import { TimelineControls } from '../timeline/controls/timeline-controls';
import { Timeline } from '../timeline/timeline';

const DesktopHeader: React.FC = () => {
  const snap = useSnapshot(editorStore);
  return (
    <div className="hidden md:flex items-center justify-between px-4 py-2 bg-black text-white">
      <div className="text-sm opacity-70">VibeCut</div>
      <label className="flex items-center gap-2 text-xs">
        <span>Desktop layout</span>
        <input
          type="checkbox"
          checked={!!snap.ui?.desktopMode}
          onChange={(e) => editorActions.setDesktopMode(e.target.checked)}
        />
      </label>
    </div>
  );
};

export const DesktopEditor: React.FC = () => {
  return (
    <div className="h-screen flex flex-col bg-black text-white">
      <DesktopHeader />
      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col">
          <VideoViewport />
          <TimelineControls />
          <Timeline />
        </div>
      </div>
    </div>
  );
};

export default DesktopEditor;
