import React, { useCallback, useRef } from 'react';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from './store';
import { loadVideoAsset, isValidVideoFile } from './assets';
import * as THREE from 'three';

/**
 * Asset library component for managing video files
 */
export const AssetLibrary: React.FC = () => {
  const snapshot = useSnapshot(editorStore);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (files: FileList) => {
    const validFiles = Array.from(files).filter(isValidVideoFile);
    
    if (validFiles.length === 0) {
      alert('Please select valid video files (mp4, webm, ogg, mov, avi)');
      return;
    }

    for (const file of validFiles) {
      try {
        await loadVideoAsset(file, file.name);
      } catch (error) {
        console.error(`Failed to load ${file.name}:`, error);
        alert(`Failed to load ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const handleAddAsset = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files);
      e.target.value = ''; // Reset input
    }
  }, [handleFileUpload]);

  const handleDeleteAsset = useCallback((assetId: string) => {
    if (confirm('Are you sure you want to delete this asset? All clips using it will be removed.')) {
      editorActions.removeAsset(assetId);
    }
  }, []);

  const handleDragAssetStart = useCallback((e: React.DragEvent, assetId: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'asset',
      assetId,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  return (
    <div className="bg-gray-800 border-r border-gray-600 w-64 h-full overflow-y-auto">
      <div className="p-4">
        <h3 className="text-white font-semibold mb-4">Assets</h3>
        
        {/* Add Asset Button */}
        <button
          onClick={handleAddAsset}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded mb-4 transition-colors"
        >
          Add Video Files
        </button>
        
        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
        
        {/* Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-gray-600 rounded p-4 mb-4 text-center text-gray-400 hover:border-gray-500 transition-colors"
        >
          Drop video files here
        </div>
        
        {/* Asset List */}
        <div className="space-y-2">
          {Object.values(snapshot.assets).map(asset => (
            <div
              key={asset.id}
              className="bg-gray-700 rounded p-3 cursor-pointer hover:bg-gray-600 transition-colors"
              draggable
              onDragStart={(e) => handleDragAssetStart(e, asset.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-white text-sm font-medium truncate">
                  {asset.src.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Unknown'}
                </h4>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteAsset(asset.id);
                  }}
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  ×
                </button>
              </div>
              
              <div className="text-xs text-gray-400 space-y-1">
                <div>Duration: {asset.duration.toFixed(2)}s</div>
                <div>FPS: {asset.fps}</div>
                {asset.width && asset.height && (
                  <div>Size: {asset.width}×{asset.height}</div>
                )}
                <div className={`status ${asset.loadState === 'loaded' ? 'text-green-400' : 
                  asset.loadState === 'error' ? 'text-red-400' : 'text-yellow-400'}`}>
                  {asset.loadState}
                </div>
              </div>
            </div>
          ))}
          
          {Object.keys(snapshot.assets).length === 0 && (
            <div className="text-gray-400 text-sm text-center py-8">
              No assets loaded.<br />
              Add video files to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Track manager component
 */
export const TrackManager: React.FC = () => {
  const snapshot = useSnapshot(editorStore);

  const handleAddTrack = useCallback(() => {
    editorActions.addTrack();
  }, []);

  const handleDeleteTrack = useCallback((trackId: string) => {
    if (snapshot.tracks.length <= 1) {
      alert('Cannot delete the last track');
      return;
    }
    
    if (confirm('Are you sure you want to delete this track and all its clips?')) {
      editorActions.removeTrack(trackId);
    }
  }, [snapshot.tracks.length]);

  const handleToggleTrackVisibility = useCallback((trackId: string) => {
    const track = snapshot.tracks.find(t => t.id === trackId);
    if (track) {
      editorActions.updateTrack(trackId, { visible: !track.visible });
    }
  }, [snapshot.tracks]);

  const handleToggleTrackMute = useCallback((trackId: string) => {
    const track = snapshot.tracks.find(t => t.id === trackId);
    if (track) {
      editorActions.updateTrack(trackId, { muted: !track.muted });
    }
  }, [snapshot.tracks]);

  const handleTrackVolumeChange = useCallback((trackId: string, volume: number) => {
    editorActions.updateTrack(trackId, { volume });
  }, []);

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

/**
 * Clip properties panel
 */
export const ClipProperties: React.FC = () => {
  const snapshot = useSnapshot(editorStore);
  const selectedClips = snapshot.tracks
    .flatMap(track => track.clips)
    .filter(clip => snapshot.selectedClipIds.includes(clip.id));

  const handleClipPropertyChange = useCallback((clipId: string, property: string, value: any) => {
    editorActions.updateClip(clipId, { [property]: value });
  }, []);

  const handlePositionChange = useCallback((clipId: string, axis: 'x' | 'y' | 'z', value: number) => {
    const clip = selectedClips.find(c => c.id === clipId);
    if (clip) {
      const newPosition = new THREE.Vector3(clip.position.x, clip.position.y, clip.position.z);
      newPosition[axis] = value;
      editorActions.updateClip(clipId, { position: newPosition });
    }
  }, [selectedClips]);

  const handleScaleChange = useCallback((clipId: string, axis: 'x' | 'y' | 'z', value: number) => {
    const clip = selectedClips.find(c => c.id === clipId);
    if (clip) {
      const newScale = new THREE.Vector3(clip.scale.x, clip.scale.y, clip.scale.z);
      newScale[axis] = value;
      editorActions.updateClip(clipId, { scale: newScale });
    }
  }, [selectedClips]);

  if (selectedClips.length === 0) {
    return (
      <div className="bg-gray-800 border-l border-gray-600 w-64 h-full p-4">
        <h3 className="text-white font-semibold mb-4">Properties</h3>
        <p className="text-gray-400 text-sm">Select a clip to edit properties</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border-l border-gray-600 w-64 h-full p-4 overflow-y-auto">
      <h3 className="text-white font-semibold mb-4">Properties</h3>
      
      {selectedClips.map(clip => {
        const asset = snapshot.assets[clip.assetId];
        
        return (
          <div key={clip.id} className="mb-6 border-b border-gray-700 pb-4">
            <h4 className="text-white font-medium mb-3">
              {asset?.src.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Clip'}
            </h4>
            
            {/* Timing */}
            <div className="mb-4">
              <h5 className="text-gray-300 text-sm mb-2">Timing</h5>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-400">Start</label>
                  <input
                    type="number"
                    value={clip.start.toFixed(2)}
                    onChange={(e) => handleClipPropertyChange(clip.id, 'start', parseFloat(e.target.value))}
                    className="w-full px-2 py-1 bg-gray-700 text-white text-xs rounded"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Duration</label>
                  <input
                    type="number"
                    value={clip.duration.toFixed(2)}
                    readOnly
                    className="w-full px-2 py-1 bg-gray-600 text-gray-400 text-xs rounded"
                  />
                </div>
              </div>
            </div>
            
            {/* Position */}
            <div className="mb-4">
              <h5 className="text-gray-300 text-sm mb-2">Position</h5>
              <div className="space-y-2">
                {['x', 'y', 'z'].map(axis => (
                  <div key={axis}>
                    <label className="text-xs text-gray-400">{axis.toUpperCase()}</label>
                    <input
                      type="number"
                      value={clip.position[axis as keyof THREE.Vector3].toFixed(2)}
                      onChange={(e) => handlePositionChange(clip.id, axis as 'x' | 'y' | 'z', parseFloat(e.target.value))}
                      className="w-full px-2 py-1 bg-gray-700 text-white text-xs rounded"
                      step="0.1"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Scale */}
            <div className="mb-4">
              <h5 className="text-gray-300 text-sm mb-2">Scale</h5>
              <div className="space-y-2">
                {['x', 'y', 'z'].map(axis => (
                  <div key={axis}>
                    <label className="text-xs text-gray-400">{axis.toUpperCase()}</label>
                    <input
                      type="number"
                      value={clip.scale[axis as keyof THREE.Vector3].toFixed(2)}
                      onChange={(e) => handleScaleChange(clip.id, axis as 'x' | 'y' | 'z', parseFloat(e.target.value))}
                      className="w-full px-2 py-1 bg-gray-700 text-white text-xs rounded"
                      step="0.1"
                      min="0.1"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Visual Properties */}
            <div className="mb-4">
              <h5 className="text-gray-300 text-sm mb-2">Visual</h5>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-400">Opacity</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={clip.opacity}
                    onChange={(e) => handleClipPropertyChange(clip.id, 'opacity', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={clip.visible}
                    onChange={(e) => handleClipPropertyChange(clip.id, 'visible', e.target.checked)}
                    className="mr-2"
                  />
                  <label className="text-xs text-gray-400">Visible</label>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};