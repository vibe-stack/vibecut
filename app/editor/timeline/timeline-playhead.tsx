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
  <div className="w-0.5 h-full bg-red-500" />
      
      {/* Playhead handle */}
  <div className="absolute -top-2 -translate-x-1/2 left-0 w-3.5 h-3.5 bg-red-500 rounded-full border border-white/30 pointer-events-none" />
    </div>
  );
};