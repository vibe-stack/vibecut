import { useCallback, useRef } from 'react';
import { loadVideoAsset, isValidVideoFile, loadImageAsset, isValidImageFile } from '../../shared/assets';

export const useFileUpload = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (files: FileList) => {
    const all = Array.from(files);
    const videos = all.filter(isValidVideoFile);
    const images = all.filter(isValidImageFile);

    if (videos.length === 0 && images.length === 0) {
      alert('Please select valid media files (videos: mp4/webm/ogg/mov/avi; images: png/jpg/webp/gif/svg/bmp)');
      return;
    }

    for (const file of images) {
      try {
        await loadImageAsset(file, file.name);
      } catch (error) {
        console.error(`Failed to load image ${file.name}:`, error);
        alert(`Failed to load image ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    for (const file of videos) {
      try {
        await loadVideoAsset(file, file.name);
      } catch (error) {
        console.error(`Failed to load video ${file.name}:`, error);
        alert(`Failed to load video ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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