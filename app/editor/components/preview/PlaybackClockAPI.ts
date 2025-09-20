// Simple singleton API so non-React code (like EditorActions) can control the playback clock.

export type PlaybackClockControls = {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seekMs: (ms: number) => void;
  seekSeconds: (sec: number) => void;
};

let current: PlaybackClockControls | null = null;

export const PlaybackClockAPI = {
  set(controls: PlaybackClockControls | null) {
    current = controls;
  },
  play() { current?.play?.(); },
  pause() { current?.pause?.(); },
  toggle() { current?.toggle?.(); },
  seekMs(ms: number) { current?.seekMs?.(ms); },
  seekSeconds(sec: number) { current?.seekSeconds?.(sec); },
};
