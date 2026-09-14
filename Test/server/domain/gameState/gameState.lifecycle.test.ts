import { expect, test, describe } from 'bun:test';
import { PlayerStateError } from '../../../../src/server/domain/errors/GameError';
import { createGameStateFixture } from './fixtures/gameState.fixture';

describe('gameState.lifecycle', () => {
  test('[GameState.startGame] 4.1 เริ่มเกม → หักชิปเป็น Boot 50 เข้า Pot 100, ผู้เล่นได้รับไพ่คนละ 3 ใบ และผู้เล่นคนแรกสถานะเป็น ACTIVE', () => {
    const gameState = createGameStateFixture({}, [
      { id: 'firstPlayer', name: 'First Player', status: 'WAITING', chips: 1000 },
      { id: 'secondPlayer', name: 'Second Player', status: 'WAITING', chips: 1000 },
    ]);

    gameState.startGame();

    const [firstPlayer, secondPlayer] = gameState.activePlayers;
    expect(gameState.pot).toBe(100);
    expect(firstPlayer.chips).toBe(950);
    expect(secondPlayer.chips).toBe(950);
    expect(firstPlayer.privateCards.length).toBe(3);
    expect(secondPlayer.privateCards.length).toBe(3);
    expect(firstPlayer.status).toBe('ACTIVE');
  });

  test('[GameState.nextTurn] 4.2 เปลี่ยนเทิร์น → เปลี่ยนไปยังผู้เล่นคนถัดไป', () => {
    const gameState = createGameStateFixture({ currentPlayerIndex: 0 });
    gameState.nextTurn();
    expect(gameState.currentPlayerIndex).toBe(1);
  });

  test('[GameState.nextTurn] 4.3 ผู้เล่นสถานะ FOLDED หรือ DISCONNECTED → ข้ามเทิร์นไปยังคนถัดไปที่เป็น ACTIVE', () => {
    const gameState = createGameStateFixture({ currentPlayerIndex: 0 }, [
      { id: 'activePlayer', name: 'Active Player', status: 'ACTIVE', chips: 1000 },
      { id: 'foldedPlayer', name: 'Folded Player', status: 'FOLDED', chips: 1000 },
      {
        id: 'disconnectedPlayer',
        name: 'Disconnected Player',
        status: 'DISCONNECTED',
        chips: 1000,
      },
      {
        id: 'nextActivePlayer',
        name: 'Next Active Player',
        status: 'ACTIVE',
        chips: 1000,
      },
    ]);
    gameState.nextTurn();
    expect(gameState.currentPlayerIndex).toBe(3);
  });

  test('[GameState.startGame] 4.17 เริ่มเกมกับผู้เล่นสถานะ Blind → ผู้เล่นได้รับ privateCards ครบ 3 ใบและ isBlind ยังเป็น true', () => {
    const gameState = createGameStateFixture({}, [
      { id: 'firstPlayer', name: 'First Player', status: 'WAITING', chips: 1000 },
      { id: 'secondPlayer', name: 'Second Player', status: 'WAITING', chips: 1000 },
    ]);
    gameState.startGame();

    const [firstPlayer] = gameState.activePlayers;
    expect(firstPlayer.isBlind).toBe(true);
    expect(firstPlayer.privateCards.length).toBe(3);
  });

  test('[GameState.startGame] 4.18 เริ่มเกมด้วย Boot ที่กำหนดเอง → Pot และชิปถูกหักตาม Boot ใหม่', () => {
    const gameState = createGameStateFixture({}, [
      { id: 'firstPlayer', name: 'First Player', status: 'WAITING', chips: 1000 },
      { id: 'secondPlayer', name: 'Second Player', status: 'WAITING', chips: 1000 },
    ]);
    gameState.bootAmount = 200;
    gameState.startGame();

    const [firstPlayer, secondPlayer] = gameState.activePlayers;
    expect(gameState.pot).toBe(400);
    expect(firstPlayer.chips).toBe(800);
    expect(secondPlayer.chips).toBe(800);
  });

  test('[GameState.startGame] 4.19 แจกไพ่รวมกันครบสำรับมาตรฐาน 52 ใบ และไม่ซ้ำกัน', () => {
    const gameState = createGameStateFixture({}, [
      { id: 'firstPlayer', name: 'First Player', status: 'WAITING', chips: 1000 },
      { id: 'secondPlayer', name: 'Second Player', status: 'WAITING', chips: 1000 },
    ]);
    gameState.startGame();

    const [firstPlayer, secondPlayer] = gameState.activePlayers;
    const allCards = [
      ...firstPlayer.privateCards,
      ...secondPlayer.privateCards,
      ...gameState.deck,
    ];
    expect(allCards.length).toBe(52);

    const uniqueCards = new Set(allCards.map((card) => card.suit + '-' + card.rank));
    expect(uniqueCards.size).toBe(52);

    const suits = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];
    const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    for (const suit of suits) {
      for (const rank of ranks) {
        expect(Array.from(uniqueCards)).toContain(suit + '-' + rank);
      }
    }
  });

  test('[GameState.nextTurn] 4.20 ข้าม FOLDED และ DISCONNECTED หลายคนติดกัน', () => {
    const gameState = createGameStateFixture({ currentPlayerIndex: 0 }, [
      { id: 'activePlayer', name: 'Active Player', status: 'ACTIVE', chips: 1000 },
      { id: 'foldedPlayer1', name: 'Folded Player 1', status: 'FOLDED', chips: 1000 },
      {
        id: 'disconnectedPlayer',
        name: 'Disconnected Player',
        status: 'DISCONNECTED',
        chips: 1000,
      },
      { id: 'foldedPlayer2', name: 'Folded Player 2', status: 'FOLDED', chips: 1000 },
      {
        id: 'nextActivePlayer',
        name: 'Next Active Player',
        status: 'ACTIVE',
        chips: 1000,
      },
    ]);
    gameState.nextTurn();
    expect(gameState.currentPlayerIndex).toBe(4);
  });

  test('[GameState.nextTurn] 4.21 โยน PlayerStateError เมื่อไม่มีผู้เล่นสถานะ ACTIVE เหลืออยู่เลย', () => {
    const gameState = createGameStateFixture({ currentPlayerIndex: 0 }, [
      { id: `foldedPlayer`, name: `Folded Player`, status: `FOLDED`, chips: 1000 },
      {
        id: `disconnectedPlayer`,
        name: `Disconnected Player`,
        status: `DISCONNECTED`,
        chips: 1000,
      },
    ]);

    expect(() => {
      gameState.nextTurn();
    }).toThrow(PlayerStateError);

    expect(gameState.currentPlayerIndex).toBe(0);
  });

  test('[GameState.rotateDealer] 4.22 หมุน Dealer และวนกลับมาเริ่มต้นแถวใหม่', () => {
    const gameState = createGameStateFixture({ dealerIndex: 1 }, [
      { id: 'player1', name: 'Player 1', status: 'WAITING', chips: 1000 },
      { id: 'player2', name: 'Player 2', status: 'WAITING', chips: 1000 },
      { id: 'player3', name: 'Player 3', status: 'WAITING', chips: 1000 },
    ]);
    gameState.rotateDealer();
    expect(gameState.dealerIndex).toBe(2);
    gameState.rotateDealer();
    expect(gameState.dealerIndex).toBe(0);
  });

  test('[GameState.handlePlayerDisconnect] 4.29 เปลี่ยนสถานะผู้เล่นเป็น DISCONNECTED ไม่คืนเงิน', () => {
    const gameState = createGameStateFixture({ pot: 500 }, [
      {
        id: 'disconnectingPlayer',
        name: 'Disconnecting Player',
        status: 'ACTIVE',
        chips: 900,
      },
      { id: 'otherPlayer', name: 'Other Player', status: 'ACTIVE', chips: 1000 },
    ]);
    const [disconnectingPlayer] = gameState.activePlayers;
    disconnectingPlayer.bet = 100;

    gameState.handlePlayerDisconnect(disconnectingPlayer.id);

    expect(disconnectingPlayer.status).toBe('DISCONNECTED');
    expect(disconnectingPlayer.chips).toBe(900);
  });

  test('[GameState.nextTurn] 4.43 วนเทิร์นจากท้ายกลับมาคนแรก', () => {
    const gameState = createGameStateFixture({ currentPlayerIndex: 2 }, [
      { id: 'firstPlayer', name: 'First Player', status: 'ACTIVE', chips: 1000 },
      { id: 'secondPlayer', name: 'Second Player', status: 'ACTIVE', chips: 1000 },
      { id: 'thirdPlayer', name: 'Third Player', status: 'ACTIVE', chips: 1000 },
    ]);
    gameState.nextTurn();
    expect(gameState.currentPlayerIndex).toBe(0);
  });
});
