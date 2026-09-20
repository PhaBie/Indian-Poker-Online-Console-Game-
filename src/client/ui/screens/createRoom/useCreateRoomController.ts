import { useState, useCallback } from 'react';
import { useInput } from 'ink';
import type { SocketClient } from '../../../network/socketClient';
import type { NetworkConnectionMode, RoomMaxPlayers } from './types';

interface UseCreateRoomControllerParams {
  readonly socketClient: SocketClient;
  readonly playerName?: string;
  readonly initialMode?: NetworkConnectionMode;
  readonly onBack: () => void;
  readonly onModeSelect?: (
    mode: NetworkConnectionMode,
    maxPlayers: RoomMaxPlayers,
  ) => void;
}

export function useCreateRoomController({
  socketClient,
  playerName = 'Host',
  initialMode = 'LAN',
  onBack,
  onModeSelect,
}: UseCreateRoomControllerParams) {
  const [selectedMode, setSelectedMode] = useState<NetworkConnectionMode>(initialMode);
  const [maxPlayers, setMaxPlayers] = useState<RoomMaxPlayers>(4);
  const [step, setStep] = useState<'mode' | 'settings'>('mode');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const submitRoomCreation = useCallback(() => {
    if (isSubmitting) return;
    if (onModeSelect) {
      onModeSelect(selectedMode, maxPlayers);
      return;
    }
    setIsSubmitting(true);
    socketClient.send({
      type: 'CREATE_ROOM',
      payload: { playerName, bootAmount: 50, maxPlayers },
    });
  }, [isSubmitting, maxPlayers, onModeSelect, playerName, selectedMode, socketClient]);

  useInput((input, key) => {
    if (key.escape || input === '0') {
      if (step === 'settings') setStep('mode');
      else onBack();
      return;
    }
    if (step === 'mode') {
      if (input === '1') setSelectedMode('LAN');
      else if (input === '2') setSelectedMode('INTERNET');
      else if (key.upArrow || key.downArrow) {
        setSelectedMode((previousMode) => (previousMode === 'LAN' ? 'INTERNET' : 'LAN'));
      } else if (key.return) {
        setStep('settings');
      }
    } else if (input === '2' || input === '3' || input === '4') {
      setMaxPlayers(Number(input) as RoomMaxPlayers);
    } else if (key.upArrow) {
      setMaxPlayers((previous) => (previous === 2 ? 4 : previous - 1) as RoomMaxPlayers);
    } else if (key.downArrow) {
      setMaxPlayers((previous) => (previous === 4 ? 2 : previous + 1) as RoomMaxPlayers);
    } else if (key.return) {
      submitRoomCreation();
    }
  });

  return { maxPlayers, selectedMode, step, isSubmitting };
}
