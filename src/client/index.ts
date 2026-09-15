import { SocketClient } from './network/socketClient';
import type { Transport } from './network/socketClient';
import { ClientState } from './state/ClientState';
import type { GameActionType, ServerEvent } from '../shared/types';

export interface ClientApp {
  serverUrl: string;
  socketClient: SocketClient;
  clientState: ClientState;
  createRoom: (playerName: string, bootAmount: number) => void;
  joinRoom: (playerName: string, roomId: string, reconnectToken?: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  playerAction: (action: GameActionType, amount?: number) => void;
  sendChat: (message: string) => void;
  stop: () => void;
}

export function startClient(
  customUrl?: string,
  transport?: Transport,
): ClientApp {
  // 1. รับ URL จาก Parameter หรือ argument ตอนรัน (ถ้าไม่ใส่ให้เป็น localhost:8080)
  const serverUrl = customUrl || process.argv[2] || 'ws://localhost:8080';

  console.log(`[Client] กำลังเชื่อมต่อไปยัง Server: ${serverUrl}`);

  // 2. สร้างตัวจัดการ Network และ State
  const socketClient = new SocketClient();
  const clientState = new ClientState();

  // 3. ผูก event จาก socketClient เข้ากับ clientState เพื่ออัปเดตสถานะอัตโนมัติ
  const originalOnReceive = socketClient.onReceive.bind(socketClient);
  socketClient.onReceive = (event: ServerEvent): void => {
    originalOnReceive(event);
    clientState.updateState(event);
  };

  // 4. สั่งเชื่อมต่อ
  socketClient.connect(serverUrl, transport);

  return {
    serverUrl,
    socketClient,
    clientState,
    createRoom: (playerName: string, bootAmount: number): void => {
      socketClient.send({
        type: 'CREATE_ROOM',
        payload: { playerName, bootAmount },
      });
    },
    joinRoom: (playerName: string, roomId: string, reconnectToken?: string): void => {
      socketClient.send({
        type: 'JOIN_ROOM',
        payload: { playerName, roomId, reconnectToken },
      });
    },
    leaveRoom: (): void => {
      socketClient.send({ type: 'LEAVE_ROOM' });
    },
    startGame: (): void => {
      socketClient.send({ type: 'START_GAME' });
    },
    playerAction: (action: GameActionType, amount?: number): void => {
      socketClient.send({
        type: 'PLAYER_ACTION',
        payload: { action, amount },
      });
    },
    sendChat: (message: string): void => {
      socketClient.send({
        type: 'SEND_CHAT',
        payload: { message },
      });
    },
    stop: (): void => {
      socketClient.disconnect();
      clientState.clearState();
    },
  };
}

if (process.argv[1]?.includes('client')) {
  startClient();
}