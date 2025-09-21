import React from 'react';

interface TimelineRulerProps {
  duration: number;
  pixelsPerSecond: number;
  timelineWidth: number;
}

export const TimelineRuler: React.FC<TimelineRulerProps> = ({
  duration,
  pixelsPerSecond,
  timelineWidth,
}) => {
  const majorTicks = [];
  const minorTicks = [];
  
  // Calculate tick intervals based on zoom level
  let majorInterval = 1; // seconds
  if (pixelsPerSecond < 10) majorInterval = 10;
  else if (pixelsPerSecond < 50) majorInterval = 5;
  else if (pixelsPerSecond > 100) majorInterval = 0.5;
  
  const minorInterval = majorInterval / 5;
  
  // Generate major ticks
  for (let time = 0; time <= duration; time += majorInterval) {
    const x = time * pixelsPerSecond;
    if (x <= timelineWidth) {
      majorTicks.push({ time, x });
    }
  }
  
  // Generate minor ticks
  for (let time = 0; time <= duration; time += minorInterval) {
    const x = time * pixelsPerSecond;
    if (x <= timelineWidth) {
      minorTicks.push({ time, x });
    }
  }
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="h-8 bg-zinc-900/90 backdrop-blur-lg sticky top-0 z-[100]">
      {/* Track header spacer */}
      <div className="absolute left-0 top-0 w-48 h-full " />
      
      {/* Ruler area */}
      <div 
        className="absolute bg-transparent"
        style={{ 
          left: '192px',
          top: 0,
          width: `${timelineWidth}px`,
          height: '100%'
        }}
      >
        {/* Minor ticks */}
        {minorTicks.map(({ time, x }) => (
          <div
            key={`minor-${time}`}
            className="absolute top-6 w-px h-2 bg-white/20"
            style={{ left: `${x}px` }}
          />
        ))}
        
        {/* Major ticks and labels */}
        {majorTicks.map(({ time, x }) => (
          <div key={`major-${time}`} className="absolute" style={{ left: `${x}px` }}>
            <div className="w-px h-4 bg-white/60" />
            <div className="absolute top-0 left-1 text-xs text-white/70 whitespace-nowrap">
              {formatTime(time)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};