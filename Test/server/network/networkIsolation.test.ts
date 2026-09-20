import { describe, expect, test } from 'bun:test';
import { once } from 'events';
import WebSocket from 'ws';
import { PokerServer } from '../../../src/server/index';
import { SocketClient } from '../../../src/client/network/socketClient';
import type { ClientEvent, ServerEvent } from '../../../src/shared/types';

async function startServer(mode: 'LAN' | 'INTERNET') {
  const server = new PokerServer(mode);
  server.start(0, '127.0.0.1');
  await once(server.wss!, 'listening');
  const address = server.wss!.address();
  if (!address || typeof address === 'string') throw new Error('Missing server address');
  return { server, url: `ws://127.0.0.1:${address.port}/?mode=${mode}` };
}

function requestRooms(
  ws: WebSocket,
  event: ClientEvent,
  responseType: ServerEvent['type'] = 'ROOM_LIST',
): Promise<ServerEvent> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', receive);
      reject(new Error('Room list timeout'));
    }, 2000);
    const receive = (data: WebSocket.RawData) => {
      const message = JSON.parse(data.toString()) as ServerEvent;
      if (message.type !== responseType) return;
      clearTimeout(timer);
      ws.off('message', receive);
      resolve(message);
    };
    ws.on('message', receive);
    ws.send(JSON.stringify(event));
  });
}

describe('LAN and Online server isolation', () => {
  test('replacing a pending connection cannot let its timeout disconnect the new one', async () => {
    const lan = await startServer('LAN');
    const client = new SocketClient();
    const onConnectionChange = () => undefined;
    client.onConnectionChange = onConnectionChange;
    try {
      const first = client.connectWithTimeout(lan.url, 40);
      const second = client.connectWithTimeout(lan.url, 500);
      expect(await first).toBe(false);
      expect(await second).toBe(true);
      await Bun.sleep(60);
      expect(client.isConnected).toBe(true);
      expect(client.onConnectionChange).toBe(onConnectionChange);
    } finally {
      client.disconnect();
      lan.server.stop();
    }
  });
  test('rooms created online are visible online but absent from LAN', async () => {
    const lan = await startServer('LAN');
    const online = await startServer('INTERNET');
    const host = new WebSocket(online.url);
    const guest = new WebSocket(online.url);
    const local = new WebSocket(lan.url);
    try {
      await Promise.all([once(host, 'open'), once(guest, 'open'), once(local, 'open')]);
      await requestRooms(
        guest,
        {
          type: 'CREATE_ROOM',
          payload: { playerName: 'Alice', bootAmount: 50, maxPlayers: 4 },
        },
        'ROOM_CREATED',
      );
      const onlineRooms = await requestRooms(host, { type: 'GET_ROOMS' });
      const lanRooms = await requestRooms(local, { type: 'GET_ROOMS' });
      if (onlineRooms.type !== 'ROOM_LIST' || lanRooms.type !== 'ROOM_LIST')
        throw new Error('Unexpected response');
      expect(onlineRooms.payload.rooms).toHaveLength(1);
      expect(onlineRooms.payload.rooms[0].hostName).toBe('Alice');
      expect(lanRooms.payload.rooms).toEqual([]);
      const roomId = onlineRooms.payload.rooms[0].roomId;
      const joined = await requestRooms(
        host,
        { type: 'JOIN_ROOM', payload: { playerName: 'Bobby', roomId } },
        'GAME_STATE_UPDATE',
      );
      if (joined.type !== 'GAME_STATE_UPDATE') throw new Error('Missing game state');
      expect(joined.payload.players).toHaveLength(2);
      const rejected = await requestRooms(
        local,
        { type: 'JOIN_ROOM', payload: { playerName: 'Local', roomId } },
        'ERROR',
      );
      expect(rejected.type).toBe('ERROR');
    } finally {
      host.terminate();
      guest.terminate();
      local.terminate();
      lan.server.stop();
      online.server.stop();
    }
  });

  test('rejects opposite modes and forwarded traffic on LAN', async () => {
    const lan = await startServer('LAN');
    const online = await startServer('INTERNET');
    try {
      for (const [url, headers] of [
        [lan.url.replace('mode=LAN', 'mode=INTERNET'), {}],
        [online.url.replace('mode=INTERNET', 'mode=LAN'), {}],
        [lan.url, { 'x-forwarded-for': '203.0.113.1' }],
      ] as const) {
        const ws = new WebSocket(url, { headers });
        ws.on('error', () => undefined);
        await new Promise<void>((resolve) => ws.once('close', () => resolve()));
        expect(ws.readyState).toBe(WebSocket.CLOSED);
        ws.terminate();
      }
    } finally {
      lan.server.stop();
      online.server.stop();
    }
  });
});
