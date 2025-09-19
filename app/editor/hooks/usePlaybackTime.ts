import { useEffect, useState } from "react";
import { editorStore } from "../state/editor.store";

// Reads time from AnimationAction (seconds) via rAF without writing to the store per frame.
export function usePlaybackTime() {
  const [time, setTime] = useState(0);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const action = editorStore.playback.action as any;
      if (action) setTime(action.time || 0);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return time;
}
