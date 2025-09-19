import { useSnapshot } from "valtio";
import { EditorActions, editorStore } from "../../state/editor.store";

export function Controls() {
  const snap = useSnapshot(editorStore);
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={() => EditorActions.togglePlay()}
          className="px-4 py-2 rounded-full bg-gray-800 text-gray-100 active:scale-[.98]"
          aria-label={snap.isPlaying ? "Pause" : "Play"}
        >
          {snap.isPlaying ? "Pause" : "Play"}
        </button>
      </div>
      <div className="text-xs text-gray-400">
        {Math.floor(snap.timeline.currentFrame / snap.timeline.fps)}s
      </div>
    </div>
  );
}
