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
import { ServerConnectionScreen } from './screens/ServerConnectionScreen';
import { OnlineConnectionScreen } from './screens/OnlineConnectionScreen';
import { RoomBrowserScreen } from './screens/RoomBrowserScreen';
import { WaitingRoomScreen } from './screens/WaitingRoomScreen';
import { GameScreen } from './screens/GameScreen';
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
        maxPlayers={state.latestGameState.maxPlayers}
        myPlayerId={state.myPlayerId}
        onStart={navigation.handleStartGame}
        onToggleReady={navigation.handleToggleReady}
        onLeave={navigation.handleLeaveRoom}
        networkMode={navigation.networkMode}
        serverUrl={navigation.currentServerUrl || serverUrl}
        serverError={state.lastError}
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
        onLeave={navigation.handleLeaveRoom}
      />
    );
  }
  if (screen === 'result' && state.latestGameResult && state.latestGameState) {
    return (
      <GameScreen
        gameState={state.latestGameState}
        socketClient={socketClient}
        myPlayerId={state.myPlayerId}
        serverError={state.lastError}
        roundResult={state.latestGameResult}
        autoAdvanceRound
        onLeave={navigation.handleLeaveRoom}
      />
    );
  }
  return null;
}

function renderLobbyScreens(props: ActiveScreenRouterProps) {
  const { navigation, state, socketClient, serverUrl, onExit } = props;
  const { screen } = navigation;

  if (screen === 'intro') {
    return <GameIntroSplash onFinish={navigation.handleIntroFinish} />;
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
  if (screen === 'serverConnection') {
    return (
      <ServerConnectionScreen
        serverUrl={navigation.currentServerUrl || serverUrl}
        isConnected={socketClient.isConnected}
        onConnect={navigation.handleConnectServer}
        onConnectedSuccess={navigation.handleConnectedSuccess}
        onBack={() => navigation.setScreen('mainMenu')}
      />
    );
  }
  if (screen === 'onlineConnection') {
    return (
      <OnlineConnectionScreen
        initialUrl={navigation.onlineServerUrl}
        error={navigation.onlineError}
        isConnecting={navigation.isOnlineConnecting}
        onConnect={async (url) => {
          navigation.setOnlineServerUrl(url);
          return navigation.connectToOnlineServer(url);
        }}
        onBack={() =>
          navigation.setScreen(navigation.intent === 'create' ? 'createRoom' : 'joinRoom')
        }
      />
    );
  }
  if (screen === 'tableLounge') {
    return (
      <RoomBrowserScreen
        networkMode={navigation.networkMode}
        rooms={state.availableRooms}
        playerName={navigation.playerName}
        serverUrl={navigation.currentServerUrl || serverUrl}
        onJoinRoom={navigation.handleJoinTableFromLounge}
        onJoinRoomByCode={navigation.handleJoinTableByCode}
        onChangeName={navigation.handleChangeName}
        initialEnteringCode={navigation.resumeRoomCode}
        onRoomCodeOpened={navigation.clearResumeRoomCode}
        onRefresh={navigation.handleRefreshRooms}
        onBack={() => navigation.setScreen('mainMenu')}
        lastError={state.lastError}
      />
    );
  }
  return null;
}

function renderSetupScreens(props: ActiveScreenRouterProps) {
  const { navigation, state, socketClient, serverUrl } = props;
  const { screen } = navigation;

  if (screen === 'enterName') {
    return (
      <EnterUsernameScreen
        onSubmit={
          navigation.intent === null
            ? navigation.handleInitialUsernameSubmit
            : navigation.handleUsernameSubmit
        }
        onBack={navigation.handleBackFromUsername}
        networkMode={navigation.networkMode}
        intent={navigation.intent}
        isSessionSetup={navigation.intent === null}
        initialValue={navigation.playerName}
      />
    );
  }
  if (screen === 'createRoom') {
    return (
      <CreateRoomScreen
        socketClient={socketClient}
        onBack={() => navigation.setScreen('mainMenu')}
        roomId={state.currentRoomId}
        serverUrl={navigation.currentServerUrl || serverUrl}
        playerName={navigation.playerName}
        initialMode={navigation.networkMode}
        onModeSelect={navigation.handleCreateRoomModeSelect}
      />
    );
  }
  if (screen === 'joinRoom') {
    return (
      <JoinRoomScreen
        onBack={() => navigation.setScreen('mainMenu')}
        onJoinSubmit={navigation.handleJoinSubmit}
      />
    );
  }
  return null;
}

function ActiveScreenRouter(props: ActiveScreenRouterProps) {
  return (
    renderLobbyScreens(props) ?? renderSetupScreens(props) ?? renderGameplayScreens(props)
  );
}

export function App({ clientState, serverUrl, socketClient }: AppProps) {
  const { exit } = useApp();
  const state = useClientState(clientState);
  const { columns, rows } = useTerminalSize();
  const navigation = useAppNavigation({
    state,
    socketClient,
    initialServerUrl: serverUrl,
    onClearState: () => clientState.clearState(),
    onClearError: () => clientState.clearError(),
  });

  useEffect(() => {
    if (navigation.screen !== 'tableLounge' || !state.lastError) return;

    const dismissTimer = setTimeout(() => {
      clientState.clearError();
    }, 2500);

    return () => clearTimeout(dismissTimer);
  }, [clientState, navigation.screen, state.lastError]);

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
