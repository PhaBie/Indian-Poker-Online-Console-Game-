import { useState, useEffect } from 'react';
import type { SocketClient } from '../../network/socketClient';
import type { ClientStateSnapshot } from '../../state/ClientState';

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

function sendJoinRoomMessage(
  socketClient: SocketClient,
  method: 'LAN' | 'INTERNET',
  target: string,
  playerName: string,
): void {
  if (method === 'LAN') {
    const isFullWsUrl = target.startsWith('ws://') || target.startsWith('wss://');
    const wsUrl = isFullWsUrl ? target : `ws://${target}`;

    socketClient.disconnect();
    socketClient.connect(wsUrl);

    setTimeout(() => {
      socketClient.send({
        type: 'JOIN_ROOM',
        payload: { playerName, roomId: '' },
      });
    }, 500);
  } else {
    socketClient.send({
      type: 'JOIN_ROOM',
      payload: { playerName, roomId: target },
    });
  }
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

  useGameStatePhaseSync(state.latestGameState, screen, setScreen);

  const handleUsernameSubmit = (name: string) => {
    setPlayerName(name);
    setScreen(intent === 'create' ? 'createRoom' : 'joinRoom');
  };

  const handleJoinSubmit = (method: 'LAN' | 'INTERNET', target: string) => {
    setNetworkMode(method);
    sendJoinRoomMessage(socketClient, method, target, playerName);
  };

  const handleLeaveRoom = () => {
    socketClient.send({ type: 'LEAVE_ROOM' });
    onClearState();
    setScreen('mainMenu');
  };

  return {
    screen,
    setScreen,
    playerName,
    networkMode,
    setNetworkMode,
    handleUsernameSubmit,
    handleJoinSubmit,
    handleStartGame: () => socketClient.send({ type: 'START_GAME' }),
    handleToggleReady: () => socketClient.send({ type: 'TOGGLE_READY' }),
    handleLeaveRoom,
    handleStartCreateRoomFlow: () => {
      setIntent('create');
      setScreen('enterName');
    },
    handleStartJoinRoomFlow: () => {
      setIntent('join');
      setScreen('enterName');
    },
  };
}
