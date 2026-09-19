import { useState, useCallback } from 'react';
import { useInput } from 'ink';

interface UseWaitingRoomControllerParams {
  readonly isHost: boolean;
  readonly onStart: () => void;
  readonly onToggleReady: () => void;
  readonly onLeave: () => void;
}

export function useWaitingRoomController({
  isHost,
  onStart,
  onToggleReady,
  onLeave,
}: UseWaitingRoomControllerParams) {
  const [errorMessage, setErrorMessage] = useState<string>('');

  const triggerError = useCallback((message: string) => {
    setErrorMessage(message);
    setTimeout(() => {
      setErrorMessage('');
    }, 3000);
  }, []);

  useInput((input, key) => {
    const normalizedKey = input.toLowerCase();

    if (key.escape || normalizedKey === 'l' || normalizedKey === 'q') {
      onLeave();
    } else if (normalizedKey === 'r') {
      onToggleReady();
    } else if (normalizedKey === 's') {
      if (isHost) {
        onStart();
      } else {
        triggerError('Only the Host can start the game');
      }
    }
  });

  return { errorMessage };
}
