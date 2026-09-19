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

export function isPlayerPresentInRoom(
  players: ReadonlyArray<{ readonly id: string }> | undefined,
  playerId: string | null,
): boolean {
  return Boolean(playerId && players?.some((player) => player.id === playerId));
}

export interface UseAppNavigationParams {
  readonly state: ClientStateSnapshot;
  readonly socketClient: SocketClient;
  readonly initialServerUrl?: string;
  readonly onClearState: () => void;
  readonly onClearError: () => void;
}

function useGameStatePhaseSync(
  latestGameState: ClientStateSnapshot['latestGameState'],
  myPlayerId: ClientStateSnapshot['myPlayerId'],
  screen: ActiveScreen,
  setScreen: (screen: ActiveScreen) => void,
): void {
  useEffect(() => {
    const currentPhase = latestGameState?.phase;
    const isCurrentPlayerInRoom = isPlayerPresentInRoom(
      latestGameState?.players,
      myPlayerId,
    );

    if (currentPhase === 'LOBBY' && isCurrentPlayerInRoom && screen !== 'waitingRoom') {
      setScreen('waitingRoom');
    } else if (currentPhase === 'PLAYING' && isCurrentPlayerInRoom && screen !== 'game') {
      setScreen('game');
    } else if (currentPhase === 'ENDED' && isCurrentPlayerInRoom && screen !== 'result') {
      setScreen('result');
    } else if (
      !latestGameState &&
      (screen === 'waitingRoom' || screen === 'game' || screen === 'result')
    ) {
      setScreen('mainMenu');
    }
  }, [latestGameState, myPlayerId, screen, setScreen]);
}

export function useAppNavigation({
  state,
  socketClient,
  initialServerUrl = 'ws://127.0.0.1:8080',
  onClearState,
  onClearError,
}: UseAppNavigationParams) {
  const [screen, setScreen] = useState<ActiveScreen>('intro');
  const [playerName, setPlayerName] = useState<string>('');
  const [intent, setIntent] = useState<'create' | 'join' | null>(null);
  const [networkMode, setNetworkMode] = useState<'LAN' | 'INTERNET'>('LAN');
  const [pendingTarget, setPendingTarget] = useState<string>('');
  const [currentServerUrl, setCurrentServerUrl] = useState<string>(initialServerUrl);
  const [isChangingName, setIsChangingName] = useState(false);
  const [resumeRoomCode, setResumeRoomCode] = useState(false);
  const [nameChangeReturn, setNameChangeReturn] = useState<'lobby' | 'code'>('lobby');

  const handleIntroFinish = () => {
    setScreen(playerName ? 'mainMenu' : 'enterName');
  };

  useGameStatePhaseSync(state.latestGameState, state.myPlayerId, screen, setScreen);
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

  const handleChangeName = (returnTo: 'lobby' | 'code' = 'lobby') => {
    setIsChangingName(true);
    setNameChangeReturn(returnTo);
    onClearError();
    setIntent(null);
    setScreen('enterName');
  };

  const handleInitialUsernameSubmit = (name: string) => {
    handlers.handleInitialUsernameSubmit(name);
    if (isChangingName) {
      setResumeRoomCode(nameChangeReturn === 'code');
      setIsChangingName(false);
      setScreen('tableLounge');
      socketClient.send({ type: 'GET_ROOMS' });
    }
  };

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
    ...createGameFlowActions(socketClient, onClearState, setScreen, intent),
    ...createMenuNavigationActions(setIntent, setScreen),
    handleIntroFinish,
    handleChangeName,
    handleInitialUsernameSubmit,
    resumeRoomCode,
    clearResumeRoomCode: () => setResumeRoomCode(false),
    handleJoinSubmit: (method: 'LAN' | 'INTERNET', target: string) => {
      setNetworkMode(method);
      setPendingTarget(target);
      if (method === 'LAN' && !socketClient.isConnected) {
        setScreen('serverConnection');
      } else if (playerName) {
        if (method === 'LAN') {
          setScreen('tableLounge');
          socketClient.send({ type: 'GET_ROOMS' });
        } else {
          socketClient.send({
            type: 'JOIN_ROOM',
            payload: { playerName, roomId: target },
          });
        }
      } else {
        setScreen('enterName');
      }
    },
    handleBackFromUsername: () => setScreen(resolveBackScreenFromIntent(intent)),
    handleCreateRoomModeSelect: (mode: 'LAN' | 'INTERNET') => {
      setNetworkMode(mode);
      if (playerName) {
        if (mode === 'LAN' && !socketClient.isConnected) {
          setScreen('serverConnection');
        } else {
          socketClient.send({
            type: 'CREATE_ROOM',
            payload: { playerName, bootAmount: 50, maxPlayers: 4 },
          });
        }
        return;
      }
      setScreen(
        mode === 'LAN' && !socketClient.isConnected ? 'serverConnection' : 'enterName',
      );
    },
  };
}
