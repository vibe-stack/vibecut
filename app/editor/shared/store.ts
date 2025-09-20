import { proxy, snapshot, subscribe } from 'valtio';
import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';
import type { 
  EditorState, 
  Track, 
  Clip, 
  Asset, 
  ActiveClip, 
  PlaybackState, 
  EditorConfig,
  VideoMetadata,
  ImageAdjustments,
} from './types';

// Initial state factory
const createInitialState = (): EditorState => ({
  tracks: [],
  assets: {},
  
  playback: {
    currentTime: 0,
    isPlaying: false,
    playbackRate: 1,
    loop: false,
    startTime: 0,
    endTime: 0,
  },
  
  config: {
    editorFps: 30,
    snapToFrames: false,
    autoSave: true,
    gridSnap: false,
    gridSize: 1,
    defaultImageDuration: 3,
  },
  
  selectedClipIds: [],
  selectedTrackIds: [],
  timelineZoom: 10, // 10 pixels per second initially
  timelineOffset: 0,
  
  projectName: 'Untitled Project',
  totalDuration: 0,
  exportSettings: {
    width: 1920,
    height: 1080,
    fps: 30,
    quality: 0.8,
  },
});

// Create the reactive store
export const editorStore = proxy<EditorState>(createInitialState());

// Store actions and utilities
export const editorActions = {
  // Internal helper: recompute zIndex so that array order maps to inverse z (first track highest z)
  _recomputeTrackZIndices: () => {
    const count = editorStore.tracks.length;
    editorStore.tracks.forEach((track, index) => {
      // Higher z is closer to camera; give first track the largest z
      track.zIndex = count - index - 1;
    });
  },
  // Utility: ensure there's always a selection (defaults to first track)
  ensureSelection: () => {
    const hasSelection = editorStore.selectedClipIds.length > 0 || editorStore.selectedTrackIds.length > 0;
    if (!hasSelection) {
      const firstTrack = editorStore.tracks[0];
      if (firstTrack) {
        editorStore.selectedTrackIds.push(firstTrack.id);
      }
    }
  },
  // === ASSET MANAGEMENT ===
  
  /**
   * Add a new asset to the store
   */
  addAsset: (asset: Omit<Asset, 'id'>) => {
    const id = uuidv4();
    const newAsset = { ...asset, id } as Asset;
    editorStore.assets[id] = newAsset;
    return id;
  },

  /** Convenience wrappers */
  addVideoAsset: (asset: Omit<Extract<Asset, { type: 'video' }>, 'id'>) => {
    return editorActions.addAsset(asset as Omit<Asset, 'id'>);
  },
  addImageAsset: (asset: Omit<Extract<Asset, { type: 'image' }>, 'id'>) => {
    return editorActions.addAsset(asset as Omit<Asset, 'id'>);
  },

  /**
   * Remove an asset and all clips that use it
   */
  removeAsset: (assetId: string) => {
    // Remove all clips that use this asset
    editorStore.tracks.forEach(track => {
      track.clips = track.clips.filter(clip => clip.assetId !== assetId);
    });
    delete editorStore.assets[assetId];
    editorActions.updateTotalDuration();
  },

  /**
   * Update asset loading state
   */
  updateAsset: (assetId: string, updates: Partial<Asset>) => {
    if (editorStore.assets[assetId]) {
      Object.assign(editorStore.assets[assetId], updates);
    }
  },

  /**
   * Get preferred track id based on selection (last selected) or first track. Creates one if none exists.
   */
  getPreferredTrackId: (): string => {
    // Use the last selected track if available and exists
    for (let i = editorStore.selectedTrackIds.length - 1; i >= 0; i--) {
      const id = editorStore.selectedTrackIds[i];
      if (editorStore.tracks.find(t => t.id === id)) return id;
    }
    // Fallback to first track
    if (editorStore.tracks.length > 0) return editorStore.tracks[0].id;
    // Ensure at least one track exists
    return editorActions.addTrack({ name: 'Video Track 1' });
  },

  /**
   * Add a loaded asset as a clip to the preferred track, appended at the end.
   */
  addAssetAsClip: (assetId: string) => {
    const asset = editorStore.assets[assetId];
    if (!asset || asset.loadState !== 'loaded') return;
    const trackId = editorActions.getPreferredTrackId();
    const track = editorStore.tracks.find(t => t.id === trackId);
    if (!track) return;

    const lastEnd = track.clips.reduce((max, c) => Math.max(max, c.end), 0);
    const start = lastEnd;
    const clipDuration = asset.type === 'video'
      ? asset.duration
      : editorStore.config.defaultImageDuration || 3;
    const end = start + clipDuration;

    editorActions.addClip(trackId, {
      assetId,
      start,
      end,
      trimStart: 0,
      trimEnd: asset.type === 'video' ? null : null,
      // rely on defaults for transform/visibility/volume
    } as any);
  },

  // === TRACK MANAGEMENT ===
  
  /**
   * Add a new track
   */
  addTrack: (track?: Partial<Track>): string => {
    const id = uuidv4();
    const newTrack: Track = {
      id,
      name: `Track ${editorStore.tracks.length + 1}`,
      clips: [],
      muted: false,
      volume: 1,
      // Temporary zIndex; will be normalized after insertion
      zIndex: editorStore.tracks.length,
      visible: true,
      locked: false,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
      ...track,
    };
    editorStore.tracks.push(newTrack);
    // Ensure first track renders on top by inverting z-order
    editorActions._recomputeTrackZIndices();
    // If nothing is selected (e.g., first track), select this track
    if (editorStore.selectedClipIds.length === 0 && editorStore.selectedTrackIds.length === 0) {
      editorStore.selectedTrackIds.push(id);
    }
    return id;
  },

  /**
   * Remove a track and all its clips
   */
  removeTrack: (trackId: string) => {
    const trackIndex = editorStore.tracks.findIndex(t => t.id === trackId);
    if (trackIndex !== -1) {
      editorStore.tracks.splice(trackIndex, 1);
      // Normalize z-order after removal
      editorActions._recomputeTrackZIndices();
      // Remove from selection if selected
      editorStore.selectedTrackIds = editorStore.selectedTrackIds.filter(id => id !== trackId);
      editorActions.updateTotalDuration();
      editorActions.ensureSelection();
    }
  },

  /**
   * Update track properties
   */
  updateTrack: (trackId: string, updates: Partial<Track>) => {
    const track = editorStore.tracks.find(t => t.id === trackId);
    if (track) {
      Object.assign(track, updates);
    }
  },

  /**
   * Reorder tracks
   */
  reorderTracks: (fromIndex: number, toIndex: number) => {
    const [removed] = editorStore.tracks.splice(fromIndex, 1);
    editorStore.tracks.splice(toIndex, 0, removed);
    
    // Update zIndex to match new order (first track on top)
    editorActions._recomputeTrackZIndices();
  },

  // === CLIP MANAGEMENT ===
  
  /**
   * Add a new clip to a track
   */
  addClip: (trackId: string, clipData: Omit<Clip, 'id' | 'duration'>): string => {
    const track = editorStore.tracks.find(t => t.id === trackId);
    if (!track) throw new Error(`Track ${trackId} not found`);
    
    const asset = editorStore.assets[clipData.assetId];
    if (!asset) throw new Error(`Asset ${clipData.assetId} not found`);

    const id = uuidv4();
    const duration = asset.type === 'video'
      ? (clipData.trimEnd ? clipData.trimEnd - clipData.trimStart : (asset.duration - clipData.trimStart))
      : Math.max(0, clipData.end - clipData.start);
    
  const newClip: Clip = {
      // Required fields
      id,
      duration,
      assetId: clipData.assetId,
      start: clipData.start,
      end: clipData.end,
  trimStart: asset.type === 'video' ? clipData.trimStart : 0,
  trimEnd: asset.type === 'video' ? clipData.trimEnd : null,
      
      // Default values that can be overridden
      position: clipData.position || new THREE.Vector3(0, 0, 0),
      rotation: clipData.rotation || new THREE.Euler(0, 0, 0),
      // Slightly larger default scale for better visibility in preview
      scale: clipData.scale || new THREE.Vector3(4, 4, 4),
      opacity: clipData.opacity !== undefined ? clipData.opacity : 1,
      visible: clipData.visible !== undefined ? clipData.visible : true,
      volume: clipData.volume !== undefined ? clipData.volume : 1,
      muted: clipData.muted !== undefined ? clipData.muted : false,
      // image-only defaults
      imageAdjustments: asset.type === 'image' ? {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        sharpen: 0,
        highlights: 0,
        shadows: 0,
        temperature: 0,
        hue: 0,
        vignette: 0,
      } : undefined,
      imageFilterPreset: asset.type === 'image' ? 'none' : undefined,
    };

    track.clips.push(newClip);
    editorActions.updateTotalDuration();
    return id;
  },

  /**
   * Remove a clip from its track
   */
  removeClip: (clipId: string) => {
    for (const track of editorStore.tracks) {
      const clipIndex = track.clips.findIndex(c => c.id === clipId);
      if (clipIndex !== -1) {
        track.clips.splice(clipIndex, 1);
        // Remove from selection if selected
        editorStore.selectedClipIds = editorStore.selectedClipIds.filter(id => id !== clipId);
        editorActions.updateTotalDuration();
        editorActions.ensureSelection();
        break;
      }
    }
  },

  /**
   * Update clip properties
   */
  updateClip: (clipId: string, updates: Partial<Clip>) => {
    for (const track of editorStore.tracks) {
      const clip = track.clips.find(c => c.id === clipId);
      if (clip) {
        Object.assign(clip, updates);
        
        // Recalculate duration if trim values changed
        const asset = editorStore.assets[clip.assetId];
        if (asset) {
          if (asset.type === 'video' && ('trimStart' in updates || 'trimEnd' in updates)) {
            clip.duration = clip.trimEnd ? clip.trimEnd - clip.trimStart : asset.duration - clip.trimStart;
          }
          if (asset.type === 'image' && ('start' in updates || 'end' in updates)) {
            clip.duration = Math.max(0, clip.end - clip.start);
          }
        }
        
        editorActions.updateTotalDuration();
        break;
      }
    }
  },

  /**
   * IMAGE-SPECIFIC: update adjustments for an image clip (non-destructive)
   */
  setImageAdjustments: (clipId: string, updates: Partial<ImageAdjustments>) => {
    for (const track of editorStore.tracks) {
      const clip = track.clips.find(c => c.id === clipId);
      if (!clip) continue;
      const asset = editorStore.assets[clip.assetId];
      if (asset?.type !== 'image') return;
      clip.imageAdjustments = {
        ...(clip.imageAdjustments || {
          brightness: 0, contrast: 0, saturation: 0, sharpen: 0,
          highlights: 0, shadows: 0, temperature: 0, hue: 0, vignette: 0,
        }),
        ...updates,
      };
      break;
    }
  },

  /**
   * IMAGE-SPECIFIC: set/remove a preset filter for an image clip
   */
  setImageFilterPreset: (clipId: string, preset: Clip['imageFilterPreset']) => {
    for (const track of editorStore.tracks) {
      const clip = track.clips.find(c => c.id === clipId);
      if (!clip) continue;
      const asset = editorStore.assets[clip.assetId];
      if (asset?.type !== 'image') return;
      clip.imageFilterPreset = preset;
      break;
    }
  },

  /**
   * Move a clip to a different track
   */
  moveClipToTrack: (clipId: string, targetTrackId: string) => {
    let clipToMove: Clip | null = null;
    
    // Remove from current track
    for (const track of editorStore.tracks) {
      const clipIndex = track.clips.findIndex(c => c.id === clipId);
      if (clipIndex !== -1) {
        clipToMove = track.clips.splice(clipIndex, 1)[0];
        break;
      }
    }
    
    // Add to target track
    if (clipToMove) {
      const targetTrack = editorStore.tracks.find(t => t.id === targetTrackId);
      if (targetTrack) {
        targetTrack.clips.push(clipToMove);
      }
    }
  },

  /**
   * Duplicate a clip and place the duplicate right after the original
   */
  duplicateClip: (clipId: string) => {
    const findNextFreeStart = (track: Track, proposedStart: number, duration: number): number => {
      // Ensure clips are checked in chronological order
      const sorted = [...track.clips].sort((a, b) => a.start - b.start);
      let start = Math.max(0, proposedStart);
      while (true) {
        const end = start + duration;
        // find any overlap
        const overlapping = sorted.find(c => !(end <= c.start || start >= c.end));
        if (!overlapping) return start;
        // shift start to the end of overlapping and try again
        start = overlapping.end;
      }
    };

    for (const track of editorStore.tracks) {
      const clip = track.clips.find(c => c.id === clipId);
      if (clip) {
        const asset = editorStore.assets[clip.assetId];
        if (!asset) return undefined;

        const id = uuidv4();
        const duration = clip.duration;
        const startCandidate = clip.end; // place right after the source clip initially
        const start = findNextFreeStart(track, startCandidate, duration);
        const newClip: Clip = {
          ...clip,
          id,
          start,
          end: start + duration,
        };
        track.clips.push(newClip);
        editorActions.updateTotalDuration();
        // Select the new clip
        editorActions.selectClips([id]);
        return id;
      }
    }
    return undefined;
  },

  // === PLAYBACK CONTROL ===
  
  /**
   * Set current playback time
   */
  setCurrentTime: (time: number) => {
    editorStore.playback.currentTime = Math.max(0, Math.min(time, editorStore.totalDuration));
  },

  /**
   * Play/pause toggle
   */
  togglePlayback: () => {
    editorStore.playback.isPlaying = !editorStore.playback.isPlaying;
  },

  /**
   * Set playing state
   */
  setPlaying: (playing: boolean) => {
    editorStore.playback.isPlaying = playing;
  },

  /**
   * Set playback rate
   */
  setPlaybackRate: (rate: number) => {
    editorStore.playback.playbackRate = Math.max(0.1, Math.min(rate, 4));
  },

  /**
   * Toggle loop mode
   */
  toggleLoop: () => {
    editorStore.playback.loop = !editorStore.playback.loop;
  },

  /**
   * Set timeline zoom
   */
  setTimelineZoom: (zoom: number) => {
    editorStore.timelineZoom = Math.max(1, Math.min(zoom, 100));
  },

  /**
   * Seek to specific time
   */
  seekTo: (time: number) => {
    editorActions.setCurrentTime(time);
    // Force immediate update by triggering a state change
    editorStore.playback.currentTime = time;
  },

  // === COMPUTED VALUES ===
  
  /**
   * Get all clips that are active at the current time
   */
  getActiveClips: (): ActiveClip[] => {
    const { currentTime } = editorStore.playback;
    const activeClips: ActiveClip[] = [];
    
    editorStore.tracks.forEach(track => {
      if (!track.visible) return;
      
      track.clips.forEach(clip => {
        if (!clip.visible) return;
        
        if (currentTime >= clip.start && currentTime < clip.end) {
          const videoTime = clip.trimStart + (currentTime - clip.start);
          activeClips.push({
            ...clip,
            videoTime,
            track,
          });
        }
      });
    });
    
    return activeClips.sort((a, b) => a.track.zIndex - b.track.zIndex);
  },

  /**
   * Get clips at a specific time
   */
  getClipsAtTime: (time: number): ActiveClip[] => {
    const activeClips: ActiveClip[] = [];
    
    editorStore.tracks.forEach(track => {
      track.clips.forEach(clip => {
        if (time >= clip.start && time < clip.end) {
          const videoTime = clip.trimStart + (time - clip.start);
          activeClips.push({
            ...clip,
            videoTime,
            track,
          });
        }
      });
    });
    
    return activeClips.sort((a, b) => a.track.zIndex - b.track.zIndex);
  },

  /**
   * Update total duration based on all clips
   */
  updateTotalDuration: () => {
    let maxEnd = 0;
    editorStore.tracks.forEach(track => {
      track.clips.forEach(clip => {
        maxEnd = Math.max(maxEnd, clip.end);
      });
    });
    editorStore.totalDuration = Math.max(maxEnd, editorStore.playback.endTime);
  },

  // === SELECTION ===
  
  /**
   * Select clips
   */
  selectClips: (clipIds: string[], append: boolean = false) => {
    if (append) {
      const newIds = clipIds.filter(id => !editorStore.selectedClipIds.includes(id));
      editorStore.selectedClipIds.push(...newIds);
    } else {
      editorStore.selectedClipIds.length = 0;
      editorStore.selectedClipIds.push(...clipIds);
      // Clear track selection when selecting clips exclusively
      editorStore.selectedTrackIds.length = 0;
    }
  },

  /**
   * Deselect clips
   */
  deselectClips: (clipIds: string[]) => {
    editorStore.selectedClipIds = editorStore.selectedClipIds.filter(
      id => !clipIds.includes(id)
    );
  },

  /**
   * Clear all selections
   */
  clearSelection: () => {
    editorStore.selectedClipIds.length = 0;
    editorStore.selectedTrackIds.length = 0;
    editorActions.ensureSelection();
  },

  /**
   * Select tracks
   */
  selectTracks: (trackIds: string[], append: boolean = false) => {
    if (append) {
      const newIds = trackIds.filter(id => !editorStore.selectedTrackIds.includes(id));
      editorStore.selectedTrackIds.push(...newIds);
    } else {
      editorStore.selectedTrackIds.length = 0;
      editorStore.selectedTrackIds.push(...trackIds);
    }
    // Deselect clips when selecting tracks unless appending
    if (!append) {
      editorStore.selectedClipIds.length = 0;
    }
  },

  // === PROJECT MANAGEMENT ===
  
  /**
   * Reset to initial state
   */
  resetProject: () => {
    const initial = createInitialState();
    Object.assign(editorStore, initial);
  },

  /**
   * Get project snapshot for saving/undo
   */
  getSnapshot: () => {
    return snapshot(editorStore);
  },

  /**
   * Load project from snapshot
   */
  loadSnapshot: (snapshotData: EditorState) => {
    Object.assign(editorStore, snapshotData);
    // Normalize z order to expected convention
    editorActions._recomputeTrackZIndices();
  },
};


// Subscribe to changes for auto-save and other side effects
subscribe(editorStore, () => {
  if (editorStore.config.autoSave) {
    // Could implement auto-save to localStorage here
    // localStorage.setItem('vibecut-project', JSON.stringify(snapshot(editorStore)));
  }
});

// Export the store instance and actions
export default editorStore;