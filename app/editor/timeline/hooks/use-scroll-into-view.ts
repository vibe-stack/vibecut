import { useCallback } from 'react';

/**
 * Smoothly scroll any element matching the selector into view within a scrollable ancestor.
 * Accepts either an element or a selector string. Uses smooth behavior.
 */
export const useScrollIntoView = () => {
  const scrollIntoView = useCallback((el: Element | string) => {
    const target = typeof el === 'string' ? document.querySelector(el) : el;
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, []);

  return { scrollIntoView };
};
