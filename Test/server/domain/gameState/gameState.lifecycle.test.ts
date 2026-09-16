import { expect, test, describe } from 'bun:test';
import { PlayerStateError } from '../../../../src/server/domain/errors/GameError';
import { createGameStateFixture } from './fixtures/gameState.fixture';
import { expectGameErrorWithCode } from '../helpers/expectGameErrorWithCode';

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
    expect(secondPlayer.status).toBe('ACTIVE');
    expect(firstPlayer.isBlind).toBe(true);
    expect(secondPlayer.isBlind).toBe(true);
    expect(gameState.currentStake).toBe(50);
  });

  test('[GameState.nextTurn] 4.2 เปลี่ยนเทิร์น → เปลี่ยนไปยังผู้เล่นคนถัดไป', () => {
    const gameState = createGameStateFixture({ currentPlayerIndex: 0 });
    gameState.nextTurn();
    expect(gameState.currentPlayerIndex).toBe(1);
  });

  test('[GameState.nextTurn] 4.3 ผู้เล่นสถานะ FOLDED, DISCONNECTED หรือ WAITING → ข้ามเทิร์นไปยังคนถัดไปที่เป็น ACTIVE', () => {
    const gameState = createGameStateFixture({ currentPlayerIndex: 0 }, [
      { id: 'activePlayer', name: 'Active Player', status: 'ACTIVE', chips: 1000 },
      { id: 'foldedPlayer', name: 'Folded Player', status: 'FOLDED', chips: 1000 },
      { id: 'waitingPlayer', name: 'Waiting Player', status: 'WAITING', chips: 1000 },
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
    expect(gameState.currentPlayerIndex).toBe(4);
  });

  test('[GameState.nextTurn] 4.3.1 หากเหลือ ACTIVE คนเดียว ต้องไม่เปลี่ยนเงินและไพ่', () => {
    const gameState = createGameStateFixture({ currentPlayerIndex: 0 }, [
      { id: 'activePlayer', name: 'Active Player', status: 'ACTIVE', chips: 1000 },
      { id: 'foldedPlayer', name: 'Folded Player', status: 'FOLDED', chips: 1000 },
    ]);
    const player = gameState.activePlayers[0];
    const originalChips = player.chips;

    gameState.nextTurn();

    expect(gameState.currentPlayerIndex).toBe(0);
    expect(player.chips).toBe(originalChips);
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
      { id: 'foldedPlayer', name: 'Folded Player', status: 'FOLDED', chips: 1000 },
      {
        id: 'disconnectedPlayer',
        name: 'Disconnected Player',
        status: 'DISCONNECTED',
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
      { id: 'playerOne', name: 'Player 1', status: 'WAITING', chips: 1000 },
      { id: 'playerTwo', name: 'Player 2', status: 'WAITING', chips: 1000 },
      { id: 'playerThree', name: 'Player 3', status: 'WAITING', chips: 1000 },
    ]);
    gameState.rotateDealer();
    expect(gameState.dealerIndex).toBe(2);
    gameState.rotateDealer();
    expect(gameState.dealerIndex).toBe(0);
  });

  test('[GameState.handlePlayerDisconnect] 4.29 เปลี่ยนสถานะผู้เล่นเป็น DISCONNECTED ไม่คืนเงิน และไม่กระทบยอดคนอื่น', () => {
    const gameState = createGameStateFixture({ pot: 500, currentPlayerIndex: 0 }, [
      {
        id: 'disconnectingPlayer',
        name: 'Disconnecting Player',
        status: 'ACTIVE',
        chips: 900,
      },
      { id: 'secondPlayer', name: 'Second Player', status: 'ACTIVE', chips: 1000 },
      { id: 'thirdPlayer', name: 'Third Player', status: 'ACTIVE', chips: 1000 },
    ]);
    const [disconnectingPlayer, secondPlayer, thirdPlayer] = gameState.activePlayers;
    disconnectingPlayer.bet = 100;

    gameState.handlePlayerDisconnect(disconnectingPlayer.id);

    expect(disconnectingPlayer.status).toBe('DISCONNECTED');
    expect(disconnectingPlayer.chips).toBe(900);
    expect(secondPlayer.chips).toBe(1000);
    expect(thirdPlayer.chips).toBe(1000);
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

  test('[GameState.startGame] 4.54 เริ่มเกมแต่มีผู้เล่นเงินไม่พอจ่าย Boot -> ปฏิเสธการเริ่มและไม่หักเงินใคร', () => {
    const gameState = createGameStateFixture({ bootAmount: 50 }, [
      { id: 'playerOne', name: 'Player One', status: 'WAITING', chips: 1000 },
      { id: 'playerTwo', name: 'Player Two', status: 'WAITING', chips: 40 },
    ]);

    expectGameErrorWithCode(() => gameState.startGame(), 'INSUFFICIENT_CHIPS');

    expect(gameState.pot).toBe(0);
    expect(gameState.activePlayers[0].chips).toBe(1000);
    expect(gameState.activePlayers[1].chips).toBe(40);
    expect(gameState.activePlayers[0].privateCards.length).toBe(0);
  });
  test('[GameState.startGame] 4.54.1 [Atomic Update] หากผู้เล่นคนหลังจ่าย Boot แล้วล้นขีดจำกัด (Overflow) ต้องคืนเงินคนก่อนหน้า', () => {
    // คนแรกปกติ คนหลังมี bet ใกล้ล้น เมื่อจ่ายเพิ่มจะเกิด Overflow
    const gameState = createGameStateFixture({ bootAmount: 50 }, [
      { id: 'player1', name: 'Player 1', status: 'WAITING', chips: 1000, bet: 0 },
      {
        id: 'player2',
        name: 'Player 2',
        status: 'WAITING',
        chips: 1000,
        bet: Number.MAX_SAFE_INTEGER,
      },
    ]);
    const [player1, player2] = gameState.activePlayers;

    // เก็บค่าก่อนทำงาน
    const originalPot = gameState.pot;
    const originalCurrentStake = gameState.currentStake;
    const originalPlayer1Chips = player1.chips;
    const originalPlayer1Bet = player1.bet;
    const originalPlayer2Chips = player2.chips;
    const originalPlayer2Bet = player2.bet;
    const originalPlayer1Status = player1.status;
    const originalPlayer2Status = player2.status;

    // ตรวจสอบว่ามีการโยนข้อผิดพลาดเรื่องจำนวนเงิน (INVALID_AMOUNT)
    expectGameErrorWithCode(() => gameState.startGame(), 'INVALID_AMOUNT');

    // ข้อมูลทุกอย่างต้องกลับไปเหมือนก่อนเริ่มเกม
    expect(player1.chips).toBe(originalPlayer1Chips);
    expect(player1.bet).toBe(originalPlayer1Bet);
    expect(player1.status).toBe(originalPlayer1Status);
    expect(player1.privateCards.length).toBe(0);

    expect(player2.chips).toBe(originalPlayer2Chips);
    expect(player2.bet).toBe(originalPlayer2Bet);
    expect(player2.status).toBe(originalPlayer2Status);
    expect(player2.privateCards.length).toBe(0);

    expect(gameState.pot).toBe(originalPot);
    expect(gameState.currentStake).toBe(originalCurrentStake);
    expect(gameState.currentPlayerIndex).toBe(0);
  });

  test('[GameState.handlePlayerDisconnect] 4.55 เรียกตัดการเชื่อมต่อด้วย ID ที่ไม่มีอยู่ -> โยน GameError PLAYER_NOT_FOUND', () => {
    const gameState = createGameStateFixture({}, [
      { id: 'playerOne', name: 'Player One', status: 'ACTIVE', chips: 1000 },
    ]);

    expectGameErrorWithCode(
      () => gameState.handlePlayerDisconnect('ghost'),
      'PLAYER_NOT_FOUND',
    );
  });

  test('[GameState.handlePlayerDisconnect] 4.56 หลุดนอกตาตัวเอง -> เปลี่ยนสถานะเป็น DISCONNECTED แต่ไม่ขยับตา', () => {
    const gameState = createGameStateFixture({ currentPlayerIndex: 0 }, [
      { id: 'playerOne', name: 'Player One', status: 'ACTIVE', chips: 1000 },
      { id: 'playerTwo', name: 'Player Two', status: 'ACTIVE', chips: 1000 },
      { id: 'playerThree', name: 'Player Three', status: 'ACTIVE', chips: 1000 },
    ]);

    gameState.handlePlayerDisconnect('playerTwo');
    expect(gameState.activePlayers[1].status).toBe('DISCONNECTED');
    expect(gameState.currentPlayerIndex).toBe(0);
  });

  test('[GameState.handlePlayerDisconnect] 4.57 ตัดการเชื่อมต่อซ้ำ (DISCONNECTED อยู่แล้ว) ต้องไม่ทำงานซ้ำหรือจ่ายเงินซ้ำ', () => {
    const gameState = createGameStateFixture({ currentPlayerIndex: 0, pot: 500 }, [
      { id: 'playerOne', name: 'Player One', status: 'DISCONNECTED', chips: 1000 },
      { id: 'playerTwo', name: 'Player Two', status: 'ACTIVE', chips: 1000 },
    ]);

    gameState.handlePlayerDisconnect('playerOne');
    expect(gameState.activePlayers[0].status).toBe('DISCONNECTED');
    expect(gameState.activePlayers[0].chips).toBe(1000);
    expect(gameState.pot).toBe(500);
    expect(gameState.currentPlayerIndex).toBe(0);
    expect(gameState.activePlayers[1].chips).toBe(1000);
  });

  test('[GameState.autoFoldTimeout] 4.58 มี ACTIVE 3 คน -> Timeout 1 คน -> เหลือ ACTIVE 2 คน (ไม่จ่าย Pot, ไม่เลื่อนตา)', () => {
    const gameState = createGameStateFixture({ currentPlayerIndex: 0, pot: 500 }, [
      { id: 'playerOne', name: 'Player One', status: 'ACTIVE', chips: 1000 },
      { id: 'playerTwo', name: 'Player Two', status: 'ACTIVE', chips: 1000 },
      { id: 'playerThree', name: 'Player Three', status: 'ACTIVE', chips: 1000 },
    ]);

    gameState.autoFoldTimeout();
    expect(gameState.activePlayers[0].status).toBe('FOLDED');
    expect(gameState.pot).toBe(500);
    expect(gameState.currentPlayerIndex).toBe(0);
    expect(gameState.activePlayers[1].chips).toBe(1000);
    expect(gameState.activePlayers[2].chips).toBe(1000);
  });

  test('[GameState.autoFoldTimeout] 4.58.1 มี ACTIVE 2 คน -> Timeout 1 คน -> เหลือ ACTIVE 1 คน (จ่าย Pot ผู้ชนะ)', () => {
    const gameState = createGameStateFixture({ currentPlayerIndex: 0, pot: 500 }, [
      { id: 'playerOne', name: 'Player One', status: 'ACTIVE', chips: 1000 },
      { id: 'playerTwo', name: 'Player Two', status: 'ACTIVE', chips: 1000 },
    ]);

    gameState.autoFoldTimeout();
    expect(gameState.activePlayers[0].status).toBe('FOLDED');
    expect(gameState.activePlayers[0].chips).toBe(1000);
    expect(gameState.activePlayers[1].chips).toBe(1500);
    expect(gameState.pot).toBe(0);
    expect(gameState.currentPlayerIndex).toBe(0);
  });
});
