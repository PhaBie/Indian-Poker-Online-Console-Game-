import { expect, test, describe, beforeEach } from 'bun:test';
import type { NetworkContext } from '../../../01-Source-code/server/network/socketHandler';
import { RoomManager } from '../../../01-Source-code/server/domain/services/RoomManager';
import { Player } from '../../../01-Source-code/server/domain/models/Player';

describe('ระบบจัดการผู้ชมและการรอคิว (WaitingPlayer and Queue Operations)', () => {
  let mockNetworkContext: NetworkContext;

  beforeEach(() => {
    const sessionMap = new Map<string, string>();
    let tokenSequence = 1;

    mockNetworkContext = {
      roomManager: new RoomManager(),
      sessionStore: {
        createSession: (playerId: string) => {
          const generatedToken = `token_${tokenSequence++}`;
          sessionMap.set(generatedToken, playerId);
          return generatedToken;
        },
        getPlayerId: (token: string) => sessionMap.get(token) || null,
      },
      connectedClients: new Map(),
    };
  });

  test('[WaitingQueue] 7.14 ส่งค่าเวลา roundStartedAt ใน GAME_STATE_UPDATE เมื่อเริ่มเกมเรียบร้อย', () => {
    const hostPlayer = new Player('host_1', 'Alice');
    const guestPlayer = new Player('guest_1', 'Bob');
    const activeRoom = mockNetworkContext.roomManager.createRoom(
      'room_606',
      hostPlayer,
      4,
    );
    activeRoom.join(guestPlayer);

    const timestampBeforeStart = Date.now();
    activeRoom.startGame('host_1');
    const timestampAfterStart = Date.now();

    expect(activeRoom.gameState).not.toBeNull();
    expect(activeRoom.gameState!.roundStartedAt).toBeGreaterThanOrEqual(
      timestampBeforeStart,
    );
    expect(activeRoom.gameState!.roundStartedAt).toBeLessThanOrEqual(timestampAfterStart);
  });
});
