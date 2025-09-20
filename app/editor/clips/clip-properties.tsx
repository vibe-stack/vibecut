import React, { useCallback } from 'react';
import { useSnapshot } from 'valtio';
import * as THREE from 'three';
import editorStore, { editorActions } from '../shared/store';

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
                      value={(clip.position as any)[axis].toFixed(2)}
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
                      value={(clip.scale as any)[axis].toFixed(2)}
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