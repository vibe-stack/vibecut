import { useEffect, useRef } from 'react';

export interface AutoScrollOptions {
  container: HTMLElement | null;
  /** px from edge to start autoscroll */
  edgeDistance?: number;
  /** px per frame scroll speed, scales as pointer gets closer to edge */
  maxSpeed?: number;
  /** supply latest pointer coordinates to drive autoscroll (recommended) */
  getPointer?: () => { x: number; y: number } | null;
}

/**
 * Imperative autoscroll helper for DnD. Call start on drag start and update on every pointer move.
 */
export const useAutoscroll = ({ container, edgeDistance = 80, maxSpeed = 24, getPointer }: AutoScrollOptions) => {
  const raf = useRef<number | null>(null);
  const state = useRef({ vx: 0, vy: 0 });

  const stop = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    state.current.vx = 0;
    state.current.vy = 0;
  };

  useEffect(() => stop, []);

  const frame = () => {
    if (!container) return;
    // If we have a pointer provider, recompute velocity continuously to avoid runaway scroll
    if (getPointer) {
      const p = getPointer();
      if (p) {
        const rect = container.getBoundingClientRect();
        let vx = 0;
        if (p.x - rect.left < edgeDistance) {
          const t = Math.max(0, edgeDistance - (p.x - rect.left)) / edgeDistance;
          vx = -Math.ceil(t * maxSpeed);
        } else if (rect.right - p.x < edgeDistance) {
          const t = Math.max(0, edgeDistance - (rect.right - p.x)) / edgeDistance;
          vx = Math.ceil(t * maxSpeed);
        }
        let vy = 0;
        if (p.y - rect.top < edgeDistance) {
          const t = Math.max(0, edgeDistance - (p.y - rect.top)) / edgeDistance;
          vy = -Math.ceil(t * maxSpeed);
        } else if (rect.bottom - p.y < edgeDistance) {
          const t = Math.max(0, edgeDistance - (rect.bottom - p.y)) / edgeDistance;
          vy = Math.ceil(t * maxSpeed);
        }
        state.current.vx = vx;
        state.current.vy = vy;
      }
    }

    const { vx, vy } = state.current;
    if (vx !== 0 || vy !== 0) {
      container.scrollLeft += vx;
      container.scrollTop += vy;
      raf.current = requestAnimationFrame(frame);
    } else {
      raf.current = null;
    }
  };

  const update = (clientX: number, clientY: number) => {
    if (!container) return;
    const rect = container.getBoundingClientRect();

    // Horizontal speed
    let vx = 0;
    if (clientX - rect.left < edgeDistance) {
      const t = Math.max(0, edgeDistance - (clientX - rect.left)) / edgeDistance;
      vx = -Math.ceil(t * maxSpeed);
    } else if (rect.right - clientX < edgeDistance) {
      const t = Math.max(0, edgeDistance - (rect.right - clientX)) / edgeDistance;
      vx = Math.ceil(t * maxSpeed);
    }

    // Vertical speed
    let vy = 0;
    if (clientY - rect.top < edgeDistance) {
      const t = Math.max(0, edgeDistance - (clientY - rect.top)) / edgeDistance;
      vy = -Math.ceil(t * maxSpeed);
    } else if (rect.bottom - clientY < edgeDistance) {
      const t = Math.max(0, edgeDistance - (rect.bottom - clientY)) / edgeDistance;
      vy = Math.ceil(t * maxSpeed);
    }

    state.current.vx = vx;
    state.current.vy = vy;

    if ((vx !== 0 || vy !== 0) && raf.current == null) {
      raf.current = requestAnimationFrame(frame);
    }
    if (vx === 0 && vy === 0 && raf.current != null) {
      // will stop on next frame
    }
  };

  return { update, stop };
};
