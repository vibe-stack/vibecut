import React, { useCallback } from 'react';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from '../../shared/store';

/**
 * Frame stepping controls
 */
export const FrameControls: React.FC = () => {
  const snapshot = useSnapshot(editorStore);
  
  const frameTime = 1 / snapshot.config.editorFps;
  
  const stepBackward = useCallback(() => {
    const newTime = Math.max(0, snapshot.playback.currentTime - frameTime);
    editorActions.seekTo(newTime);
  }, [snapshot.playback.currentTime, frameTime]);

  const stepForward = useCallback(() => {
    const newTime = Math.min(snapshot.totalDuration, snapshot.playback.currentTime + frameTime);
    editorActions.seekTo(newTime);
  }, [snapshot.playback.currentTime, frameTime, snapshot.totalDuration]);

  const jumpToStart = useCallback(() => {
    editorActions.seekTo(0);
  }, []);

  const jumpToEnd = useCallback(() => {
    editorActions.seekTo(snapshot.totalDuration);
  }, [snapshot.totalDuration]);

  return (
    <div className="flex items-center gap-2">
      {/* Jump to start */}
      <button
        onClick={jumpToStart}
        className="flex items-center justify-center w-8 h-8 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
        title="Jump to start"
      >
        <div className="flex items-center">
          <div className="w-0.5 h-3 bg-white"></div>
          <div className="w-0 h-0 border-r-3 border-r-white border-t-1.5 border-t-transparent border-b-1.5 border-b-transparent ml-0.5"></div>
        </div>
      </button>

      {/* Step backward */}
      <button
        onClick={stepBackward}
        className="flex items-center justify-center w-8 h-8 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
        title="Previous frame"
      >
        <div className="w-0 h-0 border-r-3 border-r-white border-t-1.5 border-t-transparent border-b-1.5 border-b-transparent"></div>
      </button>

      {/* Step forward */}
      <button
        onClick={stepForward}
        className="flex items-center justify-center w-8 h-8 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
        title="Next frame"
      >
        <div className="w-0 h-0 border-l-3 border-l-white border-t-1.5 border-t-transparent border-b-1.5 border-b-transparent"></div>
      </button>

      {/* Jump to end */}
      <button
        onClick={jumpToEnd}
        className="flex items-center justify-center w-8 h-8 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
        title="Jump to end"
      >
        <div className="flex items-center">
          <div className="w-0 h-0 border-l-3 border-l-white border-t-1.5 border-t-transparent border-b-1.5 border-b-transparent"></div>
          <div className="w-0.5 h-3 bg-white ml-0.5"></div>
        </div>
      </button>
    </div>
  );
};