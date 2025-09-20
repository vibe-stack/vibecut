import { editorActions } from './store';
import { ref } from 'valtio';
import type { Asset, VideoMetadata } from './types';

/**
 * Extract video metadata from a video element
 */
export const extractVideoMetadata = (video: HTMLVideoElement): Promise<VideoMetadata> => {
  return new Promise((resolve, reject) => {
    const handleLoadedMetadata = () => {
      try {
        // Calculate FPS (this is a rough estimation)
        // For more accurate FPS, you might need to use MediaBunny or similar
        const fps = 30; // Default fallback, MediaBunny would provide accurate FPS
        
        const metadata: VideoMetadata = {
          duration: video.duration,
          fps,
          width: video.videoWidth,
          height: video.videoHeight,
          aspectRatio: video.videoWidth / video.videoHeight,
          hasAudio: true, // Simplified - would need more complex detection
          codecs: {
            video: 'unknown', // Would require MediaBunny for codec detection
            audio: 'unknown',
          },
        };
        
        resolve(metadata);
      } catch (error) {
        reject(error);
      }
    };

    const handleError = () => {
      reject(new Error(`Failed to load video metadata: ${video.error?.message || 'Unknown error'}`));
    };

    if (video.readyState >= 1) {
      // Metadata already loaded
      handleLoadedMetadata();
    } else {
      video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
      video.addEventListener('error', handleError, { once: true });
    }
  });
};

/**
 * Load a video asset from URL or File
 */
export const loadVideoAsset = async (
  src: string | File, 
  name?: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    
    // Create object URL if src is a File
    const url = typeof src === 'string' ? src : URL.createObjectURL(src);
    const assetName = name || (typeof src === 'string' ? src.split('/').pop() || 'Video Asset' : src.name);
    
    // Add asset to store with loading state
    const assetId = editorActions.addVideoAsset({
      type: 'video',
      src: url,
      duration: 0,
      fps: 30,
      video: null,
      loadState: 'loading',
    } as any);

    const handleLoadedMetadata = async () => {
      try {
        const metadata = await extractVideoMetadata(video);
        
        // Update asset with loaded data
        editorActions.updateAsset(assetId, {
          duration: metadata.duration,
          fps: metadata.fps,
          width: metadata.width,
          height: metadata.height,
          aspectRatio: metadata.aspectRatio,
          video: ref(video) as any,
          loadState: 'loaded',
        } as any);
        // Auto-place as clip at end of preferred track
        editorActions.addAssetAsClip(assetId);
        
        resolve(assetId);
      } catch (error) {
        editorActions.updateAsset(assetId, {
          loadState: 'error',
          error: error instanceof Error ? error.message : 'Failed to extract metadata',
        });
        reject(error);
      }
    };

    const handleError = () => {
      const errorMessage = video.error?.message || 'Failed to load video';
      editorActions.updateAsset(assetId, {
        loadState: 'error',
        error: errorMessage,
      } as any);
      reject(new Error(errorMessage));
    };

    const handleCanPlay = () => {
      // Video is ready for playback
      video.pause();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
    video.addEventListener('error', handleError, { once: true });
    video.addEventListener('canplay', handleCanPlay, { once: true });
    
    video.src = url;
    video.load();
  });
};

/**
 * Load multiple video assets
 */
export const loadVideoAssets = async (sources: (string | File)[]): Promise<string[]> => {
  const promises = sources.map(src => loadVideoAsset(src));
  return Promise.all(promises);
};

/**
 * Enhanced video loader using MediaBunny (when available)
 */
