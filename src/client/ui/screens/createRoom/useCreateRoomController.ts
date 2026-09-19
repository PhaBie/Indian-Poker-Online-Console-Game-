import { useState, useCallback } from 'react';
import { useInput } from 'ink';
import type { SocketClient } from '../../../network/socketClient';
import type { NetworkConnectionMode } from './types';

interface UseCreateRoomControllerParams {
  readonly socketClient: SocketClient;
  readonly playerName?: string;
  readonly onBack: () => void;
  readonly onModeSelect?: (mode: NetworkConnectionMode) => void;
}

export function useCreateRoomController({
  socketClient,
  playerName = 'Host',
  onBack,
  onModeSelect,
}: UseCreateRoomControllerParams) {
  const [selectedMode, setSelectedMode] = useState<NetworkConnectionMode>('LAN');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const submitRoomCreation = useCallback(
    (mode: NetworkConnectionMode) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      onModeSelect?.(mode);
      socketClient.send({
        type: 'CREATE_ROOM',
        payload: { playerName, bootAmount: 50, maxPlayers: 4 },
      });
    },
    [isSubmitting, onModeSelect, playerName, socketClient],
  );

  useInput((input, key) => {
    if (key.escape || input === '0') {
      onBack();
      return;
    }
    if (input === '1') {
      setSelectedMode('LAN');
      submitRoomCreation('LAN');
    } else if (input === '2') {
      setSelectedMode('INTERNET');
      submitRoomCreation('INTERNET');
    } else if (key.upArrow || key.downArrow) {
      setSelectedMode((previousMode) => (previousMode === 'LAN' ? 'INTERNET' : 'LAN'));
    } else if (key.return) {
      submitRoomCreation(selectedMode);
    }
  });

  return { selectedMode, isSubmitting };
}
