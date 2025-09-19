import { Suspense, useEffect, useMemo } from "react";
import { Image, Text, useVideoTexture } from "@react-three/drei";
import { useSnapshot } from "valtio";
import type { AnyElement, ImageElement, TextElement, VideoElement } from "../../state/editor.store";
import { editorStore } from "../../state/editor.store";
import { usePlaybackTime } from "../../hooks/usePlaybackTime";

function isVisible(el: { start: number; end: number }, frame: number) {
  return frame >= el.start && frame < el.end;
}

function fitScale(width = 1.6, height = 0.9): [number, number] {
  // Fit into a 16:9 area spanning roughly the viewport in our ortho scene
  return [width, height];
}

function TextItem({ el }: { el: TextElement }) {
  const color = el.data.color ?? "#e5e7eb";
  return (
    <Text fontSize={0.12} color={color} anchorX="center" anchorY="middle">
      {el.data.text}
    </Text>
  );
}

function ImageItem({ el }: { el: ImageElement }) {
  return <Image url={el.data.src} scale={fitScale()} transparent toneMapped={false} />;
}

function computeVideoTime(el: VideoElement, frame: number, fps: number) {
  // Map timeline frame to source frame considering speed and in/out.
  // element.start/end are timeline frames; el.data.in/out are source frames (inclusive/out-exclusive semantics assumed)
  if (frame < el.start || frame >= el.end) return null;
  const localFrames = frame - el.start; // frames since element start on timeline
  const speed = el.data.speed || 1;
  const sourceFrame = el.data.in + localFrames * speed;
  const clampedSource = Math.max(el.data.in, Math.min(sourceFrame, el.data.out));
  return clampedSource / fps;
}

function VideoItem({ el, frame, fps, isPlaying }: { el: VideoElement; frame: number; fps: number; isPlaying: boolean }) {
  const videoTexture = useVideoTexture(el.data.src, {
    start: false,
    muted: true,
    crossOrigin: "anonymous",
    autoplay: false,
    loop: false,
  });

  // Keep video element in sync with timeline time
  useEffect(() => {
    const video = (videoTexture as any)?.image as HTMLVideoElement | undefined;
    if (!video) return;
    // Ensure mobile-friendly attributes
    video.muted = true;
    (video as any).playsInline = true;
  }, [videoTexture]);

  useEffect(() => {
    const video = (videoTexture as any)?.image as HTMLVideoElement | undefined;
    if (!video) return;
    const desired = computeVideoTime(el, frame, fps);
    // Hide early if out of range
    if (desired == null) {
      try { if (!video.paused) video.pause(); } catch {}
      return;
    }
    const drift = Math.abs(video.currentTime - desired);
    if (isPlaying) {
      // Reduce excessive seeking to avoid visible flashes
      if (drift > 0.12) {
        try { video.currentTime = desired; } catch {}
      }
      // Play if paused
      if (video.paused) {
        void video.play().catch(() => {});
      }
    } else {
      // When paused, ensure exact frame without causing repeat seeks
      if (drift > 0.005) {
        try { video.currentTime = desired; } catch {}
      }
      try { if (!video.paused) video.pause(); } catch {}
    }
  }, [videoTexture, frame, fps, isPlaying, el]);

  return (
    <mesh>
      <planeGeometry args={fitScale().slice(0, 2) as unknown as [number, number]} />
  <meshBasicMaterial map={videoTexture as any} toneMapped={false} />
    </mesh>
  );
}

export function MediaLayer() {
  const snap = useSnapshot(editorStore);
  const time = usePlaybackTime();
  const frame = useMemo(() => Math.floor(time * snap.timeline.fps), [time, snap.timeline.fps]);

  const visible = snap.mediaTracks
    .flatMap((t) => t.elements)
    .filter((el) => isVisible(el, frame));

  return (
    <group>
      <Suspense fallback={null}>
  {visible.map((el, i) => {
          const z = 0.01 * i; // simple stacking
          if (el.type === "text") {
            return (
              <group key={el.id} position={[0, 0, z]}>
                <TextItem el={el as unknown as TextElement} />
              </group>
            );
          }
          if (el.type === "image") {
            return (
              <group key={el.id} position={[0, 0, z]}>
                <ImageItem el={el as unknown as ImageElement} />
              </group>
            );
          }
          if (el.type === "video") {
            return (
              <group key={el.id} position={[0, 0, z]}>
                <VideoItem el={el as unknown as VideoElement} frame={frame} fps={snap.timeline.fps} isPlaying={snap.isPlaying} />
              </group>
            );
          }
          return null;
        })}
      </Suspense>
    </group>
  );
}
