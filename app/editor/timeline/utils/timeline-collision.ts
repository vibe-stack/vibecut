import type { Clip, Track } from "../../shared/types";

/**
 * Return a track and its clips sorted by start ascending.
 */
export const getSortedClips = (track: Track, exceptId?: string): Clip[] => {
  const clips = exceptId ? track.clips.filter((c) => c.id !== exceptId) : track.clips;
  return [...clips].sort((a, b) => a.start - b.start);
};

/**
 * Returns immediate left/right neighbors around a time window on a track.
 */
export const getNeighborClips = (
  track: Track,
  target: { id?: string; start: number; end: number }
): { left: Clip | null; right: Clip | null } => {
  const sorted = getSortedClips(track, target.id);
  let left: Clip | null = null;
  let right: Clip | null = null;
  for (const c of sorted) {
    if (c.end <= target.start) {
      // candidate for left neighbor
      if (!left || c.end > left.end) left = c;
      continue;
    }
    if (c.start >= target.end) {
      right = c;
      break;
    }
    // overlapping region found, pick as both depending on side
    if (c.start < target.start) left = c;
    if (c.end > target.end) {
      right = c;
      break;
    }
  }
  return { left, right };
};

/**
 * Simple interval overlap test against a track's clips (optionally excluding one clip).
 */
export const doesOverlap = (track: Track, start: number, end: number, exceptId?: string): boolean => {
  if (end <= start) return true;
  for (const c of track.clips) {
    if (exceptId && c.id === exceptId) continue;
    // If not (end <= c.start or start >= c.end) then intervals overlap
    if (!(end <= c.start || start >= c.end)) return true;
  }
  return false;
};

/**
 * Find the nearest free placement to desiredStart that can fit `duration` on a track.
 * Chooses the candidate with minimum absolute distance to desiredStart. If multiple
 * candidates tie, prefers the earlier one. If no gap fits, returns the end of the last clip.
 */
export const findNearestFreePlacement = (
  track: Track,
  desiredStart: number,
  duration: number,
  exceptId?: string
): number => {
  const sorted = getSortedClips(track, exceptId);
  const candidates: number[] = [];
  const safeDuration = Math.max(0, duration);

  // Gap before the first clip
  if (sorted.length === 0) {
    return Math.max(0, desiredStart);
  }

  // Consider placing before first clip
  if (sorted[0].start >= safeDuration) {
    candidates.push(Math.min(Math.max(0, desiredStart), sorted[0].start - safeDuration));
  }

  // Consider all gaps between clips
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const gapStart = a.end;
    const gapEnd = b.start;
    const gapSize = gapEnd - gapStart;
    if (gapSize >= safeDuration) {
      // Clamp desiredStart into this gap
      const clamped = Math.min(Math.max(desiredStart, gapStart), gapEnd - safeDuration);
      candidates.push(clamped);
    }
  }

  // Consider after the last clip
  const last = sorted[sorted.length - 1];
  const afterLast = Math.max(last.end, 0);
  candidates.push(Math.max(afterLast, desiredStart));

  // Pick nearest to desiredStart
  let best = candidates[0];
  let bestDist = Math.abs(best - desiredStart);
  for (let i = 1; i < candidates.length; i++) {
    const c = candidates[i];
    const d = Math.abs(c - desiredStart);
    if (d < bestDist || (d === bestDist && c < best)) {
      best = c;
      bestDist = d;
    }
  }
  return Math.max(0, best);
};

/**
 * Clamp a proposed trim start to avoid overlapping the left neighbor.
 */
export const clampTrimStartToLeft = (track: Track, clip: Clip, proposedStart: number): number => {
  const { left } = getNeighborClips(track, { id: clip.id, start: proposedStart, end: clip.end });
  if (left) return Math.max(left.end, proposedStart);
  return Math.max(0, proposedStart);
};

/**
 * Clamp a proposed trim end to avoid overlapping the right neighbor.
 */
export const clampTrimEndToRight = (track: Track, clip: Clip, proposedEnd: number): number => {
  const { right } = getNeighborClips(track, { id: clip.id, start: clip.start, end: proposedEnd });
  if (right) return Math.min(right.start, proposedEnd);
  return Math.max(clip.start, proposedEnd);
};
