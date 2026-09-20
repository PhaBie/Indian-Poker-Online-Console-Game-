import { useApp } from 'ink';
import { SocketClient } from '../network/socketClient';
import type { Transport } from '../network/socketClient';
import { GameScreen } from './screens/GameScreen';
import {
  createGamePreviewState,
  GAME_PREVIEW_PLAYER_ID,
  type GamePreviewPlayerCount,
} from './screens/game/gamePreviewFixture';

const previewSocket = new SocketClient();
const previewTransport: Transport = {
  onOpen: null,
  send: () => undefined,
};

previewSocket.connect('ws://game-preview', previewTransport);
previewTransport.onOpen?.();

interface GamePreviewProps {
  readonly playerCount: GamePreviewPlayerCount;
}

export function GamePreview({ playerCount }: GamePreviewProps) {
  const { exit } = useApp();

  return (
    <GameScreen
      gameState={createGamePreviewState(playerCount)}
      myPlayerId={GAME_PREVIEW_PLAYER_ID}
      socketClient={previewSocket}
      onLeave={exit}
    />
  );
}
