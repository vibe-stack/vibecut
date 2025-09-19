import { useMemo, useRef, useCallback } from "react";
import { useSnapshot } from "valtio";
import { EditorActions, editorStore, getElementById } from "../../state/editor.store";
import { millisecondsToTimecode, millisecondsToPx } from "../../utils/time";
import { usePlaybackTime } from "../../hooks/usePlaybackTime";

const ROW_H = 40;

function TimeRuler() {
  const snap = useSnapshot(editorStore);
  const { durationMs, pixelsPerSecond } = snap.timeline;
  const seconds = Math.ceil(durationMs / 1000);
  const marks = useMemo(() => new Array(seconds).fill(0).map((_, i) => i), [seconds]);
  const timeMs = usePlaybackTime();
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const box = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - box.left;
    const sec = x / pixelsPerSecond;
    EditorActions.setPlaybackSeconds(sec);
  }, [pixelsPerSecond]);
  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    const box = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - box.left;
    const sec = x / pixelsPerSecond;
    EditorActions.setPlaybackSeconds(sec);
  }, [pixelsPerSecond]);

  return (
    <div className="relative border-b border-gray-800 select-none">
      <div className="relative h-8" onPointerDown={onPointerDown} onPointerMove={onPointerMove}>
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
            left: `${millisecondsToPx(timeMs, pixelsPerSecond)}px`,
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
    : snap.audioTracks.find((t) => t.id === trackId));
  const { pixelsPerSecond } = snap.timeline;

  if (!track) return null;
  return (
    <div className="relative border-b border-gray-900" style={{ height: ROW_H }}>
      {/* Elements */}
      {track.elements.map((el: any) => {
        const left = millisecondsToPx(el.start, pixelsPerSecond);
        const width = millisecondsToPx(el.end - el.start, pixelsPerSecond);
        const selected = snap.selection.elementId === el.id;
        const color = el.type === "audio" ? "bg-emerald-800" : el.type === "text" ? "bg-sky-800" : "bg-gray-700";
        return (
            <div key={el.id} className="absolute top-1 h-[30px]" style={{ left, width }}>
              {/* Resize handle - start */}
              <div
                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-l-md bg-gray-600/60"
                onPointerDown={(e) => {
                  e.preventDefault();
                  const startX = e.clientX;
                  const origStart = el.start;
                  const move = (ev: PointerEvent) => {
                    const dx = ev.clientX - startX;
                    const dMs = Math.round((dx / pixelsPerSecond) * 1000);
                    EditorActions.setElementStartTo(el.id, origStart + dMs);
                  };
                  const up = () => {
                    window.removeEventListener("pointermove", move);
                    window.removeEventListener("pointerup", up);
                  };
                  window.addEventListener("pointermove", move);
                  window.addEventListener("pointerup", up, { once: true });
                }}
                data-el-handle="start"
              />
              {/* Draggable body */}
              <div
                id={el.id}
                className={`absolute left-2 right-2 top-0 bottom-0 rounded-md ${color} ${selected ? "ring-2 ring-cyan-400" : ""} overflow-hidden text-ellipsis whitespace-nowrap px-2 text-xs flex items-center`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  EditorActions.selectElement(el.id);
                  const startX = e.clientX;
                  const origStart = el.start;
                  const move = (ev: PointerEvent) => {
                    const dx = ev.clientX - startX;
                    const dMs = Math.round((dx / pixelsPerSecond) * 1000);
                    EditorActions.moveElementTo(el.id, origStart + dMs);
                  };
                  const up = () => {
                    window.removeEventListener("pointermove", move);
                    window.removeEventListener("pointerup", up);
                  };
                  window.addEventListener("pointermove", move);
                  window.addEventListener("pointerup", up, { once: true });
                }}
                style={{ touchAction: "none" }}
                data-el-body="1"
              >
                {el.type.toUpperCase()} {el.id}
              </div>
              {/* Resize handle - end */}
              <div
                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-r-md bg-gray-600/60"
                onPointerDown={(e) => {
                  e.preventDefault();
                  const startX = e.clientX;
                  const origEnd = el.end;
                  const move = (ev: PointerEvent) => {
                    const dx = ev.clientX - startX;
                    const dMs = Math.round((dx / pixelsPerSecond) * 1000);
                    EditorActions.setElementEndTo(el.id, origEnd + dMs);
                  };
                  const up = () => {
                    window.removeEventListener("pointermove", move);
                    window.removeEventListener("pointerup", up);
                  };
                  window.addEventListener("pointermove", move);
                  window.addEventListener("pointerup", up, { once: true });
                }}
                data-el-handle="end"
              />
            </div>
        );
        })}
    </div>
  );
}

export function Timeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const snap = useSnapshot(editorStore);
  const { mediaTracks, audioTracks } = snap;
  const onBackgroundPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-el-body="1"], [data-el-handle="start"], [data-el-handle="end"]')) return;
    EditorActions.selectElement(null);
  };

  return (
    <div className="h-full flex flex-col">
      <TimeRuler />
  <div ref={containerRef} className="flex-1 overflow-auto relative" onPointerDown={onBackgroundPointerDown}>
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
