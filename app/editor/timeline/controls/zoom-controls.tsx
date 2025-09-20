import React, { useCallback } from 'react';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from '../../shared/store';

/**
 * Zoom controls for timeline
 */
export const ZoomControls: React.FC = () => {
  const snapshot = useSnapshot(editorStore);
  
  const zoomIn = useCallback(() => {
    const newZoom = Math.min(snapshot.timelineZoom * 1.5, 100);
    editorActions.setTimelineZoom(newZoom);
  }, [snapshot.timelineZoom]);

  const zoomOut = useCallback(() => {
    const newZoom = Math.max(snapshot.timelineZoom / 1.5, 1);
    editorActions.setTimelineZoom(newZoom);
  }, [snapshot.timelineZoom]);

  const resetZoom = useCallback(() => {
    editorActions.setTimelineZoom(10);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400">Zoom:</span>
      
      <button
        onClick={zoomOut}
        className="w-8 h-8 bg-gray-600 hover:bg-gray-700 rounded transition-colors flex items-center justify-center text-white"
        title="Zoom out"
      >
        -
      </button>
      
      <button
        onClick={resetZoom}
        className="px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded transition-colors text-sm text-white"
        title="Reset zoom"
      >
        {Math.round(snapshot.timelineZoom)}px/s
      </button>
      
      <button
        onClick={zoomIn}
        className="w-8 h-8 bg-gray-600 hover:bg-gray-700 rounded transition-colors flex items-center justify-center text-white"
        title="Zoom in"
      >
        +
      </button>
    </div>
  );
};