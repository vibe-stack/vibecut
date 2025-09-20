import type { VideoElement } from "../../state/editor.store";

// Map timeline time (ms) to the underlying video source time (seconds),
// considering element start, speed, and in/out points.
export function computeVideoTime(el: VideoElement, timeMs: number): number | null {
  if (timeMs < el.start || timeMs >= el.end) return null;
  const localTimeMs = timeMs - el.start;
  const speed = el.data.speed || 1;
  const sourceTimeMs = el.data.in + localTimeMs * speed;
  const clampedSourceMs = Math.max(el.data.in, Math.min(sourceTimeMs, el.data.out));
  return clampedSourceMs / 1000; // seconds
}
