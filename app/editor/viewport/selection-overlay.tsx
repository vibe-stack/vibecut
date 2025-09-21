import React, { useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { editorActions } from '../shared/store';
import type { ActiveClip } from '../shared/types';
import {
  startTransformSession,
  updateTransientTransform,
  commitTransformSession,
  cancelTransformSession,
} from './interactions/transform-sessions';

interface SelectionOverlayProps {
  clip: ActiveClip;
  halfWidth: number;
  halfHeight: number;
  isVisible: boolean;
  onStartMove?: (e: any) => void;
}

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  clip,
  halfWidth,
  halfHeight,
  isVisible,
  onStartMove,
}) => {
  const { camera, size } = useThree();
  const [dragMode, setDragMode] = useState<'resize' | 'rotate' | 'move' | null>(null);
  const sessionBase = useRef({
    position: clip.position.clone(),
    rotation: new THREE.Euler(clip.rotation.x, clip.rotation.y, clip.rotation.z),
    scale: clip.scale.clone(),
    startW: halfWidth * 2,
    startH: halfHeight * 2,
  });
  const startPointer = useRef<{ x: number; y: number; distance?: number } | null>(null);

  const canvasEl = useMemo(() => {
    return (document.querySelector('canvas') as HTMLCanvasElement) || null;
  }, []);

  function addCanvasPointerListeners(move: (e: PointerEvent) => void, up: (e: PointerEvent) => void) {
    if (!canvasEl) return () => {};
    canvasEl.addEventListener('pointermove', move, { passive: false });
    canvasEl.addEventListener('pointerup', up, { passive: false });
    canvasEl.addEventListener('pointercancel', up, { passive: false });
    return () => {
      canvasEl.removeEventListener('pointermove', move);
      canvasEl.removeEventListener('pointerup', up);
      canvasEl.removeEventListener('pointercancel', up);
    };
  }

  const startResize = (e: any) => {
    e.stopPropagation();
    if (e.nativeEvent?.preventDefault) e.nativeEvent.preventDefault();
    try { (e.target as Element)?.setPointerCapture?.(e.nativeEvent.pointerId); } catch {}
    setDragMode('resize');
    startPointer.current = { x: e.clientX, y: e.clientY };
    sessionBase.current = {
      position: clip.position.clone(),
      rotation: new THREE.Euler(clip.rotation.x, clip.rotation.y, clip.rotation.z),
      scale: clip.scale.clone(),
      startW: halfWidth * 2,
      startH: halfHeight * 2,
    };
    startTransformSession(clip.id, sessionBase.current);

    const onMove = (ev: PointerEvent) => {
      if (!startPointer.current) return;
      ev.preventDefault();
      const cam = camera as THREE.PerspectiveCamera;
      const distance = Math.abs(cam.position.z - clip.position.z);
      const vH = 2 * Math.tan((cam.fov * Math.PI) / 360) * distance;
      const vW = (vH * size.width) / size.height;
      const perPxX = vW / size.width;
      const perPxY = vH / size.height;
      const dx = (ev.clientX - startPointer.current.x) * perPxX;
      const dy = (ev.clientY - startPointer.current.y) * perPxY;

      // Top-left pivot: moving bottom-right handle: scale x by dx, y by dy; adjust position to keep TL fixed
      const base = sessionBase.current;
      // Convert dx/dy (world units) into new scale relative to start size
  const startW = sessionBase.current.startW;
  const startH = sessionBase.current.startH;
      const w1 = startW + dx; // treat dragging right as increasing width
      const h1 = startH + dy; // dragging down increases height
      const sx = Math.max(0.05, base.scale.x * Math.max(0.01, w1 / Math.max(0.0001, startW)));
      const sy = Math.max(0.05, base.scale.y * Math.max(0.01, h1 / Math.max(0.0001, startH)));
      const newScale = new THREE.Vector3(sx, sy, base.scale.z);
      const w0 = startW;
      const h0 = startH;
      const dw = w1 - w0;
      const dh = h1 - h0;
      // Shift position by half delta to keep top-left as pivot (local space, y increases up)
      const newPos = new THREE.Vector3(
        base.position.x + dw / 2,
        base.position.y - dh / 2,
        base.position.z
      );

      updateTransientTransform(clip.id, { scale: newScale, position: newPos });
    };

    const onUp = (_ev: PointerEvent) => {
      setDragMode(null);
      commitTransformSession(clip.id, (final) => {
        editorActions.updateClip(clip.id, {
          position: final.position,
          scale: final.scale,
        });
      });
      off();
      startPointer.current = null;
    };

    const off = addCanvasPointerListeners(onMove, onUp);
  };

  const startRotate = (e: any) => {
    e.stopPropagation();
    if (e.nativeEvent?.preventDefault) e.nativeEvent.preventDefault();
    try { (e.target as Element)?.setPointerCapture?.(e.nativeEvent.pointerId); } catch {}
    setDragMode('rotate');
    startPointer.current = { x: e.clientX, y: e.clientY };
    sessionBase.current = {
      position: clip.position.clone(),
      rotation: new THREE.Euler(clip.rotation.x, clip.rotation.y, clip.rotation.z),
      scale: clip.scale.clone(),
      startW: halfWidth * 2,
      startH: halfHeight * 2,
    };
    startTransformSession(clip.id, sessionBase.current);

    const onMove = (ev: PointerEvent) => {
      if (!startPointer.current) return;
      ev.preventDefault();
      const dx = (ev.clientX - startPointer.current.x) * 0.01;
      const base = sessionBase.current;
      const newRot = new THREE.Euler(base.rotation.x, base.rotation.y, base.rotation.z - dx);
      updateTransientTransform(clip.id, { rotation: newRot });
    };
    const onUp = (_ev: PointerEvent) => {
      setDragMode(null);
      commitTransformSession(clip.id, (final) => {
        editorActions.updateClip(clip.id, { rotation: final.rotation });
      });
      off();
      startPointer.current = null;
    };
    const off = addCanvasPointerListeners(onMove, onUp);
  };

  const startMove = (e: any) => {
    e.stopPropagation();
    if (e.nativeEvent?.preventDefault) e.nativeEvent.preventDefault();
    try { (e.target as Element)?.setPointerCapture?.(e.nativeEvent.pointerId); } catch {}
    setDragMode('move');
    startPointer.current = { x: e.clientX, y: e.clientY };
    sessionBase.current = {
      position: clip.position.clone(),
      rotation: new THREE.Euler(clip.rotation.x, clip.rotation.y, clip.rotation.z),
      scale: clip.scale.clone(),
      startW: halfWidth * 2,
      startH: halfHeight * 2,
    };
    startTransformSession(clip.id, sessionBase.current);

    const onMove = (ev: PointerEvent) => {
      if (!startPointer.current) return;
      ev.preventDefault();
      const cam = camera as THREE.PerspectiveCamera;
      const distance = Math.abs(cam.position.z - clip.position.z);
      const vH = 2 * Math.tan((cam.fov * Math.PI) / 360) * distance;
      const vW = (vH * size.width) / size.height;
      const perPxX = vW / size.width;
      const perPxY = vH / size.height;
      const dx = (ev.clientX - startPointer.current.x) * perPxX;
      const dy = (ev.clientY - startPointer.current.y) * perPxY;
      const base = sessionBase.current;
      const newPos = new THREE.Vector3(
        base.position.x + dx,
        base.position.y - dy,
        base.position.z
      );
      updateTransientTransform(clip.id, { position: newPos });
    };
    const onUp = (_ev: PointerEvent) => {
      setDragMode(null);
      commitTransformSession(clip.id, (final) => {
        editorActions.updateClip(clip.id, { position: final.position });
      });
      off();
      startPointer.current = null;
    };
    const off = addCanvasPointerListeners(onMove, onUp);
  };

  // Larger handle sizes (doubled)
  const handleSize = 0.16;
  const rotationHandleSize = 0.2;
  const rotationHandleDistance = 0.25;

  // Pinch-to-resize gesture on the entire selection area
  const pointerIds = useRef<number[]>([]);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const onAreaPointerDown = (e: any) => {
    e.stopPropagation();
    if (e.nativeEvent?.preventDefault) e.nativeEvent.preventDefault();
    try { (e.target as Element)?.setPointerCapture?.(e.nativeEvent.pointerId); } catch {}
    // Use r3f pointer events which are pointer events; track for pinch
    const pe: PointerEvent = e.nativeEvent;
    pointerIds.current.push(pe.pointerId);
    pointers.current.set(pe.pointerId, { x: pe.clientX, y: pe.clientY });
    if (pointerIds.current.length === 1) {
      // start move normally
      startMove(e);
    }
    if (pointerIds.current.length === 2) {
      // initialize pinch distance
      const [a, b] = pointerIds.current;
      const pa = pointers.current.get(a)!;
      const pb = pointers.current.get(b)!;
      const dist = Math.hypot(pb.x - pa.x, pb.y - pa.y);
      startPointer.current = { x: 0, y: 0, distance: dist };
      sessionBase.current = {
        position: clip.position.clone(),
        rotation: new THREE.Euler(clip.rotation.x, clip.rotation.y, clip.rotation.z),
        scale: clip.scale.clone(),
        startW: halfWidth * 2,
        startH: halfHeight * 2,
      };
      startTransformSession(clip.id, sessionBase.current);
    }
  };
  const onAreaPointerMove = (e: any) => {
    const pe: PointerEvent = e.nativeEvent;
    if (!pointerIds.current.includes(pe.pointerId)) return;
    pointers.current.set(pe.pointerId, { x: pe.clientX, y: pe.clientY });
    if (pointerIds.current.length === 2 && startPointer.current?.distance) {
      e.stopPropagation();
      const [a, b] = pointerIds.current;
      const pa = pointers.current.get(a)!;
      const pb = pointers.current.get(b)!;
      const dist = Math.hypot(pb.x - pa.x, pb.y - pa.y);
      const scaleMul = dist / startPointer.current.distance;
      const base = sessionBase.current;
      const newScale = new THREE.Vector3(
        Math.max(0.05, base.scale.x * scaleMul),
        Math.max(0.05, base.scale.y * scaleMul),
        base.scale.z
      );
      // Center pivot for pinch: keep position unchanged
      updateTransientTransform(clip.id, { scale: newScale });
    }
  };
  const onAreaPointerUp = (e: any) => {
    const pe: PointerEvent = e.nativeEvent;
    const idx = pointerIds.current.indexOf(pe.pointerId);
    if (idx >= 0) pointerIds.current.splice(idx, 1);
    pointers.current.delete(pe.pointerId);
    if (pointerIds.current.length === 0) {
      // finish any session
      if (dragMode) setDragMode(null);
      commitTransformSession(clip.id, (final) => {
        if (!final) return;
        editorActions.updateClip(clip.id, { position: final.position, scale: final.scale, rotation: final.rotation });
      });
      startPointer.current = null;
    }
  };

  // Only skip rendering after hooks are declared to preserve hook order between renders
  if (!isVisible) return null;

  return (
    <group>
      {/* AABB outline */}
      <Line
        points={[
          [-halfWidth, -halfHeight, 0.001],
          [halfWidth, -halfHeight, 0.001],
          [halfWidth, halfHeight, 0.001],
          [-halfWidth, halfHeight, 0.001],
          [-halfWidth, -halfHeight, 0.001],
        ]}
        color="#00e5ff"
        lineWidth={2}
      />

      {/* Invisible move handle covering the entire clip area */}
      <mesh
        position={[0, 0, 0.001]}
        onPointerDown={onStartMove || onAreaPointerDown}
        onPointerMove={onAreaPointerMove}
        onPointerUp={onAreaPointerUp}
        visible={false}
      >
        <planeGeometry args={[halfWidth * 2, halfHeight * 2]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      
      {/* Corner resize handles */}
      <mesh
        position={[halfWidth, halfHeight, 0.002]}
        onPointerDown={startResize}
      >
        <circleGeometry args={[handleSize, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      <mesh
        position={[-halfWidth, halfHeight, 0.002]}
        onPointerDown={startResize}
      >
        <circleGeometry args={[handleSize, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      <mesh
        position={[halfWidth, -halfHeight, 0.002]}
        onPointerDown={startResize}
      >
        <circleGeometry args={[handleSize, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      <mesh
        position={[-halfWidth, -halfHeight, 0.002]}
        onPointerDown={startResize}
      >
        <circleGeometry args={[handleSize, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      {/* Rotation handle */}
      <mesh
        position={[0, halfHeight + rotationHandleDistance, 0.002]}
        onPointerDown={startRotate}
      >
        <circleGeometry args={[rotationHandleSize, 16]} />
        <meshBasicMaterial color="#ffcc00" />
      </mesh>

      {/* Line connecting rotation handle to the clip */}
      <Line
        points={[
          [0, halfHeight, 0.001],
          [0, halfHeight + rotationHandleDistance, 0.001],
        ]}
        color="#ffcc00"
        lineWidth={1}
      />
    </group>
  );
};

export default SelectionOverlay;