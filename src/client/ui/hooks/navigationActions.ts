import type { SocketClient } from '../../network/socketClient';
import type { ActiveScreen } from './useAppNavigation';

export function sendCreateRoomMessage(
  socketClient: SocketClient,
  playerName: string,
): void {
  if (!socketClient.isConnected) {
    throw new Error(
      'Server is not running. Please run "bun run server" in another terminal',
    );
  }
  socketClient.send({
    type: 'CREATE_ROOM',
    payload: { playerName, bootAmount: 50, maxPlayers: 4 },
  });
}

export function sendJoinRoomMessage(
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

export function resolveBackScreenFromIntent(
  intent: 'create' | 'join' | null,
): ActiveScreen {
  if (intent === 'create') {
    return 'createRoom';
  }
  if (intent === 'join') {
    return 'joinRoom';
  }
  return 'mainMenu';
}

export function executeUserSubmission(
  intent: 'create' | 'join' | null,
  name: string,
  networkMode: 'LAN' | 'INTERNET',
  pendingTarget: string,
  socketClient: SocketClient,
): void {
  if (intent === 'create') {
    sendCreateRoomMessage(socketClient, name);
  } else if (intent === 'join') {
    sendJoinRoomMessage(socketClient, networkMode, pendingTarget, name);
  }
}
