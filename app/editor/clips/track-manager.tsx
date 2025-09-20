import React from 'react';
import { editorActions } from '../shared/store';
import { useTrackManagement } from './hooks/use-track-management';

/**
 * Track manager component
 */
export const TrackManager: React.FC = () => {
  const {
    snapshot,
    handleAddTrack,
    handleDeleteTrack,
    handleToggleTrackVisibility,
    handleToggleTrackMute,
    handleTrackVolumeChange
  } = useTrackManagement();

  return (
    <div className="bg-gray-700 border-r border-gray-600 w-48 h-full overflow-y-auto">
      <div className="p-3">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-semibold">Tracks</h3>
          <button
            onClick={handleAddTrack}
            className="text-blue-400 hover:text-blue-300 text-lg"
            title="Add Track"
          >
            +
          </button>
        </div>
        
        <div className="space-y-2">
          {snapshot.tracks.map((track, index) => (
            <div key={track.id} className="bg-gray-800 rounded p-2">
              <div className="flex justify-between items-center mb-2">
                <input
                  type="text"
                  value={track.name}
                  onChange={(e) => editorActions.updateTrack(track.id, { name: e.target.value })}
                  className="bg-transparent text-white text-sm font-medium border-none outline-none w-24"
                />
                <button
                  onClick={() => handleDeleteTrack(track.id)}
                  className="text-red-400 hover:text-red-300 text-xs"
                  title="Delete Track"
                >
                  ×
                </button>
              </div>
              
              <div className="flex items-center gap-1 mb-2">
                <button
                  onClick={() => handleToggleTrackVisibility(track.id)}
                  className={`w-6 h-6 text-xs rounded ${
                    track.visible ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-400'
                  }`}
                  title={track.visible ? 'Hide Track' : 'Show Track'}
                >
                  👁
                </button>
                
                <button
                  onClick={() => handleToggleTrackMute(track.id)}
                  className={`w-6 h-6 text-xs rounded ${
                    track.muted ? 'bg-red-600 text-white' : 'bg-gray-600 text-gray-400'
                  }`}
                  title={track.muted ? 'Unmute Track' : 'Mute Track'}
                >
                  🔇
                </button>
              </div>
              
              <div className="mb-1">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={track.volume}
                  onChange={(e) => handleTrackVolumeChange(track.id, parseFloat(e.target.value))}
                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  title="Volume"
                />
              </div>
              
              <div className="text-xs text-gray-400">
                Z: {track.zIndex} • {track.clips.length} clips
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};