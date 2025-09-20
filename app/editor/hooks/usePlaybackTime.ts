import { usePlaybackClock } from "../components/preview/PlaybackClock";

// Back-compat wrapper: return UI time from the new PlaybackClock.
export function usePlaybackTime() {
  const { uiTimeMs } = usePlaybackClock();
  return uiTimeMs;
}
