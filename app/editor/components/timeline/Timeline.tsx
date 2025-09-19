import { useMemo, useRef, useState, useCallback } from "react";
import { useSnapshot } from "valtio";
import { EditorActions, editorStore, getElementById } from "../../state/editor.store";
import { framesToPx } from "../../utils/time";
import { usePlaybackTime } from "../../hooks/usePlaybackTime";
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";

const ROW_H = 40;

function TimeRuler() {
  const snap = useSnapshot(editorStore);
  const { fps, durationFrames, pixelsPerSecond } = snap.timeline;
  const seconds = Math.ceil(durationFrames / fps);
  const marks = useMemo(() => new Array(seconds).fill(0).map((_, i) => i), [seconds]);
  const time = usePlaybackTime();
  const currentFrame = Math.floor(time * fps);
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
            left: `${framesToPx(currentFrame, fps, pixelsPerSecond)}px`,
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
  const sensors = useSensors(useSensor(PointerSensor));
  const [draggingId, setDraggingId] = useState<string | null>(null);

  if (!track) return null;
  return (
    <div className="relative border-b border-gray-900" style={{ height: ROW_H }}>
      <DndContext
        sensors={sensors}
        modifiers={[restrictToHorizontalAxis]}
        onDragStart={({ active }: DragStartEvent) => setDraggingId(String(active.id))}
        onDragEnd={({ active, delta }: DragEndEvent) => {
          setDraggingId(null);
          const id = String(active.id);
          const deltaFrames = Math.round((delta.x / pixelsPerSecond) * fps);
          if (deltaFrames !== 0) EditorActions.moveElement(id, deltaFrames);
        }}
      >
        {/* Elements */}
        {track.elements.map((el: any) => {
        const left = framesToPx(el.start, fps, pixelsPerSecond);
        const width = framesToPx(el.end - el.start, fps, pixelsPerSecond);
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
                    const df = Math.round((dx / pixelsPerSecond) * fps);
                    EditorActions.resizeElementStart(el.id, df);
                  };
                  const up = () => {
                    window.removeEventListener("pointermove", move);
                    window.removeEventListener("pointerup", up);
                  };
                  window.addEventListener("pointermove", move);
                  window.addEventListener("pointerup", up, { once: true });
                }}
              />
              {/* Draggable body */}
              <div
                id={el.id}
                className={`absolute left-2 right-2 top-0 bottom-0 rounded-md ${color} ${selected ? "ring-2 ring-cyan-400" : ""} overflow-hidden text-ellipsis whitespace-nowrap px-2 text-xs flex items-center`}
                onClick={() => EditorActions.selectElement(el.id)}
                style={{ touchAction: "none" }}
              >
                {el.type.toUpperCase()} {el.id}
              </div>
              {/* Resize handle - end */}
              <div
                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-r-md bg-gray-600/60"
                onPointerDown={(e) => {
                  e.preventDefault();
                  const startX = e.clientX;
                  const move = (ev: PointerEvent) => {
                    const dx = ev.clientX - startX;
                    const df = Math.round((dx / pixelsPerSecond) * fps);
                    EditorActions.resizeElementEnd(el.id, df);
                  };
                  const up = () => {
                    window.removeEventListener("pointermove", move);
                    window.removeEventListener("pointerup", up);
                  };
                    window.addEventListener("pointermove", move);
                    window.addEventListener("pointerup", up, { once: true });
                }}
              />
            </div>
        );
        })}
      </DndContext>
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
