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
    });

    const timelineRef = useRef<HTMLElement | null>(null);
    const { update: updateAutoScroll, stop: stopAutoScroll } = useAutoscroll({
        container: scrollContainer,
        edgeDistance: 96,
        maxSpeed: 28,
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
        }));
    }, []);

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

        // Calculate new position based on drag delta
        const deltaX = dragState.currentPosition.x - dragState.startPosition.x;
        const originalPx = clip.start * pixelsPerSecond;
        const desiredPx = originalPx + deltaX;
        const desiredStart = Math.max(0, desiredPx / pixelsPerSecond);

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
        });
        
        stopAutoScroll();
    }, [dragState, s.tracks, pixelsPerSecond, stopAutoScroll]);

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
            e.preventDefault(); // Prevent scrolling
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

        return () => {
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [dragState.isDragging, onDragMove, onDragEnd]);

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
        setStartPosition,
        activeId: dragState.clipId,
        activeOverlayStyle,
    };
};

export const createDragData = (clip: Clip, trackId: string, pointerOffsetX: number) => ({
    clipId: clip.id,
    trackId,
    pointerOffsetX,
});
