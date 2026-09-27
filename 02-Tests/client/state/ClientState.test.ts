import { describe, expect, test } from 'bun:test';
import type { ServerEvent } from '../../../01-Source-code/shared/types';
import { ClientState } from '../../../01-Source-code/client/state/ClientState';

describe('19. การจัดการสถานะและข้อผิดพลาดฝั่งไคลเอนต์ (ClientState Lifecycle)', () => {
  test('[ClientState.updateState] 19.1 ล้างข้อผิดพลาดการเข้าห้องเดิมเมื่อได้รับรายการห้องที่อัปเดตใหม่ (ROOM_LIST)', () => {
    const clientState = new ClientState();
    const duplicateNameError: ServerEvent = {
      type: 'ERROR',
      message: 'Player name "XDop" is already in use in this room',
      code: 'NAME_TAKEN',
    };

    clientState.updateState(duplicateNameError);
    expect(clientState.getSnapshot().lastError).toBe(duplicateNameError.message);

    clientState.updateState({
      type: 'ROOM_LIST',
      payload: { rooms: [] },
    });

    expect(clientState.getSnapshot().lastError).toBeNull();
  });

  test('[ClientState.updateState] 19.2 ล้างข้อผิดพลาดในห้องเดิมเมื่อเกมเริ่มเข้าสู่สถานะ PLAYING', () => {
    const clientState = new ClientState();
    clientState.updateState({
      type: 'ERROR',
      message: 'All players must be READY to start',
    });

    clientState.updateState({
      type: 'GAME_STATE_UPDATE',
      payload: {
        roomId: 'room-1',
        phase: 'PLAYING',
        hostId: 'host-1',
        maxPlayers: 2,
        pot: 100,
        currentStake: 50,
        currentTurnPlayerId: 'host-1',
        turnEndTime: null,
        players: [],
        myCards: [],
      },
    });

    expect(clientState.getSnapshot().lastError).toBeNull();
  });

  test('[ClientState.updateState] 19.3 ล้างสถานะเกมและบันทึกว่าห้องถูกปิดเมื่อ Host ออกจากห้อง (ROOM_CLOSED)', () => {
    const clientState = new ClientState();
    clientState.updateState({
      type: 'GAME_STATE_UPDATE',
      payload: {
        roomId: 'room-1',
        phase: 'PLAYING',
        hostId: 'host-1',
        maxPlayers: 2,
        pot: 100,
        currentStake: 50,
        currentTurnPlayerId: 'host-1',
        turnEndTime: null,
        players: [],
        myCards: [],
      },
    });

    clientState.updateState({ type: 'ROOM_CLOSED', payload: { roomId: 'room-1' } });

    expect(clientState.getSnapshot()).toMatchObject({
      currentRoomId: null,
      latestGameState: null,
      latestGameResult: null,
      roomClosed: true,
    });
  });
});
