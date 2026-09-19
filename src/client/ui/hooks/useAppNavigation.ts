import { useState, useEffect } from 'react';
import type { SocketClient } from '../../network/socketClient';
import type { ClientStateSnapshot } from '../../state/ClientState';
import { resolveBackScreenFromIntent, executeUserSubmission } from './navigationActions';

export type ActiveScreen =
  | 'intro'
  | 'mainMenu'
  | 'enterName'
  | 'createRoom'
  | 'joinRoom'
  | 'waitingRoom'
  | 'game'
  | 'result';

export interface UseAppNavigationParams {
  readonly state: ClientStateSnapshot;
  readonly socketClient: SocketClient;
  readonly onClearState: () => void;
}

function useGameStatePhaseSync(
  latestGameState: ClientStateSnapshot['latestGameState'],
  screen: ActiveScreen,
  setScreen: (screen: ActiveScreen) => void,
): void {
  useEffect(() => {
    const currentPhase = latestGameState?.phase;

    if (currentPhase === 'LOBBY' && screen !== 'waitingRoom') {
      setScreen('waitingRoom');
    } else if (currentPhase === 'PLAYING' && screen !== 'game') {
      setScreen('game');
    } else if (currentPhase === 'ENDED' && screen !== 'result') {
      setScreen('result');
    } else if (
      !latestGameState &&
      (screen === 'waitingRoom' || screen === 'game' || screen === 'result')
    ) {
      setScreen('mainMenu');
    }
  }, [latestGameState, screen, setScreen]);
}

export function useAppNavigation({
  state,
  socketClient,
  onClearState,
}: UseAppNavigationParams) {
  const [screen, setScreen] = useState<ActiveScreen>('intro');
  const [playerName, setPlayerName] = useState<string>('');
  const [intent, setIntent] = useState<'create' | 'join' | null>(null);
  const [networkMode, setNetworkMode] = useState<'LAN' | 'INTERNET'>('LAN');
  const [pendingTarget, setPendingTarget] = useState<string>('');

  useGameStatePhaseSync(state.latestGameState, screen, setScreen);

  return {
    screen,
    setScreen,
    playerName,
    networkMode,
    setNetworkMode,
    handleUsernameSubmit: (name: string) => {
      setPlayerName(name);
      executeUserSubmission(intent, name, networkMode, pendingTarget, socketClient);
    },
    handleJoinSubmit: (method: 'LAN' | 'INTERNET', target: string) => {
      setNetworkMode(method);
      setPendingTarget(target);
      setScreen('enterName');
    },
    handleBackFromUsername: () => setScreen(resolveBackScreenFromIntent(intent)),
    handleCreateRoomModeSelect: (mode: 'LAN' | 'INTERNET') => {
      setNetworkMode(mode);
      setScreen('enterName');
    },
    handleStartGame: () => socketClient.send({ type: 'START_GAME' }),
    handleToggleReady: () => socketClient.send({ type: 'TOGGLE_READY' }),
    handleLeaveRoom: () => {
      socketClient.send({ type: 'LEAVE_ROOM' });
      onClearState();
      setScreen('mainMenu');
    },
    handleStartCreateRoomFlow: () => {
      setIntent('create');
      setScreen('createRoom');
    },
    handleStartJoinRoomFlow: () => {
      setIntent('join');
      setScreen('joinRoom');
    },
  };
}
