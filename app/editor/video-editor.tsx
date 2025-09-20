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