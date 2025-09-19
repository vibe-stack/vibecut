import { useEffect, useState } from "react";
import { editorStore } from "../state/editor.store";

// Reads time from AnimationAction (seconds) via rAF and converts to milliseconds.
export function usePlaybackTime() {
  const [timeMs, setTimeMs] = useState(0);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const action = editorStore.playback.action as any;
      if (action) {
        const timeInSeconds = action.time || 0;
        setTimeMs(timeInSeconds * 1000); // Convert seconds to milliseconds
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return timeMs;
}
