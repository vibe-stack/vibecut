import { proxy } from "valtio";
import * as THREE from 'three/webgpu'
import { PlaybackClockAPI } from "../components/preview/PlaybackClockAPI";
export type MediaType = "video" | "image" | "text";
export type AudioType = "audio";
export type ElementType = MediaType | AudioType;

export type Modifier = {
  id: string;
  kind: string; // e.g., "filter", "effect", "postprocess"
  params?: Record<string, unknown>;
};

export type BaseElement = {
  id: string;
  type: ElementType;
  start: number; // millisecond index inclusive
  end: number; // millisecond index exclusive
  pipeline?: Modifier[];
};

export type VideoElement = BaseElement & {
  type: "video";
  data: {
    src: string;
    in: number; // millisecond offset into source
    out: number; // millisecond offset into source
    volume: number;
    speed: number;
  };
};

export type ImageElement = BaseElement & {
  type: "image";
  data: {
    src: string;
  };
};

export type TextElement = BaseElement & {
  type: "text";
  data: {
    text: string;
    color?: string;
  };
};

export type AudioElement = BaseElement & {
  type: "audio";
  data: {
    src: string;
    in: number; // milliseconds offset into source
    out: number; // milliseconds offset into source
    volume: number;
  };
};

export type AnyElement = VideoElement | ImageElement | TextElement | AudioElement;

export type Track<T extends AnyElement = AnyElement> = {
  id: string;
  name?: string;
  elements: T[];
};

export type Timeline = {
  fps: number;
  durationMs: number; // total duration in milliseconds
  currentTimeMs: number; // current time in milliseconds
  pixelsPerSecond: number; // timeline zoom/scale
};

export type Selection = {
  elementId: string | null;
};

export type EditorState = {
  timeline: Timeline;
  mediaTracks: Track<VideoElement | ImageElement | TextElement>[];
  audioTracks: Track<AudioElement>[];
  selection: Selection;
  isPlaying: boolean;
  playback: {
    mixer: THREE.AnimationMixer | null; // THREE.AnimationMixer
    action: THREE.AnimationAction | null; // THREE.AnimationAction
  };
};

export const editorStore = proxy<EditorState>({
  timeline: {
    fps: 30,
    durationMs: 20 * 1000, // 20 seconds in milliseconds
    currentTimeMs: 0,
    pixelsPerSecond: 80,
  },
  mediaTracks: [
    {
      id: "media-1",
      name: "General Media",
      elements: [

      ],
    },
  ],
  audioTracks: [
    {
      id: "audio-1",
      name: "Audio",
      elements: [

      ],
    },
  ],
  selection: { elementId: null },
  isPlaying: false,
  playback: { mixer: null, action: null },
});

