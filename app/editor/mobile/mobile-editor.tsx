import React from 'react';
import HeaderBar from './header-bar';
import PreviewArea from './preview-area';
import ControlsArea from './controls-area';
import TracksArea from './tracks-area';
import ActionsArea from './actions-area';

export const MobileEditor: React.FC = () => {
  return (
    <div className="h-[100dvh] flex flex-col bg-black text-white overflow-hidden">
      <HeaderBar />
      <div className="flex-1 flex flex-col gap-2 overflow-hidden">
        <PreviewArea />
        <div className="shrink-0">
          <ControlsArea />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <TracksArea />
        </div>
        <div className="shrink-0">
          <ActionsArea />
        </div>
      </div>
    </div>
  );
};

export default MobileEditor;
