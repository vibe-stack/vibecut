import { useEffect } from 'react';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from '../../shared/store';

/**
 * Syncs the playhead time to the horizontal center of the nearest scroll container
 * when playback is idle. During active playback, scrolling does not affect time.
 */
type RefLike = { current: HTMLElement | null };

export function useScrollSyncedPlayhead(contentEl: RefLike) {
  const snap = useSnapshot(editorStore);

  useEffect(() => {
    if (!contentEl.current) return;

    // Find the nearest scrollable parent (overflow auto/scroll)
    const getScrollParent = (el: HTMLElement | null): HTMLElement | null => {
      let node: HTMLElement | null = el?.parentElement ?? null;
      while (node) {
        const style = getComputedStyle(node);
        const overflowX = style.overflowX;
        const overflowY = style.overflowY;
        if (
          node.scrollHeight > node.clientHeight ||
          node.scrollWidth > node.clientWidth
        ) {
          if (
            overflowX === 'auto' || overflowX === 'scroll' ||
            overflowY === 'auto' || overflowY === 'scroll'
          ) {
            return node;
          }
        }
        node = node.parentElement;
      }
      return null;
    };

    const scrollContainer = getScrollParent(contentEl.current);
    if (!scrollContainer) return;

    const TRACK_HEADER_PX = 192;

    const updateFromCenter = () => {
      if (editorStore.playback.isPlaying) return; // Ignore while playing
      if ((editorStore as any).isPinchZooming) return; // Do not move time when pinch zooming
      const centerContentX = scrollContainer.scrollLeft + scrollContainer.clientWidth / 2;
      const x = centerContentX - TRACK_HEADER_PX;
      const time = x / editorStore.timelineZoom;
      // Clamp to valid range
      const clamped = Math.max(0, Math.min(time, editorStore.totalDuration));
      editorActions.seekTo(clamped);
    };

    const handleScroll = () => {
      // Debounce unnecessary work by scheduling in rAF
      requestAnimationFrame(updateFromCenter);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    // Initialize once on mount only when idle
    if (!editorStore.playback.isPlaying && !(editorStore as any).isPinchZooming) {
      updateFromCenter();
    }

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll as EventListener);
      window.removeEventListener('resize', handleScroll);
    };
  }, [contentEl, snap.playback.isPlaying, snap.timelineZoom, snap.totalDuration]);

  // When time changes (via keyboard, controls, etc.), center the scroll on the playhead if idle
  useEffect(() => {
    const el = contentEl.current as HTMLElement | null;
    if (!el) return;

    // Find scroll parent again (cheap)
    const getScrollParent = (node: HTMLElement | null): HTMLElement | null => {
      let p: HTMLElement | null = node?.parentElement ?? null;
      while (p) {
        const style = getComputedStyle(p);
        const overflowX = style.overflowX;
        const overflowY = style.overflowY;
        if (
          (p.scrollHeight > p.clientHeight || p.scrollWidth > p.clientWidth) &&
          (overflowX === 'auto' || overflowX === 'scroll' || overflowY === 'auto' || overflowY === 'scroll')
        ) {
          return p;
        }
        p = p.parentElement;
      }
      return null;
    };

    const scrollContainer = getScrollParent(el);
    if (!scrollContainer) return;
  if (editorStore.playback.isPlaying) return; // Only when idle
  if ((editorStore as any).isPinchZooming) return; // Don't fight pinch zoom adjustments

    const TRACK_HEADER_PX = 192;
    const targetContentX = TRACK_HEADER_PX + editorStore.playback.currentTime * editorStore.timelineZoom;
  const desiredScrollLeft = targetContentX - scrollContainer.clientWidth / 2;

    // Clamp scrollLeft
    const maxScrollLeft = Math.max(0, scrollContainer.scrollWidth - scrollContainer.clientWidth);
  let clampedScrollLeft = Math.max(0, Math.min(desiredScrollLeft, maxScrollLeft));
  if (clampedScrollLeft < 1) clampedScrollLeft = 0; // help iOS reach exact 0

    // Only adjust if meaningfully different to avoid jitter with scroll-driven updates
    if (Math.abs(scrollContainer.scrollLeft - clampedScrollLeft) > 0.5) {
      scrollContainer.scrollLeft = clampedScrollLeft;
    }
  }, [contentEl, snap.playback.currentTime, snap.playback.isPlaying, snap.timelineZoom]);
}
