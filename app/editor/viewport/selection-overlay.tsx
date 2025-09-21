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
  // Track off() callbacks for active canvas listeners per gesture
  const moveOffRef = useRef<null | (() => void)>(null);
  const resizeOffRef = useRef<null | (() => void)>(null);
  const rotateOffRef = useRef<null | (() => void)>(null);

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
  const targetSx = base.scale.x * Math.max(0.01, w1 / Math.max(0.0001, startW));
  const targetSy = base.scale.y * Math.max(0.01, h1 / Math.max(0.0001, startH));
  const k = 0.25; // smoothing factor
  const sx = Math.max(0.08, base.scale.x + (targetSx - base.scale.x) * k);
  const sy = Math.max(0.08, base.scale.y + (targetSy - base.scale.y) * k);
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
      if (resizeOffRef.current === off) resizeOffRef.current = null;
      startPointer.current = null;
    };

    const off = addCanvasPointerListeners(onMove, onUp);
    resizeOffRef.current = off;
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
      if (rotateOffRef.current === off) rotateOffRef.current = null;
      startPointer.current = null;
    };
    const off = addCanvasPointerListeners(onMove, onUp);
    rotateOffRef.current = off;
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
      if (moveOffRef.current === off) moveOffRef.current = null;
      startPointer.current = null;
    };
    const off = addCanvasPointerListeners(onMove, onUp);
    moveOffRef.current = off;
  };

  // Larger handle sizes (doubled)
  const handleSize = 0.16;
  const rotationHandleSize = 0.2;
  const rotationHandleDistance = 0.25;

  // Pinch-to-resize gesture on the entire selection area
  const pointerIds = useRef<number[]>([]);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchCenter = useRef<{ x: number; y: number } | null>(null);
  const moveGestureActive = useRef<boolean>(false);
  const offPinchRef = useRef<null | (() => void)>(null);
  
  const onAreaPointerDown = (e: any) => {
    e.stopPropagation();
    if (e.nativeEvent?.preventDefault) e.nativeEvent.preventDefault();
    try { (e.target as Element)?.setPointerCapture?.(e.nativeEvent.pointerId); } catch {}
    // Use r3f pointer events which are pointer events; track for pinch
    const pe: PointerEvent = e.nativeEvent;
    pointerIds.current.push(pe.pointerId);
    pointers.current.set(pe.pointerId, { x: pe.clientX, y: pe.clientY });
    
    if (pointerIds.current.length === 1) {
      // Start move gesture, but mark it so we can cancel if pinch starts
      moveGestureActive.current = true;
      startMove(e);
    }
    
    if (pointerIds.current.length === 2) {
      // Cancel any active move gesture since we're starting pinch
      if (moveGestureActive.current) {
        setDragMode(null);
        cancelTransformSession(clip.id);
        moveGestureActive.current = false;
        if (moveOffRef.current) { try { moveOffRef.current(); } catch {} moveOffRef.current = null; }
      }
      // Also ensure any resize/rotate in progress are stopped
      if (resizeOffRef.current) { try { resizeOffRef.current(); } catch {} resizeOffRef.current = null; }
      if (rotateOffRef.current) { try { rotateOffRef.current(); } catch {} rotateOffRef.current = null; }
      
      // Initialize pinch distance and center
      const [a, b] = pointerIds.current;
      const pa = pointers.current.get(a)!;
      const pb = pointers.current.get(b)!;
      const dist = Math.hypot(pb.x - pa.x, pb.y - pa.y);
      const centerX = (pa.x + pb.x) / 2;
      const centerY = (pa.y + pb.y) / 2;
      
      pinchCenter.current = { x: centerX, y: centerY };
      startPointer.current = { x: centerX, y: centerY, distance: dist };
      sessionBase.current = {
        position: clip.position.clone(),
        rotation: new THREE.Euler(clip.rotation.x, clip.rotation.y, clip.rotation.z),
        scale: clip.scale.clone(),
        startW: halfWidth * 2,
        startH: halfHeight * 2,
      };
      startTransformSession(clip.id, sessionBase.current);
      setDragMode('resize'); // Set drag mode to prevent move interference

      // Attach global listeners on canvas so pinch doesn't miss pointerup/move when fingers leave
      const onPinchMove = (ev: PointerEvent) => {
        if (offPinchRef.current == null) return; // not in a pinch session anymore
        // Update this pointer position in the map
        pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        const ids = pointerIds.current;
        if (ids.length === 2 && startPointer.current?.distance && pinchCenter.current) {
          const [idA, idB] = ids;
          const pa2 = pointers.current.get(idA);
          const pb2 = pointers.current.get(idB);
          if (!pa2 || !pb2) return;
          const dist2 = Math.hypot(pb2.x - pa2.x, pb2.y - pa2.y);

          const startDist = Math.max(1, startPointer.current.distance);
          const rawMul = dist2 / startDist;
          const delta = Math.abs(rawMul - 1);
          const deadzone = 0.04;
          let mul = 1;
          if (delta > deadzone) {
            const signed = rawMul >= 1 ? 1 : -1;
            const adj = Math.log2(1 + (delta - deadzone) * 1.2) * 0.6;
            mul = 1 + signed * adj;
          }
          const scaleMul = Math.max(0.5, Math.min(2.0, mul));
          const base = sessionBase.current;
          const newScale = new THREE.Vector3(
            Math.max(0.05, base.scale.x * scaleMul),
            Math.max(0.05, base.scale.y * scaleMul),
            base.scale.z
          );
          updateTransientTransform(clip.id, { scale: newScale, position: base.position });
        }
      };

      const onPinchUp = (ev: PointerEvent) => {
        // Remove this pointer
        const idx2 = pointerIds.current.indexOf(ev.pointerId);
        if (idx2 >= 0) pointerIds.current.splice(idx2, 1);
        pointers.current.delete(ev.pointerId);

        // When we drop below 2 pointers, pinch has ended; commit immediately
        if (pointerIds.current.length < 2) {
          if (dragMode) setDragMode(null);
          pinchCenter.current = null;
          const off = offPinchRef.current;
          offPinchRef.current = null;
          if (off) off();
          commitTransformSession(clip.id, (final) => {
            if (!final) return;
            editorActions.updateClip(clip.id, { position: final.position, scale: final.scale, rotation: final.rotation });
          });
          startPointer.current = null;
        }
      };
      offPinchRef.current = addCanvasPointerListeners(onPinchMove, onPinchUp);
    }
  };
  const onAreaPointerMove = (e: any) => {
    const pe: PointerEvent = e.nativeEvent;
    if (!pointerIds.current.includes(pe.pointerId)) return;
    pointers.current.set(pe.pointerId, { x: pe.clientX, y: pe.clientY });
    if (offPinchRef.current) {
      // Let the global pinch listeners handle this gesture
      return;
    }
    
    // Only handle pinch when we have exactly 2 pointers and pinch data
    if (pointerIds.current.length === 2 && startPointer.current?.distance && pinchCenter.current) {
      e.stopPropagation();
      const [a, b] = pointerIds.current;
      const pa = pointers.current.get(a)!;
      const pb = pointers.current.get(b)!;
      const dist = Math.hypot(pb.x - pa.x, pb.y - pa.y);
      
      // Calculate new center to detect any drift
      const newCenterX = (pa.x + pb.x) / 2;
      const newCenterY = (pa.y + pb.y) / 2;
      
      // Apply a deadzone and gentle curve so tiny movements don't explode scale
      const startDist = Math.max(1, startPointer.current.distance);
      const rawMul = dist / startDist;
      const delta = Math.abs(rawMul - 1);
      const deadzone = 0.04; // ignore <4% pinch changes
      let mul = 1;
      if (delta > deadzone) {
        const signed = rawMul >= 1 ? 1 : -1;
        // Map beyond-deadzone delta with a soft curve
        const adj = Math.log2(1 + (delta - deadzone) * 1.2) * 0.6; // damped response
        mul = 1 + signed * adj;
      }
      // Additional smooth damping to previous frame scale (reads current transient base)
      const scaleMul = Math.max(0.5, Math.min(2.0, mul));
      const base = sessionBase.current;
      const newScale = new THREE.Vector3(
        Math.max(0.05, base.scale.x * scaleMul),
        Math.max(0.05, base.scale.y * scaleMul),
        base.scale.z
      );
      
      // Keep position stable - pinch should scale around center without moving the object
      updateTransientTransform(clip.id, { scale: newScale, position: base.position });
    }
  };
  const gestureStartTime = useRef<number>(0);
  const onAreaPointerUp = (e: any) => {
    const pe: PointerEvent = e.nativeEvent;
    const idx = pointerIds.current.indexOf(pe.pointerId);
    if (idx >= 0) pointerIds.current.splice(idx, 1);
    pointers.current.delete(pe.pointerId);
    if (offPinchRef.current) {
      // Pinch session is active; the global handler will commit and cleanup
      return;
    }
    
    // If we go from 2 pointers to 1, we're ending a pinch gesture - commit immediately
    if (pointerIds.current.length === 1 && pinchCenter.current) {
      pinchCenter.current = null;
      setDragMode(null);
      
      // Commit the pinch transformation immediately
      commitTransformSession(clip.id, (final) => {
        if (!final) return;
        editorActions.updateClip(clip.id, { position: final.position, scale: final.scale, rotation: final.rotation });
      });
      
      // Clear the session to prevent any interference
      startPointer.current = null;
    }
    
    if (pointerIds.current.length === 0) {
      // finish any remaining session
      if (dragMode) setDragMode(null);
      moveGestureActive.current = false;
      pinchCenter.current = null;
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