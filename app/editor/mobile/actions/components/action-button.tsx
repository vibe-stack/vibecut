import React from 'react';

export const ActionButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className = '', ...props }) => (
  <button
    {...props}
    className={`shrink-0 rounded-2xl bg-white/5 active:bg-white/10 px-3 py-2 text-white flex flex-col items-center gap-1 w-20 ${className}`}
  >
    {children}
  </button>
);

export default ActionButton;
