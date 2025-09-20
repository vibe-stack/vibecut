import React from 'react';

export const ActionsRow: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className = '' }) => {
  return (
    <div className={`flex items-stretch gap-2 overflow-x-auto no-scrollbar pb-1 ${className}`}>
      {children}
    </div>
  );
};

export default ActionsRow;
