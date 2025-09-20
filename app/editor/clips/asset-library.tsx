import React, { useCallback } from 'react';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from '../shared/store';
import { useFileUpload } from './hooks/use-file-upload';

/**
 * Asset library component for managing media files (video + image)
 */
export const AssetLibrary: React.FC = () => {
  const snapshot = useSnapshot(editorStore);
  const {
    fileInputRef,
    handleDragOver,
    handleDrop,
    handleAddAsset,
    handleFileInputChange
  } = useFileUpload();

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
          Add Media Files
        </button>
        
        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,image/*"
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
          Drop media files here
        </div>
        
        {/* Asset List (media only) */}
        <div className="space-y-2">
          {Object.values(snapshot.assets as Record<string, any>).filter((a: any) => a.type !== 'text').map((asset: any) => (
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
                {asset.type === 'video' && (
                  <>
                    <div>Duration: {asset.duration.toFixed(2)}s</div>
                    <div>FPS: {asset.fps}</div>
                  </>
                )}
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
          
          {Object.values(snapshot.assets as Record<string, any>).filter((a: any) => a.type !== 'text').length === 0 && (
            <div className="text-gray-400 text-sm text-center py-8">
              No assets loaded.<br />
              Add media files to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};