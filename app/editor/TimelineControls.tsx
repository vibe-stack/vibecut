import React, { useCallback, useRef, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from './store';

/**
 * Playback controls component
 */
export const PlaybackControls: React.FC = () => {
  const snapshot = useSnapshot(editorStore);
  
  const handlePlayPause = useCallback(() => {
    editorActions.togglePlayback();
  }, []);

  const handleStop = useCallback(() => {
    editorActions.setPlaying(false);
    editorActions.seekTo(0);
  }, []);

  const handleSpeedChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    editorActions.setPlaybackRate(parseFloat(e.target.value));
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-800 text-white">
      {/* Play/Pause Button */}
      <button
        onClick={handlePlayPause}
        className="flex items-center justify-center w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
        aria-label={snapshot.playback.isPlaying ? 'Pause' : 'Play'}
      >
        {snapshot.playback.isPlaying ? (
          // Pause icon
          <div className="flex gap-1">
            <div className="w-1 h-4 bg-white"></div>
            <div className="w-1 h-4 bg-white"></div>
          </div>
        ) : (
          // Play icon
          <div className="w-0 h-0 border-l-4 border-l-white border-t-2 border-t-transparent border-b-2 border-b-transparent ml-1"></div>
        )}
      </button>

      {/* Stop Button */}
      <button
        onClick={handleStop}
        className="flex items-center justify-center w-10 h-10 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
        aria-label="Stop"
      >
        <div className="w-3 h-3 bg-white"></div>
      </button>

      {/* Time Display */}
      <div className="text-sm font-mono">
        <span>{formatTime(snapshot.playback.currentTime)}</span>
        <span className="text-gray-400"> / </span>
        <span>{formatTime(snapshot.totalDuration)}</span>
      </div>

      {/* Playback Speed */}
      <div className="flex items-center gap-2">
        <label htmlFor="playback-speed" className="text-sm">Speed:</label>
        <select
          id="playback-speed"
          value={snapshot.playback.playbackRate}
          onChange={handleSpeedChange}
          className="bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 text-sm"
        >
          <option value={0.25}>0.25x</option>
          <option value={0.5}>0.5x</option>
          <option value={0.75}>0.75x</option>
          <option value={1}>1x</option>
          <option value={1.25}>1.25x</option>
          <option value={1.5}>1.5x</option>
          <option value={2}>2x</option>
        </select>
      </div>

      {/* Loop Toggle */}
      <button
        onClick={() => editorActions.toggleLoop()}
        className={`px-3 py-1 rounded text-sm transition-colors ${
          snapshot.playback.loop 
            ? 'bg-green-600 hover:bg-green-700' 
            : 'bg-gray-600 hover:bg-gray-700'
        }`}
      >
        Loop
      </button>
    </div>
  );
};

/**
 * Timeline scrubber/seek bar component
 */
export const TimelineScrubber: React.FC = () => {
  const snapshot = useSnapshot(editorStore);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrubberRef.current) return;
    
    isDraggingRef.current = true;
    const rect = scrubberRef.current.getBoundingClientRect();
    const progress = (e.clientX - rect.left) / rect.width;
    const time = progress * snapshot.totalDuration;
    editorActions.seekTo(Math.max(0, Math.min(time, snapshot.totalDuration)));
  }, [snapshot.totalDuration]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current || !scrubberRef.current) return;
    
    const rect = scrubberRef.current.getBoundingClientRect();
    const progress = (e.clientX - rect.left) / rect.width;
    const time = progress * snapshot.totalDuration;
    editorActions.seekTo(Math.max(0, Math.min(time, snapshot.totalDuration)));
  }, [snapshot.totalDuration]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Add global mouse events for dragging
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const progress = snapshot.totalDuration > 0 
    ? (snapshot.playback.currentTime / snapshot.totalDuration) * 100 
    : 0;

  return (
    <div className="relative h-6 bg-gray-700 rounded cursor-pointer" ref={scrubberRef} onMouseDown={handleMouseDown}>
      {/* Progress bar */}
      <div 
        className="h-full bg-blue-600 rounded transition-all duration-75"
        style={{ width: `${progress}%` }}
      />
      
      {/* Scrubber handle */}
      <div 
        className="absolute top-1/2 w-3 h-3 bg-white rounded-full border-2 border-blue-600 transform -translate-y-1/2 cursor-grab active:cursor-grabbing"
        style={{ left: `${progress}%`, marginLeft: '-6px' }}
      />
      
      {/* Time markers (optional enhancement) */}
      <div className="absolute top-full pt-1 w-full">
        <div className="flex justify-between text-xs text-gray-400">
          <span>0:00</span>
          {snapshot.totalDuration > 60 && (
            <span>{Math.floor(snapshot.totalDuration / 60)}:00</span>
          )}
          <span>{Math.floor(snapshot.totalDuration / 60)}:{(snapshot.totalDuration % 60).toFixed(0).padStart(2, '0')}</span>
        </div>
      </div>
    </div>
  );
};

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

/**
 * Combined timeline controls component
 */
export const TimelineControls: React.FC = () => {
  return (
    <div className="bg-gray-800 border-b border-gray-600">
      {/* Main playback controls */}
      <PlaybackControls />
      
      {/* Timeline scrubber */}
      <div className="px-4 pb-4">
        <TimelineScrubber />
      </div>
      
      {/* Additional controls */}
      <div className="flex justify-between items-center px-4 pb-2">
        <FrameControls />
        <ZoomControls />
      </div>
    </div>
  );
};