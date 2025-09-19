import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Html, Image, Text, useVideoTexture } from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import { useSnapshot } from "valtio";
import * as THREE from "three";
import type { AnyElement, ImageElement, TextElement, VideoElement } from "../../state/editor.store";
import { editorStore } from "../../state/editor.store";

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

function computeVideoTime(el: VideoElement, timeMs: number) {
  // Map timeline time to source time considering speed and in/out.
  if (timeMs < el.start || timeMs >= el.end) return null;
  const localTimeMs = timeMs - el.start; // milliseconds since element start
  const speed = el.data.speed || 1;
  const sourceTimeMs = el.data.in + localTimeMs * speed;
  const clampedSource = Math.max(el.data.in, Math.min(sourceTimeMs, el.data.out));
  return clampedSource / 1000; // Convert to seconds for video.currentTime
}

function VideoItem({ el, getTimeMs, getIsPlaying, onRegisterVideo }: { el: VideoElement; getTimeMs: () => number; getIsPlaying: () => boolean; onRegisterVideo?: (id: string, video: HTMLVideoElement | null) => void }) {
  const videoReadyRef = useRef(false);
  const lastSeekTimeRef = useRef(0);
  const lastDesiredRef = useRef<number | null>(null);
  const rVFCHandleRef = useRef<number | null>(null);
  
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
    
    const handleLoadedMetadata = () => {
      videoReadyRef.current = true;
    };
    
    const handleLoadedData = () => {
      videoReadyRef.current = true;
    };
    
    // Ensure mobile-friendly attributes
    video.muted = true;
    (video as any).playsInline = true;
  // Ensure video is ready before we try to sync it
  video.preload = "auto";
  try { video.pause(); } catch {}
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    
    // Check if already loaded
    if (video.readyState >= 1) {
      videoReadyRef.current = true;
    }

    // Register for debug overlay
    try { onRegisterVideo?.(el.id, video); } catch {}
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      try { onRegisterVideo?.(el.id, null); } catch {}
      const cancelRVFC = (video as any).cancelVideoFrameCallback?.bind(video as any);
      if (rVFCHandleRef.current != null && cancelRVFC) cancelRVFC(rVFCHandleRef.current as any);
    };
  }, [videoTexture]);

  // Configure texture flags for WebGPU video
  useEffect(() => {
    const tex = videoTexture as unknown as THREE.VideoTexture | undefined;
    if (!tex) return;
    (tex).generateMipmaps = false;
    (tex).minFilter = THREE.LinearFilter;
    (tex).magFilter = THREE.LinearFilter;
    if ((tex).colorSpace !== undefined) {
      (tex).colorSpace = (THREE).SRGBColorSpace ?? (tex).colorSpace;
    } else if ((tex).encoding !== undefined) {
      (tex).encoding = (THREE).sRGBEncoding ?? (tex).encoding;
    }
    (tex).flipY = false;
  }, [videoTexture]);

  // Drive the video via r3f frame loop based on the Three action time (single clock, paused+seek)
  useFrame(() => {
    const video = (videoTexture as any)?.image as HTMLVideoElement | undefined;
    if (!video || !videoReadyRef.current) return;
    const timeMs = getTimeMs();
    const desired = computeVideoTime(el, timeMs);
    if (desired == null) {
      try { if (!video.paused) video.pause(); } catch {}
      hasFrameRef.current = false;
      if (meshRef.current) meshRef.current.visible = false;
      return;
    }
    const now = performance.now();
    const frameTol = 1 / 60; // ~16ms
    // Always pause and set exact time based on the action to avoid dual clocks
    try { if (!video.paused) video.pause(); } catch {}
    const lastDesired = lastDesiredRef.current ?? -Infinity;
    if (Math.abs(desired - lastDesired) > frameTol && (now - lastSeekTimeRef.current) > 6) {
      try {
        // Cancel any pending rVFC for old target if supported
        const cancelRVFC = (video as any).cancelVideoFrameCallback?.bind(video as any);
        if (rVFCHandleRef.current != null && cancelRVFC) cancelRVFC(rVFCHandleRef.current as any);
        rVFCHandleRef.current = null;
        hasFrameRef.current = false;
        video.currentTime = desired;
        targetTimeRef.current = desired;
        lastSeekTimeRef.current = now;
        lastDesiredRef.current = desired;
      } catch {}
    }

    // Request GPU texture update when the browser produces a new frame
    const tex = videoTexture as any;
    if (typeof (video as any).requestVideoFrameCallback === 'function') {
      if (rVFCHandleRef.current == null) {
        rVFCHandleRef.current = (video as any).requestVideoFrameCallback((_: any, metadata: any) => {
          rVFCHandleRef.current = null;
          const mediaTime: number = metadata?.mediaTime ?? (video.currentTime ?? 0);
          const target = targetTimeRef.current;
          if (target != null && Math.abs(mediaTime - target) <= frameTol) {
            if (tex) tex.needsUpdate = true;
            hasFrameRef.current = true;
          } else {
            // Not yet matching the target; schedule another callback
            rVFCHandleRef.current = (video as any).requestVideoFrameCallback((_: any, md: any) => {
              rVFCHandleRef.current = null;
              const mt: number = md?.mediaTime ?? (video.currentTime ?? 0);
              if (targetTimeRef.current != null && Math.abs(mt - targetTimeRef.current) <= frameTol) {
                if (tex) tex.needsUpdate = true;
                hasFrameRef.current = true;
              }
            });
          }
        });
      }
    } else {
      // Fallback: mark for update regularly
      if (tex) tex.needsUpdate = true;
      hasFrameRef.current = true;
    }

    // Reflect visibility based on whether a decoded frame was uploaded
    //if (meshRef.current) meshRef.current.visible = hasFrameRef.current;
  });

  return (
    <mesh visible={true}>
      <planeGeometry args={fitScale().slice(0, 2) as unknown as [number, number]} />
      <meshBasicMaterial 
        map={videoTexture as any} 
        toneMapped={false} 
        transparent={false}
        alphaTest={0}
      />
    </mesh>
  );
}

