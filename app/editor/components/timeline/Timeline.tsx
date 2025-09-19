import { useMemo, useRef } from "react";
import { useSnapshot } from "valtio";
import { EditorActions, editorStore, getElementById } from "../../state/editor.store";
import { framesToPx } from "../../utils/time";

const ROW_H = 40;

function TimeRuler() {
  const snap = useSnapshot(editorStore);
  const { fps, durationFrames, pixelsPerSecond } = snap.timeline;
  const seconds = Math.ceil(durationFrames / fps);
  const marks = useMemo(() => new Array(seconds).fill(0).map((_, i) => i), [seconds]);

  return (
    <div className="relative border-b border-gray-800">
      <div className="relative h-8">
        {marks.map((sec) => (
          <div
            key={sec}
            className="absolute top-0 h-full border-l border-gray-800 text-[10px] text-gray-400"
            style={{ left: `${sec * pixelsPerSecond}px`, width: 1 }}
          >
            <div className="pl-1 pt-1">{sec}s</div>
          </div>
        ))}
        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-red-500"
          style={{
            left: `${framesToPx(snap.timeline.currentFrame, fps, pixelsPerSecond)}px`,
          }}
        />
      </div>
    </div>
  );
}

type TrackRowProps = {
  trackId: string;
  kind: "media" | "audio";
};

function TrackRow({ trackId, kind }: TrackRowProps) {
  const snap = useSnapshot(editorStore);
  const track = (kind === "media"
    ? snap.mediaTracks.find((t) => t.id === trackId)
    : snap.audioTracks.find((t) => t.id === trackId)) as any;
  const { fps, pixelsPerSecond } = snap.timeline;

  if (!track) return null;
  return (
    <div className="relative border-b border-gray-900" style={{ height: ROW_H }}>
      {/* Elements */}
      {track.elements.map((el: any) => {
        const left = framesToPx(el.start, fps, pixelsPerSecond);
        const width = framesToPx(el.end - el.start, fps, pixelsPerSecond);
        const selected = snap.selection.elementId === el.id;
        const color = el.type === "audio" ? "bg-emerald-800" : el.type === "text" ? "bg-sky-800" : "bg-gray-700";
        return (
          <button
            key={el.id}
            className={`absolute top-1 h-[30px] rounded-md ${color} ${
              selected ? "ring-2 ring-cyan-400" : ""
            } overflow-hidden text-ellipsis whitespace-nowrap px-2 text-xs`}
            style={{ left, width }}
            onClick={() => EditorActions.selectElement(el.id)}
          >
            {el.type.toUpperCase()} {el.id}
          </button>
        );
      })}
    </div>
  );
}

export function Timeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const snap = useSnapshot(editorStore);
  const { mediaTracks, audioTracks } = snap;

  return (
    <div className="h-full flex flex-col">
      <TimeRuler />
      <div ref={containerRef} className="flex-1 overflow-auto relative">
        {/* Media section */}
        <div className="text-[11px] uppercase tracking-wide text-gray-400 px-2 py-1">General Media</div>
        {mediaTracks.map((t) => (
          <TrackRow key={t.id} trackId={t.id} kind="media" />
        ))}

        {/* Audio section */}
        <div className="text-[11px] uppercase tracking-wide text-gray-400 px-2 py-1 mt-2">Audio</div>
        {audioTracks.map((t) => (
          <TrackRow key={t.id} trackId={t.id} kind="audio" />
        ))}
      </div>
    </div>
  );
}
