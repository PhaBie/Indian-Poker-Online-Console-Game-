import { useState, useEffect, useMemo } from 'react';
import type { SocketClient } from '../../network/socketClient';
import type { ClientStateSnapshot } from '../../state/ClientState';
import {
  resolveBackScreenFromIntent,
  createTableLoungeActions,
  createGameFlowActions,
  createMenuNavigationActions,
  resolveRoomClosedScreen,
} from './navigationActions';
import { useNavigationHandlers } from './useNavigationHandlers';
import { useOnlineConnection } from '../screens/onlineConnection/useOnlineConnection';
import { getOnlineServerUrl } from '../../config';
import type { RoomMaxPlayers } from '../screens/createRoom/types';

export type ActiveScreen =
  | 'intro'
  | 'reconnectPrompt'
  | 'mainMenu'
  | 'serverConnection'
  | 'onlineConnection'
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
  readonly onlineServerUrl?: string;
  readonly onClearState: () => void;
  readonly onClearError: () => void;
  readonly onSetSessionInfo: (name: string, url: string) => void;
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
  onlineServerUrl: initialOnlineServerUrl = getOnlineServerUrl(),
  onClearState,
  onClearError,
  onSetSessionInfo,
}: UseAppNavigationParams) {
  const [screen, setScreen] = useState<ActiveScreen>('intro');
  const [playerName, setPlayerName] = useState<string>('');
  const [intent, setIntent] = useState<'create' | 'join' | null>(null);
  const [networkMode, setNetworkMode] = useState<'LAN' | 'INTERNET'>('LAN');
  const [pendingTarget, setPendingTarget] = useState<string>('');
  const [pendingMaxPlayers, setPendingMaxPlayers] = useState<RoomMaxPlayers>(4);
  const [currentServerUrl, setCurrentServerUrl] = useState<string>(initialServerUrl);
  const [onlineServerUrl, setOnlineServerUrl] = useState<string>(initialOnlineServerUrl);
  const [isChangingName, setIsChangingName] = useState(false);
  const [shouldResumeRoomCode, setResumeRoomCode] = useState(false);
  const [nameChangeReturn, setNameChangeReturn] = useState<'lobby' | 'code'>('lobby');
  const tableActions = useMemo(
    () => createTableLoungeActions(socketClient, playerName),
    [socketClient, playerName],
  );
  const online = useOnlineConnection({
    intent,
    playerName,
    socketClient,
    setScreen,
    setCurrentServerUrl,
    onSetSessionInfo,
    maxPlayers: pendingMaxPlayers,
  });

  const selectNetwork = (
    mode: 'LAN' | 'INTERNET',
    nextIntent: 'create' | 'join',
    maxPlayers: RoomMaxPlayers = pendingMaxPlayers,
  ) => {
    onClearError();
    setIntent(nextIntent);
    setPendingTarget('');
    if (nextIntent === 'create') setPendingMaxPlayers(maxPlayers);
    setResumeRoomCode(false);
    setNetworkMode(mode);
    if (mode === 'INTERNET') {
      socketClient.disconnect();
      onClearState();
      setScreen('onlineConnection');
    } else if (networkMode !== 'LAN' || !socketClient.isConnected) {
      socketClient.disconnect();
      onClearState();
      setCurrentServerUrl(initialServerUrl);
      setScreen('serverConnection');
    } else if (!playerName) {
      setScreen('enterName');
    } else if (nextIntent === 'create') {
      onSetSessionInfo(
        playerName,
        mode === 'LAN' ? initialServerUrl : initialOnlineServerUrl,
      );
      socketClient.send({
        type: 'CREATE_ROOM',
        payload: { playerName, bootAmount: 50, maxPlayers },
      });
    } else {
      onSetSessionInfo(
        playerName,
        mode === 'LAN' ? initialServerUrl : initialOnlineServerUrl,
      );
      setScreen('tableLounge');
      socketClient.send({ type: 'GET_ROOMS' });
    }
  };

  const handleIntroFinish = () => {
    // If we have a saved reconnect token, we ask the user if they want to reconnect
    if (state.reconnectToken && state.currentRoomId && state.savedServerUrl) {
      setScreen('reconnectPrompt');
      return;
    }
    setScreen(playerName ? 'mainMenu' : 'enterName');
  };

  const handleReconnectAccept = () => {
    if (!state.savedServerUrl || !state.reconnectToken || !state.currentRoomId) {
      setScreen('mainMenu');
      return;
    }
    setPlayerName(state.savedPlayerName || 'Player');
    if (
      state.savedServerUrl.includes('ngrok') ||
      state.savedServerUrl.includes('wss://')
    ) {
      setNetworkMode('INTERNET');
      setOnlineServerUrl(state.savedServerUrl);
    } else {
      setNetworkMode('LAN');
      setCurrentServerUrl(state.savedServerUrl);
    }
    socketClient.connectWithTimeout(state.savedServerUrl).then((success) => {
      if (success) {
        socketClient.send({
          type: 'JOIN_ROOM',
          payload: {
            playerName: state.savedPlayerName || 'Player',
            roomId: state.currentRoomId!,
            reconnectToken: state.reconnectToken!,
          },
        });
      } else {
        onClearState();
        setScreen('mainMenu');
      }
    });
  };

  const handleReconnectDecline = () => {
    onClearState();
    setScreen(playerName ? 'mainMenu' : 'enterName');
  };

  useGameStatePhaseSync(state.latestGameState, state.myPlayerId, screen, setScreen);

  useEffect(() => {
    if (!state.roomClosed) return;

    setScreen(resolveRoomClosedScreen(intent));
    socketClient.send({ type: 'GET_ROOMS' });
  }, [intent, socketClient, state.roomClosed]);

  useEffect(() => {
    if (
      (screen === 'serverConnection' ||
        screen === 'onlineConnection' ||
        screen === 'reconnectPrompt') &&
      state.lastError &&
      !state.reconnectToken
    ) {
      // Auto-reconnect failed and session was cleared. Fall back to main menu.
      setScreen('mainMenu');
    }
  }, [screen, state.lastError, state.reconnectToken]);

  const handlers = useNavigationHandlers({
    socketClient,
    playerName,
    intent,
    networkMode,
    pendingTarget,
    pendingMaxPlayers,
    setPlayerName,
    setScreen,
    setCurrentServerUrl,
    currentServerUrl,
    onClearState,
    onSetSessionInfo,
  });

  const handleChangeName = (returnTo: 'lobby' | 'code' = 'lobby') => {
    setIsChangingName(true);
    setNameChangeReturn(returnTo);
    onClearError();
    setIntent(null);
    setScreen('enterName');
  };

  const handleInitialUsernameSubmit = (name: string) => {
    if (isChangingName) {
      setPlayerName(name);
      setResumeRoomCode(nameChangeReturn === 'code');
      setIsChangingName(false);
      setScreen('tableLounge');
      socketClient.send({ type: 'GET_ROOMS' });
      return;
    }
    handlers.handleInitialUsernameSubmit(name);
  };

  const handleBackFromUsername = () => {
    if (isChangingName) {
      setResumeRoomCode(nameChangeReturn === 'code');
      setIsChangingName(false);
      setScreen('tableLounge');
      return;
    }
    setScreen(resolveBackScreenFromIntent(intent));
  };

  return {
    screen,
    setScreen,
    playerName,
    intent,
    networkMode,
    setNetworkMode,
    currentServerUrl,
    onlineServerUrl,
    setOnlineServerUrl,
    ...handlers,
    ...online,
    ...tableActions,
    ...createGameFlowActions(socketClient, onClearState, setScreen, intent),
    ...createMenuNavigationActions(setIntent, setScreen),
    handleIntroFinish,
    handleChangeName,
    handleInitialUsernameSubmit,
    resumeRoomCode: shouldResumeRoomCode,
    clearResumeRoomCode: () => setResumeRoomCode(false),
    handleJoinSubmit: (method: 'LAN' | 'INTERNET', _target: string) =>
      selectNetwork(method, 'join'),
    handleBackFromUsername,
    handleCreateRoomModeSelect: (
      mode: 'LAN' | 'INTERNET',
      maxPlayers: RoomMaxPlayers = 4,
    ) => selectNetwork(mode, 'create', maxPlayers),
    handleReconnectAccept,
    handleReconnectDecline,
  };
}
