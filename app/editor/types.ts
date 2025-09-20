import * as THREE from 'three';

/**
 * A video asset that can be used in clips
 */
export interface Asset {
  id: string;
  src: string; // URL or file path
  duration: number; // Duration in seconds
  fps: number; // Frames per second of the source video
  video: HTMLVideoElement | null; // Loaded video element for texture
  width?: number; // Video width in pixels
  height?: number; // Video height in pixels
  aspectRatio?: number; // width / height
  loadState: 'loading' | 'loaded' | 'error';
  error?: string; // Error message if loading failed
}

/**
 * A video clip placed on a track
 */
export interface Clip {
  id: string;
  assetId: string; // Reference to the asset
  start: number; // Start time on timeline (seconds)
  end: number; // End time on timeline (seconds)
  trimStart: number; // Trim start from asset (seconds, default: 0)
  trimEnd: number | null; // Trim end from asset (seconds, null = asset.duration)
  duration: number; // Computed duration (trimEnd ? trimEnd - trimStart : asset.duration - trimStart)
  
  // 3D positioning for R3F
  position: THREE.Vector3; // 3D position
  rotation: THREE.Euler; // 3D rotation
  scale: THREE.Vector3; // 3D scale
  
  // Visual properties
  opacity: number; // 0-1, default: 1
  visible: boolean; // Whether the clip is visible
  
  // Audio properties
  volume: number; // 0-1, default: 1
  muted: boolean; // Individual clip mute
}

/**
 * A track that contains clips
 */
export interface Track {
  id: string;
  name: string; // Human readable name (e.g., "Video Layer 1")
  clips: Clip[]; // Array of clips on this track
  muted: boolean; // Track-level mute (default: false)
  volume: number; // Track-level volume 0-1 (default: 1)
  zIndex: number; // Z-order for 3D stacking in R3F
  visible: boolean; // Track visibility toggle
  locked: boolean; // Prevent editing when locked
  color: string; // UI color for the track (hex)
}

/**
 * Active clip data computed from current timeline position
 */
export interface ActiveClip extends Clip {
  videoTime: number; // Current time within the source video (trimStart + offset)
  track: Track; // Reference to the track this clip belongs to
}

/**
 * Playback state and timeline controls
 */
export interface PlaybackState {
  currentTime: number; // Current position on timeline (seconds)
  isPlaying: boolean; // Play/pause state
  playbackRate: number; // Playback speed (1x = normal, 0.5x = half speed, etc.)
  loop: boolean; // Whether to loop playback
  startTime: number; // Timeline start time (usually 0)
  endTime: number; // Timeline end time (auto-computed or set)
}

/**
 * Editor configuration and settings
 */
export interface EditorConfig {
  editorFps: number; // Preview render rate for R3F useFrame throttling
  snapToFrames: boolean; // Whether to snap timeline operations to frame boundaries
  autoSave: boolean; // Auto-save project state
  gridSnap: boolean; // Snap objects to grid in 3D space
  gridSize: number; // Grid size for 3D positioning
}

/**
 * Complete editor state
 */
export interface EditorState {
  // Core timeline data
  tracks: Track[];
  assets: Record<string, Asset>; // Map of asset ID to asset
  
  // Playback controls
  playback: PlaybackState;
  
  // Editor settings
  config: EditorConfig;
  
  // UI state
  selectedClipIds: string[]; // Currently selected clips
  selectedTrackIds: string[]; // Currently selected tracks
  timelineZoom: number; // Timeline zoom level (pixels per second)
  timelineOffset: number; // Timeline scroll offset (seconds)
  
  // Project metadata
  projectName: string;
  totalDuration: number; // Auto-computed maximum timeline duration
  exportSettings: {
    width: number;
    height: number;
    fps: number;
    quality: number; // 0-1
  };
}

/**
 * Timeline viewport and interaction data
 */
export interface TimelineViewport {
  pixelsPerSecond: number; // Zoom level
  viewportStart: number; // Visible start time (seconds)
  viewportEnd: number; // Visible end time (seconds)
  scrollLeft: number; // Horizontal scroll position
  height: number; // Timeline height in pixels
}

/**
 * Drag and drop data for timeline interactions
 */
export interface DragData {
  type: 'clip' | 'asset' | 'scrubber';
  clipId?: string;
  assetId?: string;
  startPosition: number; // Initial position when drag started
  currentPosition: number; // Current position during drag
  offset: number; // Offset from mouse to object center
  trackId?: string; // Target track for drop
}

/**
 * Utility type for video metadata extraction
 */
export interface VideoMetadata {
  duration: number;
  fps: number;
  width: number;
  height: number;
  aspectRatio: number;
  hasAudio: boolean;
  codecs: {
    video?: string;
    audio?: string;
  };
}

/**
 * Export/render job configuration
 */
export interface ExportJob {
  id: string;
  name: string;
  format: 'mp4' | 'webm' | 'mov';
  settings: {
    width: number;
    height: number;
    fps: number;
    bitrate: number;
    quality: number; // 0-1
  };
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number; // 0-1
  outputUrl?: string;
  error?: string;
}