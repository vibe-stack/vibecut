import { useEffect, useRef } from 'react';
import editorStore, { editorActions } from '../../shared/store';

type RefLike = { current: HTMLElement | null };

function distance(a: Touch, b: Touch) {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}

function midpointX(a: Touch, b: Touch) {
  return (a.clientX + b.clientX) / 2;
}

function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node: HTMLElement | null = el?.parentElement ?? null;
  while (node) {
    const style = getComputedStyle(node);
    const overflowX = style.overflowX;
    const overflowY = style.overflowY;
    if (
      (node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth) &&
      (overflowX === 'auto' || overflowX === 'scroll' || overflowY === 'auto' || overflowY === 'scroll')
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

export function useTimelinePinchZoom(contentEl: RefLike) {
  const stateRef = useRef<{
    startDist: number;
    startZoom: number;
    anchorContentX: number; // content x in the scroll container we want to keep fixed
  } | null>(null);

  useEffect(() => {
    const el = contentEl.current;
    if (!el) return;
    const scrollContainer = getScrollParent(el);
    if (!scrollContainer) return;

    const TRACK_HEADER_PX = 192;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // prevent scroll/zoom of the page and keep gesture in our control
        try { e.preventDefault(); } catch {}
        e.stopPropagation();
        const [t1, t2] = [e.touches[0], e.touches[1]];
        const dist = distance(t1, t2);
        const midX = midpointX(t1, t2);
        const contentX = scrollContainer.scrollLeft + midX; // x in scroll container coords
        const timeAtMid = Math.max(0, (contentX - TRACK_HEADER_PX) / editorStore.timelineZoom);
        stateRef.current = {
          startDist: dist,
          startZoom: editorStore.timelineZoom,
          anchorContentX: TRACK_HEADER_PX + timeAtMid * editorStore.timelineZoom,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const st = stateRef.current;
      if (!st) return;
      if (e.touches.length !== 2) return;
      try { e.preventDefault(); } catch {}
      e.stopPropagation();
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const newDist = distance(t1, t2);
      if (st.startDist <= 0) return;
      const scale = newDist / st.startDist;

      // compute new zoom with limits
      const targetZoom = Math.min(100, Math.max(1, st.startZoom * scale));
      if (targetZoom === editorStore.timelineZoom) return;

      // Keep the anchor time at the same screen position by adjusting scrollLeft
      const anchorTime = (st.anchorContentX - TRACK_HEADER_PX) / st.startZoom;
      editorActions.setTimelineZoom(targetZoom);
      const newAnchorContentX = TRACK_HEADER_PX + anchorTime * targetZoom;
      const dx = newAnchorContentX - st.anchorContentX;
      scrollContainer.scrollLeft += dx;
    };

    const endGesture = () => {
      stateRef.current = null;
    };

    // Non-passive to allow preventDefault for iOS Safari
  // Use capture so we act before other listeners (like DnD sensors) and reliably prevent default
  // Attach to both the scroll container AND the timeline content root to catch touches on clips/ruler
  const options: AddEventListenerOptions = { passive: false, capture: true };
  scrollContainer.addEventListener('touchstart', onTouchStart as EventListener, options);
  scrollContainer.addEventListener('touchmove', onTouchMove as EventListener, options);
  el.addEventListener('touchstart', onTouchStart as EventListener, options);
  el.addEventListener('touchmove', onTouchMove as EventListener, options);
    scrollContainer.addEventListener('touchend', endGesture as EventListener);
    scrollContainer.addEventListener('touchcancel', endGesture as EventListener);

    return () => {
      scrollContainer.removeEventListener('touchstart', onTouchStart as EventListener, true as any);
      scrollContainer.removeEventListener('touchmove', onTouchMove as EventListener, true as any);
      el.removeEventListener('touchstart', onTouchStart as EventListener, true as any);
      el.removeEventListener('touchmove', onTouchMove as EventListener, true as any);
      scrollContainer.removeEventListener('touchend', endGesture as EventListener);
      scrollContainer.removeEventListener('touchcancel', endGesture as EventListener);
    };
  }, [contentEl]);
}
