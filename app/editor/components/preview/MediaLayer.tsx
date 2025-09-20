import { Suspense, useEffect, useRef, useState } from "react";
import { Html, Image, Text, useVideoTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useSnapshot } from "valtio";
import * as THREE from "three";
import type { AnyElement, ImageElement, TextElement, VideoElement } from "../../state/editor.store";
import { editorStore } from "../../state/editor.store";
import { usePlaybackClock } from "./PlaybackClock";
import { VideoSyncManager, useVideoSync } from "./VideoSyncManager";

function isVisible(el: { start: number; end: number }, timeMs: number) {
  return timeMs >= el.start && timeMs < el.end;
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

// moved to videoUtils.ts
function VideoItem({ el }: { el: VideoElement }) {
  const { register, unregister, updateMeta } = useVideoSync();
  const videoTexture = useVideoTexture(el.data.src, {
    start: false,
    muted: true,
    crossOrigin: 'anonymous',
    autoplay: false,
    loop: false,
  });

  // Configure texture filters once ready
  useEffect(() => {
    const tex = videoTexture as THREE.VideoTexture | undefined;
    if (!tex) return;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false;
  }, [videoTexture]);

  // Register with sync manager
  useEffect(() => {
    const video = (videoTexture?.image as HTMLVideoElement | undefined) ?? null;
    if (!video) return;
    // Initialize conservative defaults
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.pause();
    register(el.id, el, video, videoTexture as any);
    return () => unregister(el.id);
  }, [videoTexture, el.id]);

  // Update meta when element props change (in/out/speed)
  useEffect(() => {
    updateMeta(el.id, el);
  }, [el]);

  return (
    <mesh>
      <planeGeometry args={fitScale().slice(0, 2) as [number, number]} />
      <meshBasicMaterial map={videoTexture} toneMapped transparent={false} />
    </mesh>
  );
}

export function MediaLayer() {
  const snap = useSnapshot(editorStore);
  const clock = usePlaybackClock();
  const getTimeMs = () => clock.timeMs;
  const getIsPlaying = () => clock.isPlaying;

  // Track visible elements and rerender only when the set changes
  const [visibilityVersion, setVisibilityVersion] = useState<number>(0);
  const prevVisibleIdsRef = useRef<string[]>([]);
  useFrame(() => {
    const tms = getTimeMs();
    const current = snap.mediaTracks
      .flatMap((t) => t.elements)
      .filter((el) => isVisible(el, tms))
      .map((el) => el.id)
      .join("|");
    const prev = prevVisibleIdsRef.current.join("|");
    if (current !== prev) {
      prevVisibleIdsRef.current = current ? current.split("|") : [];
      setVisibilityVersion((v: number) => v + 1);
    }
  });

  // Recompute visible at render time (cheap) – version keeps it fresh on boundary changes
  const timeForVisibility = getTimeMs();
  const visible = snap.mediaTracks
    .flatMap((t) => t.elements)
    .filter((el) => isVisible(el, timeForVisibility));

  function VideoSyncDebugOverlay() {
    const overlayRef = useRef<HTMLDivElement | null>(null);
    const api = useVideoSync();
    useFrame(() => {
      const el = overlayRef.current;
      if (!el) return;
    const t = (clock.timeMs / 1000).toFixed(3);
      const rows: string[] = [];
      rows.push(`t(action)=${t}s, playing=${editorStore.isPlaying}`);
      const stats = api.getStats();
      stats.forEach((s) => {
        rows.push(`${s.id}: video=${s.current.toFixed(3)}s${s.drift != null ? ` drift=${s.drift.toFixed(3)}s` : ''}`);
      });
      el.textContent = rows.join("\\n");
    });
    return (
      <Html position={[-0.98, 0.5, 0.2]} transform distanceFactor={1}>
        <div ref={overlayRef} style={{
          fontFamily: 'monospace',
          fontSize: 10,
          color: '#0f0',
          background: 'rgba(0,0,0,0.6)',
          padding: '6px 8px',
          borderRadius: 4,
          whiteSpace: 'pre',
          pointerEvents: 'none',
          userSelect: 'none'
        }} />
      </Html>
    );
  }

  return (
  <VideoSyncManager>
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
      {/* Debug overlay in screen space */}
      <VideoSyncDebugOverlay />
    </group>
    </VideoSyncManager>
  );
}