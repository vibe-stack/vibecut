import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
    DndContext, 
    useSensor, 
    useSensors, 
    MouseSensor, 
    TouchSensor,
    rectIntersection, 
    type DragStartEvent, 
    type DragOverEvent, 
    type DragEndEvent, 
    type DragMoveEvent,
    type DragCancelEvent,
} from '@dnd-kit/core';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from '../../shared/store';
import type { Clip, Track } from '../../shared/types';
import { findNearestFreePlacement } from '../utils/timeline-collision';
import { useAutoscroll } from './use-autoscroll';

type TimelineDragData = {
    type: 'clip';
    clipId: string;
    originTrackId: string;
    pointerOffsetX: number; // px from left edge of clip where drag started
};

export interface UseTimelineDndOptions {
    pixelsPerSecond: number;
    scrollContainer: HTMLElement | null;
    trackSwitchThreshold?: number; // px vertical move before switching track
    pointerDelay?: number; // ms delay before drag activation
}

export const useTimelineDnd = ({ pixelsPerSecond, scrollContainer, trackSwitchThreshold = 18, pointerDelay = 50 }: UseTimelineDndOptions) => {
    const s = useSnapshot(editorStore);
    const [activeId, setActiveId] = useState<string | null>(null);
    const activeOverlayStyle = useMemo(() => ({
        transformOrigin: 'left center',
        transform: 'scale(1.03)',
        boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
        borderRadius: 12,
    } as React.CSSProperties), []);

    const sensors = useSensors(
        // useSensor(MouseSensor, {
        //     activationConstraint: { distance: 2 },
        // }),
        useSensor(TouchSensor, {
            activationConstraint: { distance: 9 }, // small movement to activate; more reliable than press-hold
        }),
    );

    const stateRef = useRef<{ startY: number; lastOverTrackId?: string } | null>(null);
    const lastPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const { update: updateAutoScroll, stop: stopAutoScroll } = useAutoscroll({
        container: scrollContainer,
        edgeDistance: 96,
        maxSpeed: 28,
        getPointer: () => lastPointerRef.current,
    });

    // Track pointer positions globally during an active drag to drive custom autoscroll
    const attachGlobalPointerTracking = () => {
        const onPM = (e: PointerEvent) => { lastPointerRef.current = { x: e.clientX, y: e.clientY }; };
        const onTM = (e: TouchEvent) => { const t = e.touches[0]; if (t) lastPointerRef.current = { x: t.clientX, y: t.clientY }; };
        document.addEventListener('pointermove', onPM, { passive: true });
        document.addEventListener('touchmove', onTM, { passive: true });
        return () => {
            document.removeEventListener('pointermove', onPM);
            document.removeEventListener('touchmove', onTM);
        };
    };
    const detachTrackingRef = useRef<(() => void) | null>(null);

    const onDragStart = (event: DragStartEvent) => {
        const data = event.active.data.current as TimelineDragData | undefined;
        if (!data || data.type !== 'clip') return;
        setActiveId(data.clipId);
        const evt = event.activatorEvent as MouseEvent | PointerEvent | undefined;
        stateRef.current = { startY: (evt as any)?.clientY ?? 0 };
        // Start tracking pointer and prepare autoscroll
        if (!detachTrackingRef.current) {
            detachTrackingRef.current = attachGlobalPointerTracking();
        }
    };

    const onDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        const data = active.data.current as TimelineDragData | undefined;
        if (!data || data.type !== 'clip') return;
        
        if (over) {
            const overId = String(over.id);
            if (overId.startsWith('track-')) {
                const targetTrackId = overId.replace('track-', '').replace('timeline-', '');
                const current = stateRef.current || { startY: 0 };
                stateRef.current = { ...current, lastOverTrackId: targetTrackId };
            }
        }
    };

    const onDragMove = (event: DragMoveEvent) => {
        const { active, over } = event;
        const data = active.data.current as TimelineDragData | undefined;
        if (!data || data.type !== 'clip') return;
        
        if (over) {
            const overId = String(over.id);
            if (overId.startsWith('track-')) {
                const targetTrackId = overId.replace('track-', '').replace('timeline-', '');
                const current = stateRef.current || { startY: 0 };
                stateRef.current = { ...current, lastOverTrackId: targetTrackId };
            }
        }
        // Drive custom autoscroll
        updateAutoScroll(lastPointerRef.current.x, lastPointerRef.current.y);
    };

    const cleanupDrag = () => {
        stopAutoScroll();
        if (detachTrackingRef.current) {
            detachTrackingRef.current();
            detachTrackingRef.current = null;
        }
    };

    const onDragEnd = (event: DragEndEvent) => {
        const { active, over, delta } = event;
        const data = active.data.current as TimelineDragData | undefined;
        setActiveId(null);
        if (!data || data.type !== 'clip') return;

        // Determine target track: prioritize explicit over element, then fallback to last tracked over, then original track
        let targetTrack: Track | undefined;
        let targetTrackId: string;
        
        const explicitOver = over && String(over.id).startsWith('track-') ? String(over.id).replace('track-', '').replace('timeline-', '') : undefined;
        const hinted = stateRef.current?.lastOverTrackId;
        
        if (explicitOver) {
            targetTrackId = explicitOver;
        } else if (hinted) {
            targetTrackId = hinted;
        } else {
            targetTrackId = data.originTrackId;
        }
        
        targetTrack = s.tracks.find(t => t.id === targetTrackId) as Track | undefined;
        if (!targetTrack) {
            targetTrack = s.tracks.find(t => t.id === data.originTrackId) as Track | undefined;
            if (!targetTrack) return;
        }

        const clip = s.tracks.flatMap(t => t.clips).find(c => c.id === data.clipId) as Clip | undefined;
        if (!clip) return;
        
        const originalPx = clip.start * pixelsPerSecond;
        const desiredPx = originalPx + delta.x;
        const desiredStart = Math.max(0, desiredPx / pixelsPerSecond);

        const snappedStart = findNearestFreePlacement(targetTrack, desiredStart, clip.duration, clip.id);

        const originTrack = s.tracks.find(t => t.clips.some(c => c.id === clip.id));
        if (!originTrack) return;
        
        // Move clip to target track if different from origin
        if (originTrack.id !== targetTrack.id) {
            editorActions.moveClipToTrack(clip.id, targetTrack.id);
        }

        // Update clip position
        editorActions.updateClip(clip.id, { start: snappedStart, end: snappedStart + clip.duration });
        
        // Clear state
        stateRef.current = null;
        cleanupDrag();
    };

    const onDragCancel = (_event: DragCancelEvent) => {
        // Ensure we fully stop autoscroll and tracking on cancel
        setActiveId(null);
        stateRef.current = null;
        cleanupDrag();
    };

    const dndContext = useMemo(
        () => ({
            sensors,
            autoScroll: false, // Disable built-in autoscroll; we use a custom one for stability
            onDragStart: (e: DragStartEvent) => {

                onDragStart(e);
            },
            onDragOver: (e: DragOverEvent) => {

                onDragOver(e);
            },
            onDragMove: (e: DragMoveEvent) => {

                onDragMove(e);
            },
            onDragEnd: (e: DragEndEvent) => {

                onDragEnd(e);
            },
            onDragCancel: (e: DragCancelEvent) => {

                onDragCancel(e);
            },
            collisionDetection: rectIntersection
        }),
        [sensors, onDragStart, onDragOver, onDragMove, onDragEnd]
    );

    useEffect(() => {
        return () => {
            // Cleanup function
        };
    }, []);

    const DndProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        return (
            <DndContext {...dndContext}>{children}</DndContext>
        );
    };

    return { DndProvider, activeId, activeOverlayStyle };
};

export const getDraggableData = (clip: Clip, trackId: string, pointerOffsetX: number) => ({
    type: 'clip' as const,
    clipId: clip.id,
    originTrackId: trackId,
    pointerOffsetX,
});
