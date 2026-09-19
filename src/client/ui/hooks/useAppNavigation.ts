import { useState, useEffect } from 'react';
import type { SocketClient } from '../../network/socketClient';
import type { ClientStateSnapshot } from '../../state/ClientState';
import {
  resolveBackScreenFromIntent,
  createTableLoungeActions,
  createGameFlowActions,
  createMenuNavigationActions,
} from './navigationActions';
import { useNavigationHandlers } from './useNavigationHandlers';

export type ActiveScreen =
  | 'intro'
  | 'mainMenu'
  | 'serverConnection'
  | 'tableLounge'
  | 'enterName'
  | 'createRoom'
  | 'joinRoom'
  | 'waitingRoom'
  | 'game'
  | 'result';

export interface UseAppNavigationParams {
  readonly state: ClientStateSnapshot;
  readonly socketClient: SocketClient;
  readonly initialServerUrl?: string;
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
  initialServerUrl = 'ws://127.0.0.1:8080',
  onClearState,
}: UseAppNavigationParams) {
  const [screen, setScreen] = useState<ActiveScreen>('intro');
  const [playerName, setPlayerName] = useState<string>('');
  const [intent, setIntent] = useState<'create' | 'join' | null>(null);
  const [networkMode, setNetworkMode] = useState<'LAN' | 'INTERNET'>('LAN');
  const [pendingTarget, setPendingTarget] = useState<string>('');
  const [currentServerUrl, setCurrentServerUrl] = useState<string>(initialServerUrl);

  useGameStatePhaseSync(state.latestGameState, screen, setScreen);
  const handlers = useNavigationHandlers({
    socketClient,
    playerName,
    intent,
    networkMode,
    pendingTarget,
    setPlayerName,
    setScreen,
    setCurrentServerUrl,
    onClearState,
  });

  return {
    screen,
    setScreen,
    playerName,
    intent,
    networkMode,
    setNetworkMode,
    currentServerUrl,
    ...handlers,
    ...createTableLoungeActions(socketClient, playerName),
    ...createGameFlowActions(socketClient, onClearState, setScreen),
    ...createMenuNavigationActions(setIntent, setScreen),
    handleJoinSubmit: (method: 'LAN' | 'INTERNET', target: string) => {
      setNetworkMode(method);
      setPendingTarget(target);
      setScreen(
        method === 'LAN' && !socketClient.isConnected ? 'serverConnection' : 'enterName',
      );
    },
    handleBackFromUsername: () => setScreen(resolveBackScreenFromIntent(intent)),
    handleCreateRoomModeSelect: (mode: 'LAN' | 'INTERNET') => {
      setNetworkMode(mode);
      setScreen(
        mode === 'LAN' && !socketClient.isConnected ? 'serverConnection' : 'enterName',
      );
    },
  };
}
