import React, { useEffect } from 'react';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from './shared/store';
import { useKeyboardShortcuts } from './timeline/controls/hooks/use-keyboard-shortcuts';
import MobileEditor from './mobile/mobile-editor';
import IOSAudioInitializer from './shared/ios-audio-init';

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
    <>
      <IOSAudioInitializer />
      <MobileEditor />
    </>
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
};

export default VideoEditor;