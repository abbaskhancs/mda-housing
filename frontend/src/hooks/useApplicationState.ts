import { useState, useEffect, useCallback, useRef } from 'react';

interface ApplicationStateData {
  updatedAt: string;
  currentStageId: string;
  currentStageName: string;
  applicationNumber: string;
}

interface UseApplicationStateOptions {
  applicationId: string;
  onStateChanged?: (hasChanged: boolean, storedState: ApplicationStateData | null, currentState: ApplicationStateData) => void;
}

interface UseApplicationStateReturn {
  hasStateChanged: boolean;
  storedState: ApplicationStateData | null;
  currentState: ApplicationStateData | null;
  updateStoredState: (state: ApplicationStateData) => void;
  clearStoredState: () => void;
  checkForChanges: (currentState: ApplicationStateData) => boolean;
  dismissChangeNotification: () => void;
}

/**
 * Custom hook to manage application state persistence and change detection
 * Stores application state in localStorage after successful transitions
 * Detects changes when page reloads and warns if application was updated elsewhere
 */
export function useApplicationState({ 
  applicationId, 
  onStateChanged 
}: UseApplicationStateOptions): UseApplicationStateReturn {
  const [hasStateChanged, setHasStateChanged] = useState(false);
  const [storedState, setStoredState] = useState<ApplicationStateData | null>(null);
  const [currentState, setCurrentState] = useState<ApplicationStateData | null>(null);
  const onStateChangedRef = useRef(onStateChanged);

  // Update ref when callback changes
  useEffect(() => {
    onStateChangedRef.current = onStateChanged;
  }, [onStateChanged]);

  // Generate storage key for this application
  const getStorageKey = useCallback(() => {
    return `mda_app_state_${applicationId}`;
  }, [applicationId]);

  // Load stored state from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(getStorageKey());
      if (stored) {
        const parsedState = JSON.parse(stored) as ApplicationStateData;
        setStoredState(parsedState);
      }
    } catch (error) {
      console.warn('Failed to load stored application state:', error);
      // Clear invalid stored state
      localStorage.removeItem(getStorageKey());
    }
  }, [applicationId, getStorageKey]);

  // Update stored state in localStorage
  const updateStoredState = useCallback((state: ApplicationStateData) => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(state));
      setStoredState(state);
      setHasStateChanged(false); // Reset change flag when we update stored state
    } catch (error) {
      console.warn('Failed to store application state:', error);
    }
  }, [getStorageKey]);

  // Clear stored state from localStorage
  const clearStoredState = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(getStorageKey());
      setStoredState(null);
      setHasStateChanged(false);
    } catch (error) {
      console.warn('Failed to clear stored application state:', error);
    }
  }, [getStorageKey]);

  // Check if current state differs from stored state
  const checkForChanges = useCallback((newCurrentState: ApplicationStateData): boolean => {
    setCurrentState(newCurrentState);

    if (!storedState) {
      // No stored state, so no changes to detect
      return false;
    }

    // Compare critical fields that indicate the application has changed
    const hasChanged = (
      storedState.updatedAt !== newCurrentState.updatedAt ||
      storedState.currentStageId !== newCurrentState.currentStageId
    );

    setHasStateChanged(hasChanged);

    // Notify callback if state changed
    if (hasChanged && onStateChangedRef.current) {
      onStateChangedRef.current(hasChanged, storedState, newCurrentState);
    }

    return hasChanged;
  }, [storedState]);

  // Dismiss the change notification
  const dismissChangeNotification = useCallback(() => {
    setHasStateChanged(false);
  }, []);

  return {
    hasStateChanged,
    storedState,
    currentState,
    updateStoredState,
    clearStoredState,
    checkForChanges,
    dismissChangeNotification
  };
}