export function MediaLayer() {
  const snap = useSnapshot(editorStore);
  // Capture the action reference once; it is updated by PlaybackDriver, but we won't store time in Valtio
  const actionRef = useRef<any>(null);
  useEffect(() => {
    actionRef.current = editorStore.playback.action;
  });

  // Provide a function that reads time in ms directly from the Three action (fast)
  const getTimeMs = () => {
    const action = actionRef.current as any;
    const t = action ? action.time : 0;
    return (t || 0) * 1000;
  };

  // Provide a getter for playing state that does not subscribe the component
  const getIsPlaying = () => editorStore.isPlaying;

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

  // Debug overlay: track current videos and times without subscribing to store
  const debugVideosRef = useRef<Map<string, HTMLVideoElement | null>>(new Map());
  const onRegisterVideo = (id: string, video: HTMLVideoElement | null) => {
    debugVideosRef.current.set(id, video);
  };

  const overlayRef = useRef<HTMLDivElement | null>(null);
  useFrame(() => {
    const el = overlayRef.current;
    if (!el) return;
    const t = (actionRef.current?.time ?? 0).toFixed(3);
    const rows: string[] = [];
    rows.push(`t(action)=${t}s, playing=${editorStore.isPlaying}`);
    // Map IDs to elements for drift calculation
  const elementsById = new Map<string, AnyElement>();
  editorStore.mediaTracks.flatMap((tr) => tr.elements).forEach((e) => elementsById.set(e.id, e as AnyElement));
    debugVideosRef.current.forEach((v, id) => {
      if (!v) return;
      const ct = (v.currentTime ?? 0).toFixed(3);
      const elx = elementsById.get(id) as any;
      const desired = elx && elx.type === 'video' ? computeVideoTime(elx as any, (actionRef.current?.time ?? 0) * 1000) : null;
      const drift = desired != null ? (desired - (v.currentTime ?? 0)) : null;
      rows.push(`${id}: video=${ct}s${drift != null ? ` drift=${drift.toFixed(3)}s` : ''}`);
    });
    el.textContent = rows.join("\n");
  });

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
                <VideoItem el={el as unknown as VideoElement} getTimeMs={getTimeMs} getIsPlaying={getIsPlaying} onRegisterVideo={onRegisterVideo} />
              </group>
            );
          }
          return null;
        })}
      </Suspense>
      {/* Debug overlay in screen space */}
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
    </group>
  );
}
