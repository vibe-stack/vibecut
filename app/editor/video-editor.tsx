import React, { useEffect } from 'react';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from './shared/store';
import { VideoViewport } from './viewport/video-viewport';
import { TimelineControls } from './timeline/controls/timeline-controls';
import { Timeline } from './timeline/timeline';
import { AssetLibrary } from './clips/asset-library';
import { TrackManager } from './clips/track-manager';
import { ClipProperties } from './clips/clip-properties';
import { useKeyboardShortcuts } from './timeline/controls/hooks/use-keyboard-shortcuts';

/**
 * Main video editor interface
 */
export const VideoEditor: React.FC = () => {
  const snapshot = useSnapshot(editorStore);

  // Initialize with a default track if none exist
  useEffect(() => {
    if (snapshot.tracks.length === 0) {
      editorActions.addTrack({ name: 'Video Track 1' });
    }
  }, [snapshot.tracks.length]);

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-600 px-4 py-2 flex justify-between items-center">
        <h1 className="text-xl font-bold">VibeCut Video Editor</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{snapshot.projectName}</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">
              File
            </button>
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">
              Edit
            </button>
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">
              View
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Assets */}
        <AssetLibrary />
        
        {/* Track Manager */}
        <TrackManager />
        
        {/* Center - Video Viewport */}
        <div className="flex-1 flex flex-col">
          <VideoViewport />
          
          {/* Timeline Controls */}
          <TimelineControls />
          
          {/* Timeline */}
          <Timeline />
        </div>
        
        {/* Right Sidebar - Properties */}
        <ClipProperties />
      </div>

      {/* Status Bar */}
      <div className="bg-gray-800 border-t border-gray-600 px-4 py-2 text-sm text-gray-400 flex justify-between">
        <div className="flex gap-4">
          <span>Zoom: {Math.round(snapshot.timelineZoom)}px/s</span>
          <span>FPS: {snapshot.config.editorFps}</span>
          <span>Grid: {snapshot.config.gridSnap ? 'On' : 'Off'}</span>
        </div>
        <div className="flex gap-4">
          <span>Assets: {Object.keys(snapshot.assets).length}</span>
          <span>Tracks: {snapshot.tracks.length}</span>
          <span>Selected: {snapshot.selectedClipIds.length}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Demo utility function to create sample content
 */
export const createDemoProject = async () => {
  // Reset the project
  editorActions.resetProject();
  
  // Add a demo track
  const trackId = editorActions.addTrack({ name: 'Demo Track' });
  
  // Update project name
  editorStore.projectName = 'Demo Project';
  
  console.log('Demo project created! Add video files using the Asset Library.');
};

export default VideoEditor;