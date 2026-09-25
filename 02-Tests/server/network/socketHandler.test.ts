import { beforeEach, describe, expect, jest, test } from 'bun:test';
import type { WebSocket as WSWebSocket } from 'ws';
import type { NetworkContext } from '../../../src/server/network/socketHandler';
import {
  broadcastGameStateUpdate,
  handleClientDisconnect,
  handleClientMessage,
} from '../../../src/server/network/socketHandler';
import type { ServerEvent } from '../../../src/shared/types';
import { GAME_CONSTANTS } from '../../../src/shared/constants';
import { Player } from '../../../src/server/domain/models/Player';
import { RoomManager } from '../../../src/server/domain/services/RoomManager';

function client(events: ServerEvent[]): WSWebSocket {
  return {
    readyState: 1,
    send: (data: string) => events.push(JSON.parse(data) as ServerEvent),
  } as unknown as WSWebSocket;
}

function getRequiredGameStateUpdate(
  events: ServerEvent[],
): Extract<ServerEvent, { type: 'GAME_STATE_UPDATE' }>['payload'] {
  const latestEvent = [...events]
    .reverse()
    .find((event) => event.type === 'GAME_STATE_UPDATE');

  expect(latestEvent).toBeDefined();
  expect(latestEvent?.type).toBe('GAME_STATE_UPDATE');

  if (!latestEvent || latestEvent.type !== 'GAME_STATE_UPDATE') {
    throw new Error('Expected GAME_STATE_UPDATE event was not received');
  }

  return latestEvent.payload;
}

