import { useEffect, useRef } from "react";
import { useSnapshot } from "valtio";
import { editorStore, EditorActions } from "../state/editor.store";

// Advances currentFrame while playing based on fps, using rAF.
export function usePlayback() {
  const snap = useSnapshot(editorStore);
  const raf = useRef<number | null>(null);
  const lastTs = useRef<number | null>(null);

  useEffect(() => {
    function loop(ts: number) {
      if (!snap.isPlaying) {
        raf.current = null;
        lastTs.current = null;
        return;
      }
      if (lastTs.current == null) lastTs.current = ts;
      const dt = (ts - lastTs.current) / 1000; // seconds
      lastTs.current = ts;
      const { fps, durationFrames } = editorStore.timeline;
      const inc = Math.floor(dt * fps);
      if (inc > 0) {
        const next = editorStore.timeline.currentFrame + inc;
        if (next >= durationFrames) {
          EditorActions.pause();
          EditorActions.setCurrentFrame(0);
        } else {
          EditorActions.setCurrentFrame(next);
        }
      }
      raf.current = requestAnimationFrame(loop);
    }

    if (snap.isPlaying && raf.current == null) {
      raf.current = requestAnimationFrame(loop);
    }
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
      raf.current = null;
      lastTs.current = null;
    };
  }, [snap.isPlaying]);
}
