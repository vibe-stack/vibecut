import { Suspense, useEffect } from "react";
import { Image, Text, useVideoTexture } from "@react-three/drei";
import { useSnapshot } from "valtio";
import type { AnyElement, ImageElement, TextElement, VideoElement } from "../../state/editor.store";
import { editorStore } from "../../state/editor.store";

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
  const localFrames = frame - el.start; // frames since element start on timeline
  if (localFrames < 0) return null;
  const speed = el.data.speed || 1;
  const sourceFrame = el.data.in + localFrames * speed;
  if (sourceFrame > el.data.out) return null;
  return sourceFrame / fps; // seconds into source
}

function VideoItem({ el }: { el: VideoElement }) {
  const snap = useSnapshot(editorStore);
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
    const t = computeVideoTime(el, snap.timeline.currentFrame, snap.timeline.fps);
    if (t == null) {
      if (!video.paused) video.pause();
      return;
    }
    // Avoid triggering play; just seek and pause to show exact frame
    try {
      if (Math.abs(video.currentTime - t) > 0.033) video.currentTime = t; // ~1 frame threshold
      if (!video.paused) video.pause();
      video.muted = true;
    } catch {}
  }, [videoTexture, snap.timeline.currentFrame, snap.timeline.fps, el]);

  return (
    <mesh>
      <planeGeometry args={fitScale().slice(0, 2) as unknown as [number, number]} />
      <meshBasicMaterial map={videoTexture as any} toneMapped={false} />
    </mesh>
  );
}

export function MediaLayer() {
  const snap = useSnapshot(editorStore);
  const frame = snap.timeline.currentFrame;

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
                <VideoItem el={el as unknown as VideoElement} />
              </group>
            );
          }
          return null;
        })}
      </Suspense>
    </group>
  );
}
