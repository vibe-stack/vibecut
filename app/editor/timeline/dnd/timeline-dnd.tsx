import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, useSensor, useSensors, MouseSensor, PointerSensor, rectIntersection, type DragStartEvent, type DragOverEvent, type DragEndEvent, type DragMoveEvent } from '@dnd-kit/core';
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
        useSensor(MouseSensor),
        useSensor(PointerSensor),
    );

    const { update: updateScroll, stop: stopScroll } = useAutoscroll({ container: scrollContainer });
    const stateRef = useRef<{ startY: number; lastOverTrackId?: string; _rm?: () => void } | null>(null);

    const onDragStart = (event: DragStartEvent) => {
        console.log('DragStart triggered:', event);
        const data = event.active.data.current as TimelineDragData | undefined;
        if (!data || data.type !== 'clip') return;
        setActiveId(data.clipId);
        const evt = event.activatorEvent as MouseEvent | PointerEvent | undefined;
        stateRef.current = { startY: (evt as any)?.clientY ?? 0 };
        const handlePointerMove = (e: MouseEvent | PointerEvent) => updateScroll(e.clientX, e.clientY);
        window.addEventListener('pointermove', handlePointerMove, { passive: true });
        stateRef.current._rm = () => window.removeEventListener('pointermove', handlePointerMove as any);
    };

    const onDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        const data = active.data.current as TimelineDragData | undefined;
        if (!data || data.type !== 'clip') return;
        if (over) {
            const overId = String(over.id);
            if (overId.startsWith('track-')) {
                const current = stateRef.current || { startY: 0 };
                stateRef.current = { ...current };
            }
        }
    };

    const onDragMove = (event: DragMoveEvent) => {
        const { active, over, delta } = event;
        const data = active.data.current as TimelineDragData | undefined;
        if (!data || data.type !== 'clip') return;
        if (over && Math.abs(delta.y) >= trackSwitchThreshold) {
            const overId = String(over.id);
            if (overId.startsWith('track-')) {
                const targetTrackId = overId.replace('track-', '');
                const current = stateRef.current || { startY: 0 };
                stateRef.current = { ...current, lastOverTrackId: targetTrackId };
            }
        }
    };

    const onDragEnd = (event: DragEndEvent) => {
        stopScroll();
        const { active, over, delta } = event;
        const data = active.data.current as TimelineDragData | undefined;
        setActiveId(null);
        if (!data || data.type !== 'clip') return;

        let targetTrack: Track | undefined;
        const explicitOver = over && String(over.id).startsWith('track-') ? String(over.id).replace('track-', '') : undefined;
        const hinted = stateRef.current?.lastOverTrackId;
        const targetTrackId = explicitOver || hinted || data.originTrackId;
        targetTrack = s.tracks.find(t => t.id === targetTrackId) as Track | undefined;
        if (!targetTrack) return;

        const clip = s.tracks.flatMap(t => t.clips).find(c => c.id === data.clipId) as Clip | undefined;
        if (!clip) return;
        const originalPx = clip.start * pixelsPerSecond;
        const desiredPx = originalPx + delta.x;
        const desiredStart = Math.max(0, desiredPx / pixelsPerSecond);

        const snappedStart = findNearestFreePlacement(targetTrack, desiredStart, clip.duration, clip.id);

        const originTrack = s.tracks.find(t => t.clips.some(c => c.id === clip.id));
        if (!originTrack) return;
        if (originTrack.id !== targetTrack.id) editorActions.moveClipToTrack(clip.id, targetTrack.id);

        editorActions.updateClip(clip.id, { start: snappedStart, end: snappedStart + clip.duration });
    };

    const dndContext = useMemo(
        () => ({
            sensors,
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
            collisionDetection: rectIntersection
        }),
        [sensors, onDragStart, onDragOver, onDragMove, onDragEnd]
    );

    useEffect(() => {
        return () => {
            const rm = stateRef.current?._rm;
            if (rm) rm();
            stopScroll();
        };
    }, [stopScroll]);

    const DndProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        console.log('DndProvider rendering with sensors:', sensors);
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
