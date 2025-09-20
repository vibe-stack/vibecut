import React from 'react';
import { usePlayback } from './hooks/use-playback';
import { editorActions } from '../../shared/store';

/**
 * Playback controls component
 */
export const PlaybackControls: React.FC = () => {
  const { snapshot, handlePlayPause, handleStop, handleSpeedChange, formatTime } = usePlayback();

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