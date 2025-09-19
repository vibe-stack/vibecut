import { proxy } from "valtio";

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
  start: number; // frame index inclusive
  end: number; // frame index exclusive
  pipeline?: Modifier[];
};

export type VideoElement = BaseElement & {
  type: "video";
  data: {
    src: string;
    in: number; // frame offset into source
    out: number; // frame offset into source
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
    in: number; // seconds offset into source
    out: number; // seconds offset into source
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
  durationFrames: number; // total frames
  currentFrame: number;
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
    mixer: any | null; // THREE.AnimationMixer
    action: any | null; // THREE.AnimationAction
  };
};

export const editorStore = proxy<EditorState>({
  timeline: {
    fps: 30,
    durationFrames: 30 * 20, // 20s
    currentFrame: 0,
    pixelsPerSecond: 80,
  },
  mediaTracks: [
    {
      id: "media-1",
      name: "General Media",
      elements: [
        {
          id: "el-text-1",
          type: "text",
          start: 0,
          end: 30 * 5, // 5s
          data: { text: "Hello", color: "#e5e7eb" },
        },
        {
          id: "el-image-1",
          type: "image",
          start: 30 * 7,
          end: 30 * 12, // 5s
          data: { src: "/favicon.ico" },
        },
      ],
    },
  ],
  audioTracks: [
    {
      id: "audio-1",
      name: "Audio",
      elements: [
        {
          id: "el-audio-1",
          type: "audio",
          start: 30 * 2,
          end: 30 * 18,
          data: { src: "", in: 0, out: 16, volume: 0.8 },
        },
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
    try {
      const action = editorStore.playback.action;
      if (action) action.paused = false;
    } catch {}
  },
  pause() {
    editorStore.isPlaying = false;
    try {
      const action = editorStore.playback.action;
      if (action) action.paused = true;
    } catch {}
  },
  togglePlay() {
    editorStore.isPlaying = !editorStore.isPlaying;
    try {
      const action = editorStore.playback.action;
      if (action) action.paused = !action.paused;
    } catch {}
  },
  setCurrentFrame(frame: number) {
    const max = editorStore.timeline.durationFrames - 1;
    editorStore.timeline.currentFrame = Math.max(0, Math.min(frame, max));
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
    const { fps, durationFrames, currentFrame } = editorStore.timeline;
    const DEFAULT_SECONDS = 3;
    const length = Math.floor(DEFAULT_SECONDS * fps);
    const start = currentFrame;
    const end = Math.min(start + length, durationFrames);
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
    const { fps, durationFrames, currentFrame } = editorStore.timeline;
    const sourceFrames = Math.max(1, Math.floor(sourceSeconds * fps));
    const start = currentFrame;
    const end = Math.min(start + sourceFrames, durationFrames);
    const el: VideoElement = {
      id: uid("el-video"),
      type: "video",
      start,
      end,
      data: {
        src,
        in: 0,
        out: sourceFrames - 1,
        volume: 1,
        speed: 1,
      },
    };
    ensureMediaTrack().elements.push(el);
    editorStore.selection.elementId = el.id;
    return el.id;
  },
  setPlaybackSeconds(sec: number) {
    const mixer: any = editorStore.playback.mixer;
    const action: any = editorStore.playback.action;
    const max = editorStore.timeline.durationFrames / editorStore.timeline.fps;
    const t = Math.max(0, Math.min(sec, max));
    try {
      if (mixer && typeof mixer.setTime === "function") mixer.setTime(t);
      if (action) action.time = t;
    } catch {}
  },
  moveElement(id: string, deltaFrames: number) {
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));
    const apply = <T extends AnyElement>(tracks: Track<T>[]) => {
      for (const t of tracks) {
        const el = t.elements.find((e) => e.id === id);
        if (el) {
          const len = el.end - el.start;
          const start = clamp(el.start + deltaFrames, 0, editorStore.timeline.durationFrames - len);
          el.start = start;
          el.end = start + len;
          return true;
        }
      }
      return false;
    };
    if (!apply(editorStore.mediaTracks)) apply(editorStore.audioTracks);
  },
  resizeElementStart(id: string, deltaFrames: number) {
    const apply = <T extends AnyElement>(tracks: Track<T>[]) => {
      for (const t of tracks) {
        const el = t.elements.find((e) => e.id === id);
        if (el) {
          const minStart = 0;
          const maxStart = el.end - 1; // keep at least 1 frame
          el.start = Math.max(minStart, Math.min(el.start + deltaFrames, maxStart));
          return true;
        }
      }
      return false;
    };
    if (!apply(editorStore.mediaTracks)) apply(editorStore.audioTracks);
  },
  resizeElementEnd(id: string, deltaFrames: number) {
    const apply = <T extends AnyElement>(tracks: Track<T>[]) => {
      for (const t of tracks) {
        const el = t.elements.find((e) => e.id === id);
        if (el) {
          const minEnd = el.start + 1; // at least 1 frame length
          const maxEnd = editorStore.timeline.durationFrames;
          el.end = Math.max(minEnd, Math.min(el.end + deltaFrames, maxEnd));
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
          const max = editorStore.timeline.durationFrames;
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
          const maxStart = editorStore.timeline.durationFrames - len;
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
