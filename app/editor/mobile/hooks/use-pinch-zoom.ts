import { useCallback, useRef } from 'react';
import { editorActions } from '../../shared/store';

// Simple pinch-to-zoom for touch surfaces
export const usePinchZoom = () => {
  const startDistanceRef = useRef<number | null>(null);

  const getDistance = (touches: ArrayLike<Touch>) => {
    if (touches.length < 2) return 0;
    const t0 = touches[0] as Touch;
    const t1 = touches[1] as Touch;
    const dx = t0.clientX - t1.clientX;
    const dy = t0.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
  startDistanceRef.current = getDistance(e.touches as unknown as ArrayLike<Touch>);
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && startDistanceRef.current) {
  const current = getDistance(e.touches as unknown as ArrayLike<Touch>);
      const delta = (current - startDistanceRef.current) / 50; // sensitivity
      if (Math.abs(delta) > 0.05) {
        editorActions.adjustTimelineZoom(delta);
        startDistanceRef.current = current;
      }
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    startDistanceRef.current = null;
  }, []);

  return { onTouchStart, onTouchMove, onTouchEnd };
};

export default usePinchZoom;
