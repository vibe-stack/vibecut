import React, { createContext, useContext, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { VideoElement } from "../../state/editor.store";
import { computeVideoTime } from "./videoUtils";
import { usePlaybackClock } from "./PlaybackClock";

type RegisteredVideo = {
  id: string;
  meta: VideoElement; // timeline metadata for mapping timeline->source
  video: HTMLVideoElement;
  texture?: THREE.VideoTexture;
  lastSeekAt: number; // ms timestamp
  lastPlayAt: number; // ms timestamp
};

type VideoSyncAPI = {
  register: (
    id: string,
    meta: VideoElement,
    video: HTMLVideoElement,
    texture?: THREE.VideoTexture
  ) => void;
  unregister: (id: string) => void;
  updateMeta: (id: string, meta: VideoElement) => void;
  getStats: () => Array<{ id: string; current: number; desired: number | null; drift: number | null }>;
};

const VideoSyncContext = createContext<VideoSyncAPI | null>(null);

export function useVideoSync() {
  const ctx = useContext(VideoSyncContext);
  if (!ctx) throw new Error("useVideoSync must be used within <VideoSyncManager>");
  return ctx;
}

export function VideoSyncManager({ children }: { children: React.ReactNode }) {
  const registryRef = useRef<Map<string, RegisteredVideo>>(new Map());
  const clock = usePlaybackClock();

  const api = useMemo<VideoSyncAPI>(() => ({
    register(id, meta, video, texture) {
      registryRef.current.set(id, {
        id,
        meta,
        video,
        texture,
        lastSeekAt: 0,
        lastPlayAt: 0,
      });
    },
    unregister(id) {
      registryRef.current.delete(id);
    },
    updateMeta(id, meta) {
      const r = registryRef.current.get(id);
      if (r) r.meta = meta;
    },
    getStats() {
      const timeMs = clock.timeMs;
      const out: Array<{ id: string; current: number; desired: number | null; drift: number | null }> = [];
      registryRef.current.forEach((entry) => {
        const desired = computeVideoTime(entry.meta, timeMs);
        const current = entry.video?.currentTime ?? 0;
        out.push({ id: entry.id, current, desired, drift: desired == null ? null : desired - current });
      });
      return out;
    },
  }), []);

  // Single master sync loop
  useFrame(() => {
    const isPlaying = clock.isPlaying;
    const timeMs = clock.timeMs;
    const now = performance.now();

    registryRef.current.forEach((entry) => {
      const { video, meta, texture } = entry;
      if (!video) return;

      // Compute desired playback position in the source (seconds)
      const desired = computeVideoTime(meta, timeMs);

      if (desired == null) {
        // Out of visibility - pause and reset playback rate
        if (!video.paused) video.pause();
        const baseSpeed = meta.data.speed || 1;
        if (video.playbackRate !== baseSpeed) video.playbackRate = baseSpeed;
        return;
      }

      const baseSpeed = meta.data.speed || 1;
      const drift = (video.currentTime || 0) - desired; // positive means video ahead

      if (isPlaying) {
        if (video.paused) {
          video.play().catch(() => {});
          entry.lastPlayAt = now;
        }

        // Perform hard seek if we're significantly off, otherwise trust decoder cadence
        const hardSeekThreshold = 0.25; // seconds
        const seekCooldownMs = 800; // avoid thrashing seeks

        const shouldSeekHard = Math.abs(drift) > hardSeekThreshold && (now - entry.lastSeekAt) > seekCooldownMs;
        if (shouldSeekHard) {
          video.currentTime = desired;
          entry.lastSeekAt = now;
          if (video.playbackRate !== baseSpeed) video.playbackRate = baseSpeed;
        } else {
          // Light touch: minor rate nudge only if mild drift to help converge
          const correctionThreshold = 0.06; // ~60ms
          if (Math.abs(drift) > correctionThreshold) {
            const correction = drift > 0 ? 0.985 : 1.015; // slow if ahead, speed if behind
            video.playbackRate = baseSpeed * correction;
          } else if (video.playbackRate !== baseSpeed) {
            video.playbackRate = baseSpeed;
          }
        }
      } else {
        // Paused: ensure precise seek within ~1 frame
        const oneFrame = 1 / 60;
        if (!video.paused) video.pause();
        if (Math.abs(drift) > oneFrame && (now - entry.lastSeekAt) > 16) {
          video.currentTime = desired;
          entry.lastSeekAt = now;
        }
        if (video.playbackRate !== baseSpeed) video.playbackRate = baseSpeed;
      }

      // Update texture when the element has produced a new frame
      if (texture) {
        const v: any = video as any;
        if (typeof v.requestVideoFrameCallback === "function") {
          v.requestVideoFrameCallback(() => {
            texture.needsUpdate = true;
          });
        } else {
          // Fallback: throttle updates ~30fps
          const last = (texture.userData.lastUpdate || 0) as number;
          if (now - last > 33) {
            texture.needsUpdate = true;
            texture.userData.lastUpdate = now;
          }
        }
      }
    });
  });

  return (
    <VideoSyncContext.Provider value={api}>{children}</VideoSyncContext.Provider>
  );
}
