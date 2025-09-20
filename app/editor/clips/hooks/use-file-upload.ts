import { useCallback, useRef } from 'react';
import { loadVideoAsset, isValidVideoFile } from '../../shared/assets';

export const useFileUpload = () => {
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

  return {
    fileInputRef,
    handleDragOver,
    handleDrop,
    handleAddAsset,
    handleFileInputChange
  };
};