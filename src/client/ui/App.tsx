import { useEffect } from 'react';
import { Box, useApp } from 'ink';
import type { ClientState } from '../state/ClientState';
import { useClientState } from './hooks/useClientState';
import { useAppNavigation } from './hooks/useAppNavigation';
import { GameIntroSplash } from './components/GameIntroSplash';
import { MainMenuScreen } from './screens/MainMenuScreen';
import { CreateRoomScreen } from './screens/CreateRoomScreen';
import { JoinRoomScreen } from './screens/JoinRoomScreen';
import { EnterUsernameScreen } from './screens/EnterUsernameScreen';
import { WaitingRoomScreen } from './screens/WaitingRoomScreen';
import { GameScreen } from './screens/GameScreen';
import { RoundResultScreen } from './screens/RoundResultScreen';
import {
  useTerminalSize,
  clearTerminalScreen,
  hideTerminalCursor,
  showTerminalCursor,
} from './hooks/useTerminalSize';
import {
  getTerminalSizeStatus,
  TerminalOutOfRangeScreen,
} from './components/ScreenSizeGuard';
import type { SocketClient } from '../network/socketClient';

export interface AppProps {
  readonly clientState: ClientState;
  readonly serverUrl: string;
  readonly socketClient: SocketClient;
}

interface ActiveScreenRouterProps {
  readonly state: ReturnType<typeof useClientState>;
  readonly navigation: ReturnType<typeof useAppNavigation>;
  readonly socketClient: SocketClient;
  readonly serverUrl: string;
  readonly onExit: () => void;
}

function renderGameplayScreens({
  state,
  navigation,
  socketClient,
  serverUrl,
}: ActiveScreenRouterProps) {
  const { screen } = navigation;

  if (screen === 'waitingRoom' && state.latestGameState) {
    return (
      <WaitingRoomScreen
        roomId={state.currentRoomId}
        players={state.latestGameState.players}
        hostId={state.latestGameState.hostId}
        myPlayerId={state.myPlayerId}
        onStart={navigation.handleStartGame}
        onToggleReady={navigation.handleToggleReady}
        onLeave={navigation.handleLeaveRoom}
        networkMode={navigation.networkMode}
        serverUrl={serverUrl}
      />
    );
  }
  if (screen === 'game' && state.latestGameState) {
    return (
      <GameScreen
        gameState={state.latestGameState}
        myPlayerId={state.myPlayerId}
        socketClient={socketClient}
        serverError={state.lastError}
      />
    );
  }
  if (screen === 'result' && state.latestGameResult && state.latestGameState) {
    return (
      <RoundResultScreen
        result={state.latestGameResult}
        gameState={state.latestGameState}
        socketClient={socketClient}
        onLeave={navigation.handleLeaveRoom}
      />
    );
  }
  return null;
}

function ActiveScreenRouter(props: ActiveScreenRouterProps) {
  const { navigation, state, socketClient, serverUrl, onExit } = props;
  const { screen } = navigation;

  if (screen === 'intro') {
    return <GameIntroSplash onFinish={() => navigation.setScreen('mainMenu')} />;
  }
  if (screen === 'mainMenu') {
    return (
      <MainMenuScreen
        onCreateRoom={navigation.handleStartCreateRoomFlow}
        onJoinRoom={navigation.handleStartJoinRoomFlow}
        onExit={onExit}
      />
    );
  }
  if (screen === 'enterName') {
    return (
      <EnterUsernameScreen
        onSubmit={navigation.handleUsernameSubmit}
        onBack={navigation.handleBackFromUsername}
      />
    );
  }
  if (screen === 'createRoom') {
    return (
      <CreateRoomScreen
        socketClient={socketClient}
        onBack={() => navigation.setScreen('mainMenu')}
        roomId={state.currentRoomId}
        serverUrl={serverUrl}
        playerName={navigation.playerName}
        onModeSelect={navigation.handleCreateRoomModeSelect}
      />
    );
  }
  if (screen === 'joinRoom') {
    return (
      <JoinRoomScreen
        onBack={() => navigation.setScreen('mainMenu')}
        onJoinSubmit={navigation.handleJoinSubmit}
        serverError={state.lastError}
      />
    );
  }

  return renderGameplayScreens(props);
}

export function App({ clientState, serverUrl, socketClient }: AppProps) {
  const { exit } = useApp();
  const state = useClientState(clientState);
  const { columns, rows } = useTerminalSize();
  const navigation = useAppNavigation({
    state,
    socketClient,
    onClearState: () => clientState.clearState(),
  });

  useEffect(() => {
    hideTerminalCursor();
    return () => {
      showTerminalCursor();
    };
  }, []);

  const handleExitApp = () => {
    exit();
    showTerminalCursor();
    clearTerminalScreen({ shouldRestoreCursor: true });
    setTimeout(() => {
      showTerminalCursor();
      clearTerminalScreen({ shouldRestoreCursor: true });
      process.exit(0);
    }, 20);
  };

  const sizeStatus = getTerminalSizeStatus(columns, rows);
  if (sizeStatus !== 'OPTIMAL') {
    return (
      <TerminalOutOfRangeScreen
        currentColumns={columns}
        currentRows={rows}
        status={sizeStatus}
        onExit={handleExitApp}
      />
    );
  }

  return (
    <Box flexDirection="column" width="100%">
      <ActiveScreenRouter
        state={state}
        navigation={navigation}
        socketClient={socketClient}
        serverUrl={serverUrl}
        onExit={handleExitApp}
      />
    </Box>
  );
}
