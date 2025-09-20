import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { PlaybackClockAPI } from "./PlaybackClockAPI";

type PlaybackClockState = {
  // timeline time in milliseconds (monotonic based on perf.now when playing)
  timeMs: number;
  isPlaying: boolean;
  // low-frequency state tick for React UIs to subscribe without heavy updates
  uiTimeMs: number;
};

type PlaybackClockContextType = PlaybackClockState & {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seekMs: (ms: number) => void;
  seekSeconds: (sec: number) => void;
  setDurationMs: (ms: number) => void;
};

const PlaybackClockContext = createContext<PlaybackClockContextType | null>(null);

export function usePlaybackClock() {
  const ctx = useContext(PlaybackClockContext);
  if (!ctx) throw new Error("usePlaybackClock must be used within <PlaybackClock>");
  return ctx;
}

export function PlaybackClock({ children, durationMs: initialDurationMs }: { children: React.ReactNode; durationMs: number; }) {
  const [uiTimeMs, setUiTimeMs] = useState(0);
  const timeMsRef = useRef(0);
  const isPlayingRef = useRef(false);
  const durationMsRef = useRef(initialDurationMs);
  const rafRef = useRef(0);
  const lastNowRef = useRef(0);

  useEffect(() => { durationMsRef.current = initialDurationMs; }, [initialDurationMs]);

  const tick = useCallback(() => {
    const now = performance.now();
    if (isPlayingRef.current) {
      const last = lastNowRef.current || now;
      const dt = now - last;
      lastNowRef.current = now;
      // advance time
      const next = Math.min(timeMsRef.current + dt, durationMsRef.current);
      timeMsRef.current = next;
      // UI throttle at ~30-60 Hz, here we update every tick but React can batch
      setUiTimeMs(next);
      if (next >= durationMsRef.current) {
        // Auto-pause at end
        isPlayingRef.current = false;
      }
    } else {
      lastNowRef.current = now;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  const play = useCallback(() => {
    if (!isPlayingRef.current) {
      isPlayingRef.current = true;
      lastNowRef.current = performance.now();
    }
  }, []);

  const pause = useCallback(() => {
    isPlayingRef.current = false;
  }, []);

  const toggle = useCallback(() => {
    if (isPlayingRef.current) pause(); else play();
  }, [pause, play]);

  const seekMs = useCallback((ms: number) => {
    const clamped = Math.max(0, Math.min(ms, durationMsRef.current));
    timeMsRef.current = clamped;
    setUiTimeMs(clamped);
    lastNowRef.current = performance.now();
  }, []);

  const seekSeconds = useCallback((sec: number) => seekMs(sec * 1000), [seekMs]);

  const setDurationMs = useCallback((ms: number) => {
    durationMsRef.current = ms;
    if (timeMsRef.current > ms) seekMs(ms);
  }, [seekMs]);

  // Register with imperative API for external control
  useEffect(() => {
    PlaybackClockAPI.set({ play, pause, toggle, seekMs, seekSeconds });
    return () => PlaybackClockAPI.set(null);
  }, [play, pause, toggle, seekMs, seekSeconds]);

  const value: PlaybackClockContextType = {
    timeMs: timeMsRef.current,
    isPlaying: isPlayingRef.current,
    uiTimeMs,
    play,
    pause,
    toggle,
    seekMs,
    seekSeconds,
    setDurationMs,
  };

  return (
    <PlaybackClockContext.Provider value={value}>{children}</PlaybackClockContext.Provider>
  );
}
