import { describe, expect, test } from 'bun:test';
import { once } from 'events';
import WebSocket from 'ws';
import { PokerServer } from '../../../01-Source-code/server/index';
import { SocketClient } from '../../../01-Source-code/client/network/socketClient';
import type { ClientEvent, ServerEvent } from '../../../01-Source-code/shared/types';

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

describe('การแยกบริบทเซิร์ฟเวอร์ LAN และ Online (Server Mode Isolation)', () => {
  test('[NetworkIsolation] 7.22 การแทนที่การเชื่อมต่อที่รอดำเนินการจะไม่ยอมให้ timeout ของการเชื่อมต่อเดิมตัดการเชื่อมต่อใหม่', async () => {
    const lanServer = await startServer('LAN');
    const client = new SocketClient();
    const onConnectionChange = () => undefined;
    client.onConnectionChange = onConnectionChange;
    try {
      const shortTimeoutConnectionPromise = client.connectWithTimeout(lanServer.url, 40);
      const longTimeoutConnectionPromise = client.connectWithTimeout(lanServer.url, 500);
      expect(await shortTimeoutConnectionPromise).toBe(false);
      expect(await longTimeoutConnectionPromise).toBe(true);
      await Bun.sleep(60);
      expect(client.isConnected).toBe(true);
      expect(client.onConnectionChange).toBe(onConnectionChange);
    } finally {
      client.disconnect();
      lanServer.server.stop();
    }
  });

  test('[NetworkIsolation] 7.23 ห้องที่สร้างในโหมด Online จะแสดงผลเฉพาะในโหมด Online และไม่ปรากฏในโหมด LAN', async () => {
    const lanServer = await startServer('LAN');
    const onlineServer = await startServer('INTERNET');
    const onlineHostSocket = new WebSocket(onlineServer.url);
    const onlineGuestSocket = new WebSocket(onlineServer.url);
    const lanClientSocket = new WebSocket(lanServer.url);
    try {
      await Promise.all([
        once(onlineHostSocket, 'open'),
        once(onlineGuestSocket, 'open'),
        once(lanClientSocket, 'open'),
      ]);
      await requestRooms(
        onlineGuestSocket,
        {
          type: 'CREATE_ROOM',
          payload: { playerName: 'Alice', bootAmount: 50, maxPlayers: 4 },
        },
        'ROOM_CREATED',
      );
      const onlineRooms = await requestRooms(onlineHostSocket, { type: 'GET_ROOMS' });
      const lanRooms = await requestRooms(lanClientSocket, { type: 'GET_ROOMS' });
      if (onlineRooms.type !== 'ROOM_LIST' || lanRooms.type !== 'ROOM_LIST')
        throw new Error('Unexpected response');
      expect(onlineRooms.payload.rooms).toHaveLength(1);
      expect(onlineRooms.payload.rooms[0].hostName).toBe('Alice');
      expect(lanRooms.payload.rooms).toEqual([]);
      const roomId = onlineRooms.payload.rooms[0].roomId;
      const joined = await requestRooms(
        onlineHostSocket,
        { type: 'JOIN_ROOM', payload: { playerName: 'Bobby', roomId } },
        'GAME_STATE_UPDATE',
      );
      if (joined.type !== 'GAME_STATE_UPDATE') throw new Error('Missing game state');
      expect(joined.payload.players).toHaveLength(2);
      const rejected = await requestRooms(
        lanClientSocket,
        { type: 'JOIN_ROOM', payload: { playerName: 'Local', roomId } },
        'ERROR',
      );
      expect(rejected.type).toBe('ERROR');
    } finally {
      onlineHostSocket.terminate();
      onlineGuestSocket.terminate();
      lanClientSocket.terminate();
      lanServer.server.stop();
      onlineServer.server.stop();
    }
  });

  test('[NetworkIsolation] 7.24 ปฏิเสธการเชื่อมต่อข้ามโหมดและการส่งต่อทราฟฟิก (Forwarded Traffic) บน LAN', async () => {
    const lanServer = await startServer('LAN');
    const onlineServer = await startServer('INTERNET');
    try {
      for (const [url, headers] of [
        [lanServer.url.replace('mode=LAN', 'mode=INTERNET'), {}],
        [onlineServer.url.replace('mode=INTERNET', 'mode=LAN'), {}],
        [lanServer.url, { 'x-forwarded-for': '203.0.113.1' }],
      ] as const) {
        const clientSocket = new WebSocket(url, { headers });
        clientSocket.on('error', () => undefined);
        await new Promise<void>((resolve) => clientSocket.once('close', () => resolve()));
        expect(clientSocket.readyState).toBe(WebSocket.CLOSED);
        clientSocket.terminate();
      }
    } finally {
      lanServer.server.stop();
      onlineServer.server.stop();
    }
  });
});