export const loadVideoAssetWithMediaBunny = async (
  src: string | File, 
  name?: string
): Promise<string> => {
  try {
    // Check if MediaBunny is available
    const MediaBunny = (window as any).MediaBunny;
    
    if (!MediaBunny) {
      // Fallback to standard loading
      return loadVideoAsset(src, name);
    }

    const url = typeof src === 'string' ? src : URL.createObjectURL(src);
    const assetName = name || (typeof src === 'string' ? src.split('/').pop() || 'Video Asset' : src.name);
    
    // Add asset to store with loading state
    const assetId = editorActions.addVideoAsset({
      type: 'video',
      src: url,
      duration: 0,
      fps: 30,
      video: null,
      loadState: 'loading',
    } as any);

    try {
      // Use MediaBunny for accurate metadata extraction
      const mediaBunnyMetadata = await MediaBunny.decode(url, { 
        type: typeof src === 'string' ? 'video/mp4' : src.type 
      });
      
      // Create video element
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      video.src = url;
      
      await new Promise((resolve, reject) => {
        video.addEventListener('loadedmetadata', resolve, { once: true });
        video.addEventListener('error', reject, { once: true });
        video.load();
      });

      // Update asset with MediaBunny data
      editorActions.updateAsset(assetId, {
        duration: mediaBunnyMetadata.duration,
        fps: mediaBunnyMetadata.fps || 30,
        width: mediaBunnyMetadata.width || video.videoWidth,
        height: mediaBunnyMetadata.height || video.videoHeight,
        aspectRatio: (mediaBunnyMetadata.width || video.videoWidth) / (mediaBunnyMetadata.height || video.videoHeight),
        video: ref(video) as any,
        loadState: 'loaded',
      } as any);
      // Auto-place as clip
      editorActions.addAssetAsClip(assetId);
      
      return assetId;
    } catch (error) {
      // MediaBunny failed, fallback to standard loading
      console.warn('MediaBunny loading failed, falling back to standard method:', error);
      editorActions.removeAsset(assetId);
      return loadVideoAsset(src, name);
    }
  } catch (error) {
    throw new Error(`Failed to load video asset: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Load an image asset from URL or File
 */
export const loadImageAsset = async (
  src: string | File,
  name?: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const url = typeof src === 'string' ? src : URL.createObjectURL(src);

    const assetId = editorActions.addAsset({
      type: 'image',
      src: url,
      image: null,
      loadState: 'loading',
    } as any);

    const handleLoad = () => {
      try {
        editorActions.updateAsset(assetId, {
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : undefined,
          image: ref(img) as any,
          loadState: 'loaded',
        } as any);
        // Auto-place as clip at end of preferred track
        editorActions.addAssetAsClip(assetId);
        resolve(assetId);
      } catch (error) {
        editorActions.updateAsset(assetId, {
          loadState: 'error',
          error: error instanceof Error ? error.message : 'Failed to load image',
        });
        reject(error);
      }
    };

    const handleError = () => {
      const errorMessage = 'Failed to load image';
      editorActions.updateAsset(assetId, {
        loadState: 'error',
        error: errorMessage,
      });
      reject(new Error(errorMessage));
    };

    img.addEventListener('load', handleLoad, { once: true });
    img.addEventListener('error', handleError, { once: true });
    img.src = url;
  });
};

/**
 * Create a video element for timeline preview
 */
export const createPreviewVideo = (assetId: string): HTMLVideoElement | null => {
  const snapshot = editorActions.getSnapshot();
  const asset = snapshot.assets[assetId];
  if (!asset || asset.type !== 'video' || !asset.video) return null;
  
  // Clone the original video for independent playback
  const previewVideo = document.createElement('video');
  previewVideo.src = asset.src;
  previewVideo.crossOrigin = 'anonymous';
  previewVideo.muted = true; // Preview videos should be muted
  previewVideo.preload = 'metadata';
  
  return previewVideo;
};

/**
 * Utility to get video thumbnail at specific time
 */
export const getVideoThumbnail = (
  video: HTMLVideoElement, 
  time: number, 
  width: number = 160, 
  height: number = 90
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not create canvas context'));
      return;
    }
    
    canvas.width = width;
    canvas.height = height;
    
    const originalTime = video.currentTime;
    
    const handleSeeked = () => {
      try {
        ctx.drawImage(video, 0, 0, width, height);
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        video.currentTime = originalTime; // Restore original time
        resolve(dataURL);
      } catch (error) {
        reject(error);
      }
    };
    
    video.addEventListener('seeked', handleSeeked, { once: true });
    video.currentTime = time;
  });
};

/**
 * Generate thumbnails for timeline scrubbing
 */
export const generateThumbnails = async (
  assetId: string, 
  count: number = 10
): Promise<string[]> => {
  const snapshot = editorActions.getSnapshot();
  const asset = snapshot.assets[assetId];
  if (!asset || asset.type !== 'video' || !asset.video) {
    throw new Error('Asset not found or not loaded');
  }
  
  const thumbnails: string[] = [];
  const interval = asset.duration / count;
  
  for (let i = 0; i < count; i++) {
    const time = i * interval;
    try {
      // Create a new video element to avoid proxy issues
      const video = document.createElement('video');
      video.src = asset.src;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      
      await new Promise((resolve, reject) => {
        video.addEventListener('loadedmetadata', resolve, { once: true });
        video.addEventListener('error', reject, { once: true });
        video.load();
      });
      
      const thumbnail = await getVideoThumbnail(video, time);
      thumbnails.push(thumbnail);
    } catch (error) {
      console.warn(`Failed to generate thumbnail at ${time}s:`, error);
      thumbnails.push(''); // Empty thumbnail as fallback
    }
  }
  
  return thumbnails;
};

/**
 * Validate video file format
 */
export const isValidVideoFile = (file: File): boolean => {
  const validTypes = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo', // .avi
  ];
  
  return validTypes.includes(file.type);
};

/** Validate image file format */
export const isValidImageFile = (file: File): boolean => {
  const validTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/svg+xml',
  ];
  return validTypes.includes(file.type);
};

/** Validate audio file format */
export const isValidAudioFile = (file: File): boolean => {
  const validTypes = [
    'audio/mpeg', // mp3
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/ogg',
    'audio/webm',
    'audio/aac',
    'audio/mp4',
    'audio/x-m4a',
    'audio/flac',
  ];
  return validTypes.includes(file.type);
};

/**
 * Load an audio asset from URL or File
 */
export const loadAudioAsset = async (
  src: string | File,
  name?: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.crossOrigin = 'anonymous';
    const url = typeof src === 'string' ? src : URL.createObjectURL(src);

    const assetId = editorActions.addAudioAsset({
      type: 'audio',
      src: url,
      duration: 0,
      audio: null,
      loadState: 'loading',
    } as any);

    const handleLoadedMetadata = () => {
      try {
        editorActions.updateAsset(assetId, {
          duration: isFinite(audio.duration) ? audio.duration : 0,
          audio: ref(audio) as any,
          loadState: 'loaded',
        } as any);
        // Auto-place as clip at end of preferred track
        editorActions.addAssetAsClip(assetId);
        resolve(assetId);
      } catch (error) {
        editorActions.updateAsset(assetId, {
          loadState: 'error',
          error: error instanceof Error ? error.message : 'Failed to load audio',
        } as any);
        reject(error);
      }
    };

    const handleError = () => {
      const errorMessage = 'Failed to load audio';
      editorActions.updateAsset(assetId, {
        loadState: 'error',
        error: errorMessage,
      } as any);
      reject(new Error(errorMessage));
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
    audio.addEventListener('error', handleError, { once: true });
    audio.src = url;
    audio.load();
  });
};

/**
 * Get supported video formats
 */
export const getSupportedVideoFormats = (): string[] => {
  const video = document.createElement('video');
  const formats: string[] = [];
  
  const codecs = [
    { type: 'video/mp4', codec: 'avc1.42E01E' },
    { type: 'video/mp4', codec: 'mp4v.20.8' },
    { type: 'video/webm', codec: 'vp8' },
    { type: 'video/webm', codec: 'vp9' },
    { type: 'video/ogg', codec: 'theora' },
  ];
  
  codecs.forEach(({ type, codec }) => {
    if (video.canPlayType(`${type}; codecs="${codec}"`)) {
      if (!formats.includes(type)) {
        formats.push(type);
      }
    }
  });
  
  return formats;
};