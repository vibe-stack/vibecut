import { useEffect } from 'react';
import { editorActions } from './store';

/**
 * Component that initializes audio context on user interaction for iOS Safari compatibility
 */
export const IOSAudioInitializer: React.FC = () => {
  useEffect(() => {
    // Initialize audio context on any user interaction
    const handleUserInteraction = () => {
      editorActions.initializeAudioContext();
    };

    // Add listeners for various user interaction events
    const events = ['touchstart', 'touchend', 'click', 'pointerdown'];
    
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { once: true, passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };
  }, []);

  return null; // This component doesn't render anything
};

export default IOSAudioInitializer;