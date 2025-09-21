import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from '../../shared/store';
import type { Clip, Track } from '../../shared/types';
import { findNearestFreePlacement } from '../utils/timeline-collision';
import { useAutoscroll } from './use-autoscroll';

type DragState = {
    isDragging: boolean;
    clipId: string | null;
    originTrackId: string | null;
    startPosition: { x: number; y: number };
    currentPosition: { x: number; y: number };
    pointerOffsetX: number;
    hoveredTrackId: string | null;
    startScrollLeft: number;
};

type DragHandlers = {
    onDragStart: (clipId: string, trackId: string, pointerOffsetX: number) => void;
    onDragMove: (x: number, y: number) => void;
    onDragEnd: () => void;
};

export interface UseTimelineDndOptions {
    pixelsPerSecond: number;
    scrollContainer: HTMLElement | null;
    trackSwitchThreshold?: number;
}

export const useTimelineDnd = ({
    pixelsPerSecond,
    scrollContainer,
    trackSwitchThreshold = 18
}: UseTimelineDndOptions) => {
    const s = useSnapshot(editorStore);
    const [dragState, setDragState] = useState<DragState>({
        isDragging: false,
        clipId: null,
        originTrackId: null,
        startPosition: { x: 0, y: 0 },
        currentPosition: { x: 0, y: 0 },
        pointerOffsetX: 0,
        hoveredTrackId: null,
        startScrollLeft: 0,
    });

    const timelineRef = useRef<HTMLElement | null>(null);
    const [scrollTick, setScrollTick] = useState(0);
    const { update: updateAutoScroll, stop: stopAutoScroll } = useAutoscroll({
        container: scrollContainer,
        edgeDistance: 45,
        maxSpeed: 9,
        getPointer: () => dragState.currentPosition,
    });

    // Find which track is under the current pointer position
    const findTrackUnderPointer = useCallback((x: number, y: number): string | null => {
        if (!timelineRef.current) return null;

        const elements = document.elementsFromPoint(x, y);
        for (const element of elements) {
            const trackElement = element.closest('[data-track-id]');
            if (trackElement) {
                return trackElement.getAttribute('data-track-id');
            }
        }
        return null;
    }, []);

    const onDragStart = useCallback((clipId: string, trackId: string, pointerOffsetX: number) => {
        setDragState(prev => ({
            ...prev,
            isDragging: true,
            clipId,
            originTrackId: trackId,
            pointerOffsetX,
            hoveredTrackId: trackId,
            startScrollLeft: scrollContainer?.scrollLeft ?? 0,
        }));
    }, [scrollContainer]);

    const setStartPosition = useCallback((x: number, y: number) => {
        setDragState(prev => ({
            ...prev,
            startPosition: { x, y },
            currentPosition: { x, y },
        }));
    }, []);

    const onDragMove = useCallback((x: number, y: number) => {
        if (!dragState.isDragging) return;

        const hoveredTrackId = findTrackUnderPointer(x, y);

        setDragState(prev => ({
            ...prev,
            currentPosition: { x, y },
            hoveredTrackId,
        }));

        // Update autoscroll
        updateAutoScroll(x, y);
    }, [dragState.isDragging, findTrackUnderPointer, updateAutoScroll]);

    const onDragEnd = useCallback(() => {
        if (!dragState.isDragging || !dragState.clipId) {
            setDragState(prev => ({ ...prev, isDragging: false, clipId: null }));
            stopAutoScroll();
            return;
        }

        const clip = s.tracks
            .flatMap(t => t.clips)
            .find(c => c.id === dragState.clipId) as Clip | undefined;

        if (!clip) {
            setDragState(prev => ({ ...prev, isDragging: false, clipId: null }));
            stopAutoScroll();
            return;
        }

        // Determine target track
        const targetTrackId = dragState.hoveredTrackId || dragState.originTrackId;
        const targetTrack = s.tracks.find(t => t.id === targetTrackId) as Track | undefined;

        if (!targetTrack || !targetTrackId) {
            setDragState(prev => ({ ...prev, isDragging: false, clipId: null }));
            stopAutoScroll();
            return;
        }

        // Calculate new position using absolute pointer mapping (more robust with autoscroll)
        const container = scrollContainer;
        const rect = container?.getBoundingClientRect();
        const scrollLeft = container?.scrollLeft ?? 0;
        const headerWidth = 192; // timeline left gutter width
        let desiredStart = clip.start;
        if (rect) {
            const contentX = scrollLeft + (dragState.currentPosition.x - rect.left) - headerWidth - dragState.pointerOffsetX;
            desiredStart = Math.max(0, contentX / pixelsPerSecond);
        }

        // Find collision-free placement
        const snappedStart = findNearestFreePlacement(
            targetTrack,
            desiredStart,
            clip.duration,
            clip.id
        );

        // Move clip to target track if different from origin
        const originTrack = s.tracks.find(t => t.clips.some(c => c.id === clip.id));
        if (originTrack && originTrack.id !== targetTrack.id) {
            editorActions.moveClipToTrack(clip.id, targetTrack.id);
        }

        // Update clip position
        editorActions.updateClip(clip.id, {
            start: snappedStart,
            end: snappedStart + clip.duration
        });

        // Reset drag state
        setDragState({
            isDragging: false,
            clipId: null,
            originTrackId: null,
            startPosition: { x: 0, y: 0 },
            currentPosition: { x: 0, y: 0 },
            pointerOffsetX: 0,
            hoveredTrackId: null,
            startScrollLeft: 0,
        });

        stopAutoScroll();
    }, [dragState, s.tracks, pixelsPerSecond, stopAutoScroll, scrollContainer]);

    const cancelDrag = useCallback(() => {
        setDragState({
            isDragging: false,
            clipId: null,
            originTrackId: null,
            startPosition: { x: 0, y: 0 },
            currentPosition: { x: 0, y: 0 },
            pointerOffsetX: 0,
            hoveredTrackId: null,
            startScrollLeft: 0,
        });
        stopAutoScroll();
    }, [stopAutoScroll]);

    const dragHandlers: DragHandlers = useMemo(() => ({
        onDragStart,
        onDragMove,
        onDragEnd,
    }), [onDragStart, onDragMove, onDragEnd]);

    // Set up global pointer event listeners during drag
    useEffect(() => {
        if (!dragState.isDragging) return;

        const handlePointerMove = (e: PointerEvent) => {
            onDragMove(e.clientX, e.clientY);
        };

        const handlePointerUp = () => {
            onDragEnd();
        };

        const handleTouchMove = (e: TouchEvent) => {
            // If multi-touch, it's likely a pinch gesture; don't interfere and cancel drag
            if (e.touches.length > 1) {
                if (dragState.isDragging) {
                    cancelDrag();
                }
                return; // don't preventDefault on multi-touch
            }
            e.preventDefault(); // Prevent scrolling for single-finger drag
            const touch = e.touches[0];
            if (touch) {
                onDragMove(touch.clientX, touch.clientY);
            }
        };

        const handleTouchEnd = () => {
            onDragEnd();
        };

        // Add global listeners
        document.addEventListener('pointermove', handlePointerMove, { passive: true });
        document.addEventListener('pointerup', handlePointerUp);
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);

        const onScroll = () => setScrollTick(t => t + 1);
        scrollContainer?.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
            scrollContainer?.removeEventListener('scroll', onScroll as any);
        };
    }, [dragState.isDragging, onDragMove, onDragEnd, cancelDrag, scrollContainer]);

    const setTimelineRef = useCallback((ref: HTMLElement | null) => {
        timelineRef.current = ref;
    }, []);

    const activeOverlayStyle = useMemo(() => ({
        transformOrigin: 'left center',
        transform: 'scale(1.03)',
        boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
        borderRadius: 12,
        zIndex: 1000,
        pointerEvents: 'none' as const,
    } as React.CSSProperties), []);

    const DndProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        return <>{children}</>;
    };

    return {
        DndProvider,
        dragHandlers,
        dragState,
        setTimelineRef,
        cancelDrag,
        setStartPosition,
        activeId: dragState.clipId,
        activeOverlayStyle,
        scrollTick,
    };
};

export const createDragData = (clip: Clip, trackId: string, pointerOffsetX: number) => ({
    clipId: clip.id,
    trackId,
    pointerOffsetX,
});