describe('7. ระบบควบคุมการจบรอบและเริ่มรอบใหม่โดย Host (Post-Round Flow)', () => {
  let context: NetworkContext;

  beforeEach(() => {
    context = {
      roomManager: new RoomManager(),
      sessionStore: { createSession: () => 'token', getPlayerId: () => null },
      connectedClients: new Map(),
    };
  });

  function endedRoom(playerCount: 2 | 3 | 4 = 2) {
    const host = new Player('host', 'Host');
    const room = context.roomManager.createRoom('room', host, 4);
    const guests = Array.from({ length: playerCount - 1 }, (_, index) => {
      const guest = new Player(`guest-${index}`, `Guest ${index}`);
      room.join(guest);
      return guest;
    });
    room.startGame(host.id);
    room.endGame(true);
    return { room, host, guests };
  }

  test.each([2, 3, 4])(
    '[PostRoundFlow] 7.2 โต๊ะที่มีผู้เล่น %i คนจะเข้าสู่สถานะ ENDED ก่อนหมดเวลาการตัดสินใจของ Host',
    (count) => {
      const { room } = endedRoom(count as 2 | 3 | 4);
      expect(room.phase).toBe('ENDED');
      expect(room.gameState).not.toBeNull();
    },
  );

  test('[PostRoundFlow] 7.3 เริ่มเกมใหม่โดยอัตโนมัติหลังผ่านไป 5 วินาทีหาก Host ไม่ได้ส่งคำสั่งตัดสินใจ', () => {
    jest.useFakeTimers();
    try {
      const host = new Player('host', 'Host');
      const guest = new Player('guest', 'Guest');
      const room = context.roomManager.createRoom('auto-next', host, 2);
      room.join(guest);
      room.startGame(host.id);
      room.gameState!.currentPlayerIndex = room.gameState!.activePlayers.findIndex(
        (player) => player.id === host.id,
      );
      const events: ServerEvent[] = [];
      const hostClient = client(events);
      context.connectedClients.set(hostClient, {
        playerId: host.id,
        roomId: room.roomId,
      });

      handleClientMessage(
        hostClient,
        { type: 'PLAYER_ACTION', payload: { action: 'FOLD' } },
        context,
      );

      expect(room.phase).toBe('ENDED');
      jest.advanceTimersByTime(4_999);
      expect(room.phase).toBe('ENDED');
      jest.advanceTimersByTime(1);
      expect(room.phase).toBe('PLAYING');
    } finally {
      jest.useRealTimers();
    }
  });

  test('[PostRoundFlow] 7.4 ผู้เล่นที่ไม่ใช่ Host ไม่สามารถสั่งเริ่มเกมใหม่ (NEXT_GAME) หรือกลับห้องรอ (END_GAME) ได้', () => {
    const { room, host, guests } = endedRoom();
    const events: ServerEvent[] = [];
    const guestClient = client(events);
    context.connectedClients.set(guestClient, {
      playerId: guests[0].id,
      roomId: room.roomId,
    });

    handleClientMessage(guestClient, { type: 'NEXT_GAME' }, context);
    handleClientMessage(guestClient, { type: 'END_GAME' }, context);

    expect(room.phase).toBe('ENDED');
    expect(room.hostId).toBe(host.id);
    expect(events.filter((event) => event.type === 'ERROR')).toHaveLength(2);
  });

  test('[PostRoundFlow] 7.5 Host เลือก NEXT GAME → รักษาชิปสะสมและดึงผู้เล่น WAITING ที่มีชิปเพียงพอเข้ารอบ', () => {
    const { room, host, guests } = endedRoom(2);
    const hostChipsBeforeNextGame = host.chips;
    const guestChipsBeforeNextGame = guests[0].chips;
    const waitingPlayer = new Player('waiting', 'Waiting');
    room.join(waitingPlayer);
    const events: ServerEvent[] = [];
    const hostClient = client(events);
    context.connectedClients.set(hostClient, { playerId: host.id, roomId: room.roomId });

    handleClientMessage(hostClient, { type: 'NEXT_GAME' }, context);

    expect(room.phase).toBe('PLAYING');
    expect(room.gameState?.activePlayers.map((player) => player.id)).toContain(
      waitingPlayer.id,
    );
    expect(room.getPlayer(waitingPlayer.id)?.chips).toBe(
      GAME_CONSTANTS.DEFAULT_STARTING_CHIPS - room.bootAmount,
    );
    expect(host.chips).toBe(hostChipsBeforeNextGame - room.bootAmount);
    expect(guests[0].chips).toBe(guestChipsBeforeNextGame - room.bootAmount);
  });

  test('[PostRoundFlow] 7.6 Host เลือก END GAME → ส่งผู้เล่นทุกคนที่เชื่อมต่ออยู่กลับห้องรอ (LOBBY) พร้อมรีเซ็ตชิปเริ่มต้น', () => {
    const { room, host, guests } = endedRoom(3);
    const events: ServerEvent[] = [];
    const hostClient = client(events);
    context.connectedClients.set(hostClient, { playerId: host.id, roomId: room.roomId });

    handleClientMessage(hostClient, { type: 'END_GAME' }, context);

    expect(room.phase).toBe('LOBBY');
    expect(room.gameState).toBeNull();
    for (const player of [host, ...guests]) {
      expect(player.status).toBe('WAITING');
      expect(player.chips).toBe(GAME_CONSTANTS.DEFAULT_STARTING_CHIPS);
    }
  });

  test('[PostRoundFlow] 7.7 สถานะ ENDED บรอดแคสต์ currentTurnPlayerId เป็น null เพื่อล็อกการกระทำของผู้เล่น', () => {
    const { room, host } = endedRoom();
    const events: ServerEvent[] = [];
    const hostClient = client(events);
    context.connectedClients.set(hostClient, { playerId: host.id, roomId: room.roomId });
    broadcastGameStateUpdate(room.roomId, context);
    const state = events.find((event) => event.type === 'GAME_STATE_UPDATE');
    expect(
      state?.type === 'GAME_STATE_UPDATE' && state.payload.currentTurnPlayerId,
    ).toBeNull();
  });

  test('[PostRoundFlow] 7.8 ผู้เล่นที่ไม่ใช่ Host ตัดการเชื่อมต่อจะถูกนำออกทันที และหากเหลือ Host คนเดียวห้องจะกลับสู่ LOBBY', () => {
    const host = new Player('host', 'Host');
    const guest = new Player('guest', 'Thanathon');
    const room = context.roomManager.createRoom('disconnect-lone-host', host, 2);
    room.join(guest);
    room.startGame(host.id);
    const hostEvents: ServerEvent[] = [];
    const hostClient = client(hostEvents);
    const guestClient = client([]);
    context.connectedClients.set(hostClient, { playerId: host.id, roomId: room.roomId });
    context.connectedClients.set(guestClient, {
      playerId: guest.id,
      roomId: room.roomId,
    });

    handleClientDisconnect(guestClient, context);

    expect(room.getPlayer(guest.id)).toBeUndefined();
    expect(room.phase).toBe('LOBBY');
    expect(room.gameState).toBeNull();
    expect(room.getPlayerCount()).toBe(1);
    expect(hostEvents.some((event) => event.type === 'GAME_LOG_MESSAGE')).toBe(false);
  });

  test('[PostRoundFlow] 7.9 ผู้เล่นที่หลุดระหว่างเล่นจะทำให้รอบจบลงเมื่อเหลือ Host และผู้เล่น WAITING รวมกันครบจำนวนเริ่มรอบใหม่ได้', () => {
    const host = new Player('host', 'Host');
    const guest = new Player('guest', 'Thanathon');
    const waitingPlayer = new Player('waiting', 'Waiting');
    const room = context.roomManager.createRoom('disconnect-with-waiting', host, 3);
    room.join(guest);
    room.startGame(host.id);
    room.join(waitingPlayer);
    const hostEvents: ServerEvent[] = [];
    const hostClient = client(hostEvents);
    const guestClient = client([]);
    context.connectedClients.set(hostClient, { playerId: host.id, roomId: room.roomId });
    context.connectedClients.set(guestClient, {
      playerId: guest.id,
      roomId: room.roomId,
    });

    handleClientDisconnect(guestClient, context);

    expect(room.getPlayer(guest.id)).toBeUndefined();
    expect(room.phase).toBe('ENDED');
    expect(room.getPlayerCount()).toBe(2);
    expect(room.getPlayer(waitingPlayer.id)?.status).toBe('WAITING');
    const result = hostEvents.find((event) => event.type === 'GAME_RESULT');
    expect(result?.type === 'GAME_RESULT' && result.payload.departedPlayers).toEqual([
      { id: guest.id, name: guest.name, status: 'DISCONNECTED' },
    ]);
  });

  test('[PostRoundFlow] 7.10 บันทึกข้อมูลผู้เล่นที่ตัดการเชื่อมต่อระหว่างเล่นไว้ในตารางผลสรุปเกม (GAME_RESULT)', () => {
    const host = new Player('host', 'Host');
    const firstGuest = new Player('guest-1', 'Disconnected player');
    const secondGuest = new Player('guest-2', 'Still playing');
    const room = context.roomManager.createRoom('disconnect-before-result', host, 4);
    room.join(firstGuest);
    room.join(secondGuest);
    room.startGame(host.id);
    room.gameState!.currentPlayerIndex = room.gameState!.activePlayers.findIndex(
      (player) => player.id === secondGuest.id,
    );

    const hostEvents: ServerEvent[] = [];
    const hostClient = client(hostEvents);
    const firstGuestClient = client([]);
    const secondGuestClient = client([]);
    context.connectedClients.set(hostClient, { playerId: host.id, roomId: room.roomId });
    context.connectedClients.set(firstGuestClient, {
      playerId: firstGuest.id,
      roomId: room.roomId,
    });
    context.connectedClients.set(secondGuestClient, {
      playerId: secondGuest.id,
      roomId: room.roomId,
    });

    handleClientDisconnect(firstGuestClient, context);
    expect(room.phase).toBe('PLAYING');

    handleClientMessage(
      secondGuestClient,
      { type: 'PLAYER_ACTION', payload: { action: 'FOLD' } },
      context,
    );

    const result = hostEvents.find((event) => event.type === 'GAME_RESULT');
    expect(result?.type === 'GAME_RESULT' && result.payload.departedPlayers).toEqual([
      { id: firstGuest.id, name: firstGuest.name, status: 'DISCONNECTED' },
    ]);
  });
});

