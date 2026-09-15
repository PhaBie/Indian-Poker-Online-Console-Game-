import { expect, test, describe } from 'bun:test';
import { expectGameErrorWithCode } from '../player/helpers/expectGameErrorWithCode';
import { createGameStateFixture } from './fixtures/gameState.fixture';

describe('gameState.settlement', () => {
  test('[GameState.evaluateWinner] 4.9 จบเกมและผู้เล่นคนแรกถือมือดีกว่า → โอนเงินใน Pot 500 ให้ผู้ชนะ', () => {
    const gameState = createGameStateFixture({ pot: 500 }, [
      {
        id: 'winner',
        name: 'Winner',
        status: 'ACTIVE',
        chips: 1000,
        cards: [
          { suit: 'SPADES', rank: 14 },
          { suit: 'HEARTS', rank: 14 },
          { suit: 'DIAMONDS', rank: 14 },
        ],
      },
      {
        id: 'loser',
        name: 'Loser',
        status: 'ACTIVE',
        chips: 1000,
        cards: [
          { suit: 'SPADES', rank: 2 },
          { suit: 'HEARTS', rank: 3 },
          { suit: 'DIAMONDS', rank: 4 },
        ],
      },
    ]);

    gameState.evaluateWinner();
    const [winner, loser] = gameState.activePlayers;

    expect(winner.chips).toBe(1500);
    expect(loser.chips).toBe(1000);
    expect(gameState.pot).toBe(0);
  });

  test('[GameState.handleTie] 4.72 ชิปผู้ชนะเกินขีดจำกัด (Tie แบ่งหลายคน) → โยน INVALID_AMOUNT ห้ามจ่ายบางส่วน', () => {
    const gameState = createGameStateFixture({ pot: 1000 }, [
      {
        id: 'playerOne',
        name: 'Player One',
        status: 'ACTIVE',
        chips: 1000,
        cards: [
          { rank: 14, suit: 'SPADES' },
          { rank: 14, suit: 'HEARTS' },
          { rank: 14, suit: 'DIAMONDS' },
        ],
      },
      {
        id: 'playerTwo',
        name: 'Player Two',
        status: 'ACTIVE',
        chips: Number.MAX_SAFE_INTEGER - 100,
        cards: [
          { rank: 14, suit: 'CLUBS' },
          { rank: 13, suit: 'SPADES' },
          { rank: 13, suit: 'HEARTS' },
        ],
      },
    ]);

    // ชิปของผู้เล่นรวมกับส่วนแบ่ง Pot จะเกินขีดจำกัด (MAX_SAFE_INTEGER) จึงต้องปฏิเสธและไม่มีการจ่ายชิปให้ใครเลย
    expectGameErrorWithCode(
      () => gameState.handleTie([gameState.activePlayers[0], gameState.activePlayers[1]]),
      'INVALID_AMOUNT',
    );

    expect(gameState.activePlayers[0].chips).toBe(1000);
    expect(gameState.activePlayers[1].chips).toBe(Number.MAX_SAFE_INTEGER - 100);
    expect(gameState.pot).toBe(1000);
  });

  test('[GameState.evaluateWinner] 4.73 ผู้ชนะคนเดียวรับรางวัลแล้ว Chips ล้น → ปฏิเสธโดยข้อมูลคงเดิม', () => {
    const gameState = createGameStateFixture({ pot: 500 }, [
      {
        id: 'winner',
        name: 'Winner',
        status: 'ACTIVE',
        chips: Number.MAX_SAFE_INTEGER - 100,
        cards: [
          { rank: 14, suit: 'SPADES' },
          { rank: 14, suit: 'HEARTS' },
          { rank: 14, suit: 'DIAMONDS' },
        ],
      },
      {
        id: 'loser',
        name: 'Loser',
        status: 'ACTIVE',
        chips: 1000,
        cards: [
          { rank: 2, suit: 'SPADES' },
          { rank: 3, suit: 'HEARTS' },
          { rank: 4, suit: 'DIAMONDS' },
        ],
      },
    ]);

    expectGameErrorWithCode(() => gameState.evaluateWinner(), 'INVALID_AMOUNT');
    expect(gameState.activePlayers[0].chips).toBe(Number.MAX_SAFE_INTEGER - 100);
    expect(gameState.activePlayers[1].chips).toBe(1000);
    expect(gameState.pot).toBe(500);
  });

  test('[GameState.handleTie] 4.74 เรียก handleTie ซ้ำหลัง Pot เป็นศูนย์แล้ว → ชิปทุกคนต้องไม่เพิ่ม', () => {
    const gameState = createGameStateFixture({ pot: 100 }, [
      { id: 'p1', name: 'P1', status: 'ACTIVE', chips: 1000 },
      { id: 'p2', name: 'P2', status: 'ACTIVE', chips: 1000 },
    ]);

    gameState.handleTie([gameState.activePlayers[0], gameState.activePlayers[1]]);
    expect(gameState.activePlayers[0].chips).toBe(1050);
    expect(gameState.activePlayers[1].chips).toBe(1050);
    expect(gameState.pot).toBe(0);

    gameState.handleTie([gameState.activePlayers[0], gameState.activePlayers[1]]);
    expect(gameState.activePlayers[0].chips).toBe(1050);
    expect(gameState.activePlayers[1].chips).toBe(1050);
    expect(gameState.pot).toBe(0);
  });

  test('[GameState.endGame] 4.11 คนอื่นหมอบหมดเหลือผู้เล่นคนเดียว → จบเกมและโอนเงิน Pot 1500 ให้ผู้เล่นที่เหลือรอด', () => {
    const gameState = createGameStateFixture({ pot: 1500 }, [
      { id: 'survivor', name: 'Survivor', status: 'ACTIVE', chips: 1000 },
      { id: 'foldedPlayer1', name: 'Folded Player 1', status: 'FOLDED', chips: 1000 },
      { id: 'foldedPlayer2', name: 'Folded Player 2', status: 'FOLDED', chips: 1000 },
    ]);
    const [survivor] = gameState.activePlayers;

    gameState.endGame();

    expect(survivor.chips).toBe(2500);
    expect(gameState.pot).toBe(0);
  });

  test('[GameState.checkLastManStanding] 4.26 ตรวจหาคนสุดท้ายรอดชีวิต', () => {
    const gameState = createGameStateFixture({}, [
      { id: 'foldedPlayer', name: 'Folded Player', status: 'FOLDED', chips: 1000 },
      { id: 'survivor', name: 'Survivor', status: 'ACTIVE', chips: 1000 },
      {
        id: 'disconnectedPlayer',
        name: 'Disconnected Player',
        status: 'DISCONNECTED',
        chips: 1000,
      },
    ]);
    const survivor = gameState.checkLastManStanding();
    expect(survivor).toBe(gameState.activePlayers[1]);
  });

  test('[GameState.handleTie] 4.27 เสมอ 3 คน → แบ่งกองกลางเท่าๆ กัน และรักษาสมดุลเงินในระบบสมบูรณ์', () => {
    const gameState = createGameStateFixture({ pot: 300 }, [
      { id: 'tiedPlayer1', name: 'Tied Player 1', status: 'ACTIVE', chips: 100 },
      { id: 'tiedPlayer2', name: 'Tied Player 2', status: 'ACTIVE', chips: 100 },
      { id: 'tiedPlayer3', name: 'Tied Player 3', status: 'ACTIVE', chips: 100 },
    ]);
    const initialSystemWealth = 100 + 100 + 100 + 300;
    const [tiedPlayer1, tiedPlayer2, tiedPlayer3] = gameState.activePlayers;

    gameState.handleTie([tiedPlayer1, tiedPlayer2, tiedPlayer3]);

    expect(tiedPlayer1.chips).toBe(200);
    expect(tiedPlayer2.chips).toBe(200);
    expect(tiedPlayer3.chips).toBe(200);

    const finalSystemWealth =
      tiedPlayer1.chips + tiedPlayer2.chips + tiedPlayer3.chips + gameState.pot;
    expect(finalSystemWealth).toBe(initialSystemWealth);
    expect(gameState.pot).toBe(0);
  });

  test('[GameState.checkPotLimitReached] 4.28 ตรวจ Pot Limit กรณีที่กำหนดขอบเขตมา', () => {
    const gameState = createGameStateFixture({ maxPotLimit: 10000 });

    gameState.pot = 9999;
    expect(gameState.checkPotLimitReached()).toBe(false);

    gameState.pot = 10000;
    expect(gameState.checkPotLimitReached()).toBe(true);

    gameState.pot = 10001;
    expect(gameState.checkPotLimitReached()).toBe(true);
  });

  test('[GameState.checkLastManStanding] 4.44 คืนค่า null เมื่อเหลือผู้เล่น ACTIVE มากกว่า 1 คน', () => {
    const gameState = createGameStateFixture({}, [
      { id: 'firstActivePlayer', name: 'First Active', status: 'ACTIVE', chips: 1000 },
      {
        id: 'secondActivePlayer',
        name: 'Second Active',
        status: 'ACTIVE',
        chips: 1000,
      },
    ]);
    expect(gameState.checkLastManStanding()).toBeNull();
  });

  test('[GameState.checkLastManStanding] 4.45 คืนค่า null เมื่อไม่เหลือผู้เล่น ACTIVE เลย', () => {
    const gameState = createGameStateFixture({}, [
      { id: 'foldedPlayer', name: 'Folded Player', status: 'FOLDED', chips: 1000 },
      {
        id: 'disconnectedPlayer',
        name: 'Disconnected Player',
        status: 'DISCONNECTED',
        chips: 1000,
      },
    ]);
    expect(gameState.checkLastManStanding()).toBeNull();
  });

  test('[GameState.evaluateWinner] 4.47 ไม่จ่ายให้คนที่หมอบแม้ไพ่จะดีที่สุดในโต๊ะ', () => {
    const gameState = createGameStateFixture({ pot: 500 }, [
      {
        id: 'foldedPlayer',
        name: 'Folded Player',
        status: 'FOLDED',
        chips: 1000,
        cards: [
          { suit: 'SPADES', rank: 14 },
          { suit: 'HEARTS', rank: 14 },
          { suit: 'DIAMONDS', rank: 14 },
        ],
      },
      {
        id: 'activePlayer',
        name: 'Active Player',
        status: 'ACTIVE',
        chips: 1000,
        cards: [
          { suit: 'SPADES', rank: 2 },
          { suit: 'HEARTS', rank: 3 },
          { suit: 'DIAMONDS', rank: 4 },
        ],
      },
    ]);

    const [foldedPlayer, activePlayer] = gameState.activePlayers;

    gameState.evaluateWinner();

    expect(foldedPlayer.chips).toBe(1000);
    expect(activePlayer.chips).toBe(1500);
    expect(gameState.pot).toBe(0);
  });

  test('[GameState.endGame] 4.33 จบรอบซ้ำสองครั้ง → ผู้ชนะรับเงินจาก Pot แค่รอบแรก และชิปไม่เพิ่มเบิ้ล', () => {
    const gameState = createGameStateFixture({ pot: 1000 }, [
      {
        id: 'winner',
        name: 'Winner',
        status: 'ACTIVE',
        chips: 1000,
        cards: [
          { suit: 'SPADES', rank: 14 },
          { suit: 'HEARTS', rank: 14 },
          { suit: 'DIAMONDS', rank: 14 },
        ],
      },
      { id: 'foldedPlayer', name: 'Folded Player', status: 'FOLDED', chips: 1000 },
    ]);
    const [winner] = gameState.activePlayers;

    gameState.endGame();
    expect(winner.chips).toBe(2000);
    expect(gameState.pot).toBe(0);

    gameState.endGame();
    expect(winner.chips).toBe(2000);
  });

  test('[GameState.evaluateWinner] 4.64 ผู้เล่น DISCONNECTED หรือ WAITING ไม่ได้รับรางวัล แม้ไพ่ดีที่สุด', () => {
    const gameState = createGameStateFixture({ pot: 1000 }, [
      {
        id: 'playerOne',
        name: 'Player One',
        status: 'DISCONNECTED',
        chips: 1000,
        cards: [
          { rank: 14, suit: 'SPADES' },
          { rank: 14, suit: 'HEARTS' },
          { rank: 14, suit: 'DIAMONDS' },
        ],
      },
      {
        id: 'playerTwo',
        name: 'Player Two',
        status: 'WAITING',
        chips: 1000,
        cards: [
          { rank: 14, suit: 'SPADES' },
          { rank: 14, suit: 'HEARTS' },
          { rank: 14, suit: 'DIAMONDS' },
        ],
      },
      {
        id: 'playerThree',
        name: 'Player Three',
        status: 'ACTIVE',
        chips: 1000,
        cards: [
          { rank: 2, suit: 'SPADES' },
          { rank: 3, suit: 'SPADES' },
          { rank: 5, suit: 'HEARTS' },
        ],
      },
    ]);
    gameState.evaluateWinner();
    expect(gameState.activePlayers[0].chips).toBe(1000);
    expect(gameState.activePlayers[1].chips).toBe(1000);
    expect(gameState.activePlayers[2].chips).toBe(2000);
  });

  test('[GameState.evaluateWinner] 4.65 ผู้ชนะอยู่ตำแหน่งอื่น และสลับลำดับแล้วยังจ่ายให้คนเดิม', () => {
    const game1 = createGameStateFixture({ pot: 1000 }, [
      {
        id: 'playerOne',
        name: 'Player One',
        status: 'ACTIVE',
        chips: 1000,
        cards: [
          { rank: 2, suit: 'SPADES' },
          { rank: 3, suit: 'SPADES' },
          { rank: 5, suit: 'HEARTS' },
        ],
      },
      {
        id: 'playerTwo',
        name: 'Player Two',
        status: 'ACTIVE',
        chips: 1000,
        cards: [
          { rank: 14, suit: 'SPADES' },
          { rank: 14, suit: 'HEARTS' },
          { rank: 14, suit: 'DIAMONDS' },
        ],
      },
    ]);
    game1.evaluateWinner();
    expect(game1.activePlayers.find((p) => p.id === 'playerOne')?.chips).toBe(1000);
    expect(game1.activePlayers.find((p) => p.id === 'playerTwo')?.chips).toBe(2000);
    const game2 = createGameStateFixture({ pot: 1000 }, [
      {
        id: 'playerTwo',
        name: 'Player Two',
        status: 'ACTIVE',
        chips: 1000,
        cards: [
          { rank: 14, suit: 'SPADES' },
          { rank: 14, suit: 'HEARTS' },
          { rank: 14, suit: 'DIAMONDS' },
        ],
      },
      {
        id: 'playerOne',
        name: 'Player One',
        status: 'ACTIVE',
        chips: 1000,
        cards: [
          { rank: 2, suit: 'SPADES' },
          { rank: 3, suit: 'SPADES' },
          { rank: 5, suit: 'HEARTS' },
        ],
      },
    ]);
    game2.evaluateWinner();
    expect(game2.activePlayers.find((p) => p.id === 'playerOne')?.chips).toBe(1000);
    expect(game2.activePlayers.find((p) => p.id === 'playerTwo')?.chips).toBe(2000);
  });

  test('[GameState.checkLastManStanding] 4.66 คืน Player ตัวจริง และไม่เปลี่ยน State รวมกรณี Array ว่าง', () => {
    const gameState = createGameStateFixture({ pot: 1000 }, [
      { id: 'playerOne', name: 'Player One', status: 'ACTIVE', chips: 1000 },
      { id: 'playerTwo', name: 'Player Two', status: 'FOLDED', chips: 1000 },
    ]);
    const winner = gameState.checkLastManStanding();
    expect(winner).toBe(gameState.activePlayers[0]);
    expect(gameState.pot).toBe(1000);

    const emptyGame = createGameStateFixture({}, []);
    expect(emptyGame.checkLastManStanding()).toBeNull();
  });

  test('[GameState.checkPotLimitReached] 4.67 Pot Limit ใช้ค่าอื่นที่ไม่ใช่ 10000 และเรียกตรวจแล้ว State ไม่เปลี่ยน', () => {
    const gameState = createGameStateFixture({ pot: 5000 });
    gameState.maxPotLimit = 5000;
    const isReached = gameState.checkPotLimitReached();
    expect(isReached).toBe(true);
    expect(gameState.pot).toBe(5000);
  });

  test('[GameState.evaluateWinner] 4.68 เรียก evaluateWinner() ซ้ำแล้วไม่จ่ายเงินซ้ำ', () => {
    const gameState = createGameStateFixture({ pot: 1000 }, [
      {
        id: 'playerOne',
        name: 'Player One',
        status: 'ACTIVE',
        chips: 1000,
        cards: [
          { rank: 14, suit: 'SPADES' },
          { rank: 14, suit: 'HEARTS' },
          { rank: 14, suit: 'DIAMONDS' },
        ],
      },
      {
        id: 'playerTwo',
        name: 'Player Two',
        status: 'ACTIVE',
        chips: 1000,
        cards: [
          { rank: 2, suit: 'SPADES' },
          { rank: 3, suit: 'SPADES' },
          { rank: 5, suit: 'HEARTS' },
        ],
      },
    ]);
    gameState.evaluateWinner();
    expect(gameState.activePlayers[0].chips).toBe(2000);
    expect(gameState.pot).toBe(0);

    gameState.evaluateWinner();
    expect(gameState.activePlayers[0].chips).toBe(2000);
  });

  test('[GameState.handleTie] 4.69 จัดการเศษชิปเมื่อแบ่งไม่ลงตัว (Pot 101 แบ่ง 2 คน)', () => {
    const gameState = createGameStateFixture({ pot: 101 }, [
      {
        id: 'playerOne',
        name: 'Player One',
        status: 'ACTIVE',
        chips: 1000,
        cards: [
          { rank: 14, suit: 'SPADES' },
          { rank: 14, suit: 'HEARTS' },
          { rank: 14, suit: 'DIAMONDS' },
        ],
      },
      {
        id: 'playerTwo',
        name: 'Player Two',
        status: 'ACTIVE',
        chips: 1000,
        cards: [
          { rank: 14, suit: 'CLUBS' },
          { rank: 14, suit: 'SPADES' },
          { rank: 14, suit: 'HEARTS' },
        ],
      },
    ]);

    gameState.handleTie([gameState.activePlayers[0], gameState.activePlayers[1]]);

    // 1. ตรวจสอบสมดุลชิป
    const expectedTotalChips = 2101;
    const actualTotalChips =
      gameState.activePlayers[0].chips + gameState.activePlayers[1].chips + gameState.pot;
    expect(actualTotalChips).toBe(expectedTotalChips);

    // 2. ตรวจสอบการจัดการเศษทศนิยม: คนแรกควรได้ 51 (1051) คนที่สองได้ 50 (1050)
    expect(gameState.activePlayers[0].chips).toBe(1051);
    expect(gameState.activePlayers[1].chips).toBe(1050);
    expect(gameState.pot).toBe(0);
  });
});
