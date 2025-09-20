import React from 'react';

interface TimelinePlayheadProps {
  currentTime: number;
  pixelsPerSecond: number;
  timelineHeight: number;
}

export const TimelinePlayhead: React.FC<TimelinePlayheadProps> = ({
  currentTime,
  pixelsPerSecond,
  timelineHeight,
}) => {
  const x = currentTime * pixelsPerSecond;
  
  return (
    <div
      className="absolute pointer-events-none z-10"
      style={{
        left: `${192 + x}px`, // Track header offset
        top: 0,
        height: `${timelineHeight}px`,
      }}
    >
      {/* Playhead line */}
      <div className="w-0.5 h-full bg-white/70" />
      
      {/* Playhead handle */}
      <div className="absolute -top-1 -left-2 w-3 h-3 bg-white/80 rounded-sm pointer-events-none" />
    </div>
  );
};