describe('การรักษาความลับของไพ่ระดับเครือข่าย (Sideshow Network Card Privacy)', () => {
  let context: NetworkContext;
  const sessions = new Map<string, string>();

  beforeEach(() => {
    sessions.clear();
    context = {
      roomManager: new RoomManager(),
      sessionStore: {
        createSession: (playerId: string) => {
          const token = `reconnect-token-${playerId}`;
          sessions.set(token, playerId);
          return token;
        },
        getPlayerId: (token: string) => sessions.get(token) ?? null,
      },
      connectedClients: new Map(),
    };
  });

  function setupThreePlayerGameForSideshow(roomId: string = 'sideshowRoom') {
    const challenger = new Player('playerChallenger', 'Challenger');
    const target = new Player('playerTarget', 'Target');
    const thirdPlayer = new Player('playerThird', 'Third Player');
    const room = context.roomManager.createRoom(roomId, challenger, 4);
    room.join(target);
    room.join(thirdPlayer);

    const challengerEvents: ServerEvent[] = [];
    const targetEvents: ServerEvent[] = [];
    const thirdPlayerEvents: ServerEvent[] = [];

    const challengerClient = client(challengerEvents);
    const targetClient = client(targetEvents);
    const thirdPlayerClient = client(thirdPlayerEvents);

    context.connectedClients.set(challengerClient, {
      playerId: challenger.id,
      roomId: room.roomId,
    });
    context.connectedClients.set(targetClient, {
      playerId: target.id,
      roomId: room.roomId,
    });
    context.connectedClients.set(thirdPlayerClient, {
      playerId: thirdPlayer.id,
      roomId: room.roomId,
    });

    room.startGame(challenger.id);

    for (const activePlayer of room.gameState!.activePlayers) {
      activePlayer.isBlind = false;
    }

    room.gameState!.activePlayers = [target, challenger, thirdPlayer];
    room.gameState!.currentPlayerIndex = 1;

    challenger.privateCards = [
      { suit: 'SPADES', rank: 14 },
      { suit: 'HEARTS', rank: 14 },
      { suit: 'DIAMONDS', rank: 14 },
    ];
    target.privateCards = [
      { suit: 'SPADES', rank: 2 },
      { suit: 'HEARTS', rank: 3 },
      { suit: 'DIAMONDS', rank: 4 },
    ];
    thirdPlayer.privateCards = [
      { suit: 'CLUBS', rank: 7 },
      { suit: 'DIAMONDS', rank: 8 },
      { suit: 'HEARTS', rank: 9 },
    ];

    return {
      room,
      challenger,
      target,
      thirdPlayer,
      challengerClient,
      targetClient,
      thirdPlayerClient,
      challengerEvents,
      targetEvents,
      thirdPlayerEvents,
    };
  }

  test('[NetworkPrivacy] 7.25 คู่ดวลทั้งสองฝ่ายได้รับผลและไพ่ของคู่ดวล ขณะที่ผู้เล่นคนที่สามได้รับ sideshowResult เป็น null', () => {
    const fixture = setupThreePlayerGameForSideshow('sideshow-privacy-8-1');

    handleClientMessage(
      fixture.challengerClient,
      { type: 'PLAYER_ACTION', payload: { action: 'SIDESHOW' } },
      context,
    );

    handleClientMessage(
      fixture.targetClient,
      { type: 'PLAYER_ACTION', payload: { action: 'ACCEPT_SIDESHOW' } },
      context,
    );

    const challengerPayload = getRequiredGameStateUpdate(fixture.challengerEvents);
    const targetPayload = getRequiredGameStateUpdate(fixture.targetEvents);
    const thirdPartyPayload = getRequiredGameStateUpdate(fixture.thirdPlayerEvents);

    expect(challengerPayload.sideshowResult).not.toBeNull();
    expect(challengerPayload.sideshowResult?.cards).toEqual({
      playerChallenger: fixture.challenger.privateCards,
      playerTarget: fixture.target.privateCards,
    });

    expect(targetPayload.sideshowResult).not.toBeNull();
    expect(targetPayload.sideshowResult?.cards).toEqual({
      playerChallenger: fixture.challenger.privateCards,
      playerTarget: fixture.target.privateCards,
    });

    expect(thirdPartyPayload.sideshowResult).toBeNull();
    expect(thirdPartyPayload.showdownCards).toBeNull();

    const serializedThirdPartyPayload = JSON.stringify(thirdPartyPayload);
    expect(serializedThirdPartyPayload.includes('"rank":14')).toBe(false);
    expect(serializedThirdPartyPayload.includes('"rank":2')).toBe(false);
  });

  test('[NetworkPrivacy] 7.26 การปฏิเสธ Sideshow (Decline) ต้องไม่ส่งข้อมูลไพ่ของคู่ดวลให้ผู้เล่นคนใดในห้อง', () => {
    const fixture = setupThreePlayerGameForSideshow('sideshow-privacy-8-2');

    handleClientMessage(
      fixture.challengerClient,
      { type: 'PLAYER_ACTION', payload: { action: 'SIDESHOW' } },
      context,
    );

    handleClientMessage(
      fixture.targetClient,
      { type: 'PLAYER_ACTION', payload: { action: 'REJECT_SIDESHOW' } },
      context,
    );

    const challengerPayload = getRequiredGameStateUpdate(fixture.challengerEvents);
    const targetPayload = getRequiredGameStateUpdate(fixture.targetEvents);
    const thirdPartyPayload = getRequiredGameStateUpdate(fixture.thirdPlayerEvents);

    expect(challengerPayload.sideshowResult).toBeNull();
    expect(targetPayload.sideshowResult).toBeNull();
    expect(thirdPartyPayload.sideshowResult).toBeNull();

    expect(challengerPayload.sideshowNotice).toEqual({
      challengerId: 'playerChallenger',
      targetId: 'playerTarget',
      outcome: 'DECLINED',
    });
    expect(thirdPartyPayload.sideshowNotice).toEqual({
      challengerId: 'playerChallenger',
      targetId: 'playerTarget',
      outcome: 'DECLINED',
    });
  });

  test('[NetworkPrivacy] 7.27 เมื่อครบเวลาแสดงผล (Clear Delay) ข้อมูลไพ่ Sideshow จะถูกล้างและส่งค่า null ให้ทุกคน', () => {
    jest.useFakeTimers();
    try {
      const fixture = setupThreePlayerGameForSideshow('sideshow-privacy-8-3');

      handleClientMessage(
        fixture.challengerClient,
        { type: 'PLAYER_ACTION', payload: { action: 'SIDESHOW' } },
        context,
      );

      handleClientMessage(
        fixture.targetClient,
        { type: 'PLAYER_ACTION', payload: { action: 'ACCEPT_SIDESHOW' } },
        context,
      );

      expect(fixture.room.gameState?.lastSideshow).not.toBeNull();

      jest.advanceTimersByTime(6_000);

      expect(fixture.room.gameState?.lastSideshow).toBeNull();

      const clearedChallengerPayload = getRequiredGameStateUpdate(
        fixture.challengerEvents,
      );
      const clearedTargetPayload = getRequiredGameStateUpdate(fixture.targetEvents);

      expect(clearedChallengerPayload.sideshowResult).toBeNull();
      expect(clearedTargetPayload.sideshowResult).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  test('[NetworkPrivacy] 7.28 ผู้เล่นคนที่สามที่เชื่อมต่อใหม่ (Reconnect) ระหว่างช่วงแสดงผล ต้องไม่ได้รับข้อมูลไพ่ของคู่ดวล', () => {
    const fixture = setupThreePlayerGameForSideshow('sideshow-privacy-8-4');
    const thirdPlayerReconnectToken = context.sessionStore.createSession(
      fixture.thirdPlayer.id,
    );

    handleClientMessage(
      fixture.challengerClient,
      { type: 'PLAYER_ACTION', payload: { action: 'SIDESHOW' } },
      context,
    );

    handleClientMessage(
      fixture.targetClient,
      { type: 'PLAYER_ACTION', payload: { action: 'ACCEPT_SIDESHOW' } },
      context,
    );

    expect(fixture.room.gameState?.lastSideshow).not.toBeNull();

    fixture.thirdPlayer.status = 'DISCONNECTED';

    const thirdPlayerReconnectEvents: ServerEvent[] = [];
    const thirdPlayerReconnectClient = client(thirdPlayerReconnectEvents);

    handleClientMessage(
      thirdPlayerReconnectClient,
      {
        type: 'JOIN_ROOM',
        payload: {
          playerName: fixture.thirdPlayer.name,
          roomId: fixture.room.roomId,
          reconnectToken: thirdPlayerReconnectToken,
        },
      },
      context,
    );

    expect(fixture.room.getPlayer(fixture.thirdPlayer.id)?.status).toBe('WAITING');

    const reconnectedThirdPartyPayload = getRequiredGameStateUpdate(
      thirdPlayerReconnectEvents,
    );
    expect(reconnectedThirdPartyPayload.sideshowResult).toBeNull();
    expect(reconnectedThirdPartyPayload.showdownCards).toBeNull();

    const serializedPayload = JSON.stringify(reconnectedThirdPartyPayload);
    expect(serializedPayload.includes('"rank":14')).toBe(false);
    expect(serializedPayload.includes('"rank":2')).toBe(false);
  });

  test('[NetworkShowdown] 7.29 SHOW ส่ง showdownCards ก่อน และส่ง GAME_RESULT พร้อม winReason และ winningHand จริงหลัง 4 วินาที', () => {
    jest.useFakeTimers();
    try {
      const requester = new Player('playerRequester', 'Requester');
      const opponent = new Player('playerOpponent', 'Opponent');
      const room = context.roomManager.createRoom('showdown-reveal-room', requester, 2);
      room.join(opponent);

      const requesterEvents: ServerEvent[] = [];
      const opponentEvents: ServerEvent[] = [];

      const requesterClient = client(requesterEvents);
      const opponentClient = client(opponentEvents);

      context.connectedClients.set(requesterClient, {
        playerId: requester.id,
        roomId: room.roomId,
      });
      context.connectedClients.set(opponentClient, {
        playerId: opponent.id,
        roomId: room.roomId,
      });

      room.startGame(requester.id);

      requester.isBlind = false;
      opponent.isBlind = false;

      requester.privateCards = [
        { suit: 'SPADES', rank: 14 },
        { suit: 'HEARTS', rank: 14 },
        { suit: 'DIAMONDS', rank: 14 },
      ];
      opponent.privateCards = [
        { suit: 'SPADES', rank: 13 },
        { suit: 'HEARTS', rank: 8 },
        { suit: 'DIAMONDS', rank: 3 },
      ];

      room.gameState!.activePlayers = [requester, opponent];
      room.gameState!.currentPlayerIndex = 0;

      handleClientMessage(
        requesterClient,
        { type: 'PLAYER_ACTION', payload: { action: 'SHOW' } },
        context,
      );

      const updatePayload = getRequiredGameStateUpdate(requesterEvents);
      expect(updatePayload.showdownCards).not.toBeNull();
      expect(updatePayload.showdownCards?.playerRequester).toHaveLength(3);
      expect(updatePayload.showdownCards?.playerOpponent).toHaveLength(3);

      const gameResultsBeforeDelay = requesterEvents.filter(
        (event) => event.type === 'GAME_RESULT',
      );
      expect(gameResultsBeforeDelay).toHaveLength(0);

      jest.advanceTimersByTime(4_000);

      const gameResultsAfterDelay = requesterEvents.filter(
        (event): event is Extract<ServerEvent, { type: 'GAME_RESULT' }> =>
          event.type === 'GAME_RESULT',
      );
      expect(gameResultsAfterDelay).toHaveLength(1);
      expect(gameResultsAfterDelay[0].payload.winnerIds).toEqual(['playerRequester']);
      expect(gameResultsAfterDelay[0].payload.winReason).toBe('SHOW');
      expect(gameResultsAfterDelay[0].payload.winningHand).toBe('TRAIL');
    } finally {
      jest.useRealTimers();
    }
  });
});
