import React from 'react';
import { useScrubber } from './hooks/use-scrubber';

/**
 * Timeline scrubber/seek bar component
 */
export const TimelineScrubber: React.FC = () => {
  const { snapshot, scrubberRef, handleMouseDown, progress } = useScrubber();

  return (
    <div className="relative h-6 bg-gray-700 rounded cursor-pointer" ref={scrubberRef} onMouseDown={handleMouseDown}>
      {/* Progress bar */}
      <div 
        className="h-full bg-blue-600 rounded transition-all duration-75"
        style={{ width: `${progress}%` }}
      />
      
      {/* Scrubber handle */}
      <div 
        className="absolute top-1/2 w-3 h-3 bg-white rounded-full border-2 border-blue-600 transform -translate-y-1/2 cursor-grab active:cursor-grabbing"
        style={{ left: `${progress}%`, marginLeft: '-6px' }}
      />
      
      {/* Time markers (optional enhancement) */}
      <div className="absolute top-full pt-1 w-full">
        <div className="flex justify-between text-xs text-gray-400">
          <span>0:00</span>
          {snapshot.totalDuration > 60 && (
            <span>{Math.floor(snapshot.totalDuration / 60)}:00</span>
          )}
          <span>{Math.floor(snapshot.totalDuration / 60)}:{(snapshot.totalDuration % 60).toFixed(0).padStart(2, '0')}</span>
        </div>
      </div>
    </div>
  );
};