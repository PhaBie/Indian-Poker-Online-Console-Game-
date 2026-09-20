import { describe, expect, test } from 'bun:test';
import type { ServerEvent } from '../../../src/shared/types';
import { ClientState } from '../../../src/client/state/ClientState';

describe('ClientState lobby error lifecycle', () => {
  test('clears a stale join error when a refreshed room list arrives', () => {
    const state = new ClientState();
    const duplicateNameError: ServerEvent = {
      type: 'ERROR',
      message: 'Player name "XDop" is already in use in this room',
      code: 'NAME_TAKEN',
    };

    state.updateState(duplicateNameError);
    expect(state.getSnapshot().lastError).toBe(duplicateNameError.message);

    state.updateState({
      type: 'ROOM_LIST',
      payload: { rooms: [] },
    });

    expect(state.getSnapshot().lastError).toBeNull();
  });

  test('clears a stale lobby error when the game starts', () => {
    const state = new ClientState();
    state.updateState({
      type: 'ERROR',
      message: 'All players must be READY to start',
    });

    state.updateState({
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

    expect(state.getSnapshot().lastError).toBeNull();
  });
});
