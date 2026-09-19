import React, { useState, useEffect } from 'react';
import { Box } from 'ink';
import type { ClientState } from '../state/ClientState';
import { useClientState } from './hooks/useClientState';
import { ConnectScreen } from './screens/ConnectScreen';
import { MainMenuScreen } from './screens/MainMenuScreen';
import { CreateRoomScreen } from './screens/CreateRoomScreen';
import { JoinRoomScreen } from './screens/JoinRoomScreen';
import { EnterUsernameScreen } from './screens/EnterUsernameScreen';
import { WaitingRoomScreen } from './screens/WaitingRoomScreen';
import { GameScreen } from './screens/GameScreen';
import { RoundResultScreen } from './screens/RoundResultScreen';
import type { SocketClient } from '../network/socketClient';

export interface AppProps {
  clientState: ClientState;
  serverUrl: string;
  socketClient: SocketClient;
}

export function App({ clientState, serverUrl, socketClient }: AppProps) {
  const state = useClientState(clientState);
  const [screen, setScreen] = useState<
    | 'connect'
    | 'mainMenu'
    | 'enterName'
    | 'createRoom'
    | 'joinRoom'
    | 'waitingRoom'
    | 'game'
    | 'result'
  >('connect');
  const [playerName, setPlayerName] = useState('');
  const [intent, setIntent] = useState<'create' | 'join' | null>(null);
  const [networkMode, setNetworkMode] = useState<'LAN' | 'INTERNET'>('LAN');

  useEffect(() => {
    if (screen === 'connect') {
      const timer = setTimeout(() => {
        setScreen('mainMenu');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  useEffect(() => {
    if (state.latestGameState?.phase === 'LOBBY' && screen !== 'waitingRoom') {
      setScreen('waitingRoom');
    } else if (state.latestGameState?.phase === 'PLAYING' && screen !== 'game') {
      setScreen('game');
    } else if (state.latestGameState?.phase === 'ENDED' && screen !== 'result') {
      setScreen('result');
    } else if (
      !state.latestGameState &&
      (screen === 'waitingRoom' || screen === 'game' || screen === 'result')
    ) {
      setScreen('mainMenu');
    }
  }, [state.latestGameState?.phase, screen]);

  const handleUsernameSubmit = (name: string) => {
    setPlayerName(name);
    if (intent === 'create') {
      setScreen('createRoom');
    } else if (intent === 'join') {
      setScreen('joinRoom');
    }
  };

  const handleJoinSubmit = (method: 'LAN' | 'INTERNET', target: string) => {
    setNetworkMode(method);
    if (method === 'LAN') {
      let wsUrl = target;
      if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
        wsUrl = `ws://${target}`;
      }

      socketClient.disconnect();
      socketClient.connect(wsUrl);

      setTimeout(() => {
        socketClient.send({
          type: 'JOIN_ROOM',
          payload: { playerName, roomId: '' }, // backend needs to handle empty roomId for LAN
        });
      }, 500);
    } else {
      socketClient.send({
        type: 'JOIN_ROOM',
        payload: { playerName, roomId: target },
      });
    }
  };

  const handleStartGame = () => {
    socketClient.send({ type: 'START_GAME' });
  };

  const handleToggleReady = () => {
    socketClient.send({ type: 'TOGGLE_READY' });
  };

  const handleLeaveRoom = () => {
    socketClient.send({ type: 'LEAVE_ROOM' });
    clientState.clearState();
    setScreen('mainMenu');
  };

  return (
    <Box>
      {screen === 'connect' && (
        <ConnectScreen playerId={state.myPlayerId} serverUrl={serverUrl} />
      )}
      {screen === 'mainMenu' && (
        <MainMenuScreen
          onCreateRoom={() => {
            setIntent('create');
            setScreen('enterName');
          }}
          onJoinRoom={() => {
            setIntent('join');
            setScreen('enterName');
          }}
        />
      )}
      {screen === 'enterName' && <EnterUsernameScreen onSubmit={handleUsernameSubmit} />}
      {screen === 'createRoom' && (
        <CreateRoomScreen
          socketClient={socketClient}
          onBack={() => setScreen('mainMenu')}
          roomId={state.currentRoomId}
          serverUrl={serverUrl}
          playerName={playerName}
          onModeSelect={(mode) => setNetworkMode(mode)}
        />
      )}
      {screen === 'joinRoom' && (
        <JoinRoomScreen
          onBack={() => setScreen('mainMenu')}
          onJoinSubmit={handleJoinSubmit}
          serverError={state.lastError}
        />
      )}
      {screen === 'waitingRoom' && state.latestGameState && (
        <WaitingRoomScreen
          roomId={state.currentRoomId}
          players={state.latestGameState.players}
          hostId={state.latestGameState.hostId}
          myPlayerId={state.myPlayerId}
          onStart={handleStartGame}
          onToggleReady={handleToggleReady}
          onLeave={handleLeaveRoom}
          networkMode={networkMode}
          serverUrl={serverUrl}
        />
      )}
      {screen === 'game' && state.latestGameState && (
        <GameScreen
          gameState={state.latestGameState}
          myPlayerId={state.myPlayerId}
          socketClient={socketClient}
          serverError={state.lastError}
        />
      )}
      {screen === 'result' && state.latestGameResult && state.latestGameState && (
        <RoundResultScreen
          result={state.latestGameResult}
          gameState={state.latestGameState}
          socketClient={socketClient}
          onLeave={handleLeaveRoom}
        />
      )}
    </Box>
  );
}