// Mutators and helpers
export const EditorActions = {
  play() {
    editorStore.isPlaying = true;
    PlaybackClockAPI.play();
  },
  pause() {
    editorStore.isPlaying = false;
    PlaybackClockAPI.pause();
  },
  togglePlay() {
    editorStore.isPlaying = !editorStore.isPlaying;
    PlaybackClockAPI.toggle();
  },
  setCurrentTime(ms: number) {
    const max = editorStore.timeline.durationMs;
    editorStore.timeline.currentTimeMs = Math.max(0, Math.min(ms, max));
  },
  selectElement(id: string | null) {
    editorStore.selection.elementId = id;
  },
  deleteSelected() {
    const id = editorStore.selection.elementId;
    if (!id) return;
    const remove = <T extends AnyElement>(tracks: Track<T>[]) => {
      for (const t of tracks) {
        const idx = t.elements.findIndex((e) => e.id === id);
        if (idx >= 0) {
          const [removed] = t.elements.splice(idx, 1);
          // Revoke blob URLs if any
          try {
            const src = (removed as any).data?.src as string | undefined;
            if (src && typeof URL !== "undefined" && src.startsWith("blob:")) {
              URL.revokeObjectURL(src);
            }
          } catch {}
          return true;
        }
      }
      return false;
    };
    if (!remove(editorStore.mediaTracks)) remove(editorStore.audioTracks);
    editorStore.selection.elementId = null;
  },
  addImageFromSrc(src: string) {
    const { durationMs, currentTimeMs } = editorStore.timeline;
    const DEFAULT_MS = 3000; // 3 seconds
    const start = currentTimeMs;
    const end = Math.min(start + DEFAULT_MS, durationMs);
    const el: ImageElement = {
      id: uid("el-image"),
      type: "image",
      start,
      end,
      data: { src },
    };
    ensureMediaTrack().elements.push(el);
    editorStore.selection.elementId = el.id;
    return el.id;
  },
  addVideoFromSrc(src: string, sourceSeconds: number) {
    const { durationMs, currentTimeMs } = editorStore.timeline;
    const sourceMs = sourceSeconds * 1000;
    const start = currentTimeMs;
    const end = Math.min(start + sourceMs, durationMs);
    const el: VideoElement = {
      id: uid("el-video"),
      type: "video",
      start,
      end,
      data: {
        src,
        in: 0,
        out: sourceMs,
        volume: 1,
        speed: 1,
      },
    };
    ensureMediaTrack().elements.push(el);
    editorStore.selection.elementId = el.id;
    return el.id;
  },
  setPlaybackSeconds(sec: number) {
    const max = editorStore.timeline.durationMs / 1000;
    const t = Math.max(0, Math.min(sec, max));
    PlaybackClockAPI.seekSeconds(t);
  },
  moveElement(id: string, deltaMs: number) {
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));
    const apply = <T extends AnyElement>(tracks: Track<T>[]) => {
      for (const t of tracks) {
        const el = t.elements.find((e) => e.id === id);
        if (el) {
          const len = el.end - el.start;
          const start = clamp(el.start + deltaMs, 0, editorStore.timeline.durationMs - len);
          el.start = start;
          el.end = start + len;
          return true;
        }
      }
      return false;
    };
    if (!apply(editorStore.mediaTracks)) apply(editorStore.audioTracks);
  },
  resizeElementStart(id: string, deltaMs: number) {
    const apply = <T extends AnyElement>(tracks: Track<T>[]) => {
      for (const t of tracks) {
        const el = t.elements.find((e) => e.id === id);
        if (el) {
          const minStart = 0;
          const maxStart = el.end - 1;
          el.start = Math.max(minStart, Math.min(el.start + deltaMs, maxStart));
          return true;
        }
      }
      return false;
    };
    if (!apply(editorStore.mediaTracks)) apply(editorStore.audioTracks);
  },
  resizeElementEnd(id: string, deltaMs: number) {
    const apply = <T extends AnyElement>(tracks: Track<T>[]) => {
      for (const t of tracks) {
        const el = t.elements.find((e) => e.id === id);
        if (el) {
          const minEnd = el.start + 1;
          const maxEnd = editorStore.timeline.durationMs;
          el.end = Math.max(minEnd, Math.min(el.end + deltaMs, maxEnd));
          return true;
        }
      }
      return false;
    };
    if (!apply(editorStore.mediaTracks)) apply(editorStore.audioTracks);
  },
  setElementStartTo(id: string, newStart: number) {
    const apply = <T extends AnyElement>(tracks: Track<T>[]) => {
      for (const t of tracks) {
        const el = t.elements.find((e) => e.id === id);
        if (el) {
          const clamped = Math.max(0, Math.min(newStart, el.end - 1));
          el.start = clamped;
          return true;
        }
      }
      return false;
    };
    if (!apply(editorStore.mediaTracks)) apply(editorStore.audioTracks);
  },
  setElementEndTo(id: string, newEnd: number) {
    const apply = <T extends AnyElement>(tracks: Track<T>[]) => {
      for (const t of tracks) {
        const el = t.elements.find((e) => e.id === id);
        if (el) {
          const max = editorStore.timeline.durationMs;
          const clamped = Math.max(el.start + 1, Math.min(newEnd, max));
          el.end = clamped;
          return true;
        }
      }
      return false;
    };
    if (!apply(editorStore.mediaTracks)) apply(editorStore.audioTracks);
  },
  moveElementTo(id: string, newStart: number) {
    const apply = <T extends AnyElement>(tracks: Track<T>[]) => {
      for (const t of tracks) {
        const el = t.elements.find((e) => e.id === id);
        if (el) {
          const len = el.end - el.start;
          const maxStart = editorStore.timeline.durationMs - len;
          const clamped = Math.max(0, Math.min(newStart, maxStart));
          el.start = clamped;
          el.end = clamped + len;
          return true;
        }
      }
      return false;
    };
    if (!apply(editorStore.mediaTracks)) apply(editorStore.audioTracks);
  },
};

export function getElementById(id: string | null): AnyElement | null {
  if (!id) return null;
  for (const t of editorStore.mediaTracks) {
    const el = t.elements.find((e) => e.id === id);
    if (el) return el;
  }
  for (const t of editorStore.audioTracks) {
    const el = t.elements.find((e) => e.id === id);
    if (el) return el;
  }
  return null;
}

function ensureMediaTrack() {
  if (editorStore.mediaTracks.length === 0) {
    editorStore.mediaTracks.push({ id: uid("media"), name: "General Media", elements: [] });
  }
  return editorStore.mediaTracks[0];
}

function uid(prefix = "id") {
  const rnd = Math.random().toString(36).slice(2, 8);
  const ts = Date.now().toString(36).slice(-4);
  return `${prefix}-${ts}${rnd}`;
}
