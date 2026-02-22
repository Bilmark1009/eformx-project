import { useEffect } from 'react';

export function usePolling(asyncFn, interval = 3000, shouldPoll = true) {
  useEffect(() => {
    if (!shouldPoll) return;

    const executeAsync = async () => {
      try {
        await asyncFn();
      } catch (e) {
        // Silently ignore transient errors
      }
    };

    executeAsync();
    const intervalId = setInterval(executeAsync, interval);

    return () => clearInterval(intervalId);
  }, [asyncFn, interval, shouldPoll]);
}
