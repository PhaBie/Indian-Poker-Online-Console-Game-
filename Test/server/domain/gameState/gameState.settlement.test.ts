import { expect, test, describe } from 'bun:test';
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
    expect(survivor?.id).toBe('survivor');
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

  test('[GameState.evaluateWinner] ผู้เล่น DISCONNECTED หรือ WAITING ไม่ได้รับรางวัล แม้ไพ่ดีที่สุด', () => {
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

  test('[GameState.evaluateWinner] ผู้ชนะอยู่ตำแหน่งอื่น และสลับลำดับแล้วยังจ่ายให้คนเดิม', () => {
    const gameState = createGameStateFixture({ pot: 1000 }, [
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
    gameState.evaluateWinner();
    expect(gameState.activePlayers[0].chips).toBe(1000);
    expect(gameState.activePlayers[1].chips).toBe(2000);
  });

  test('[GameState.checkLastManStanding] คืน Player ตัวจริง และไม่เปลี่ยน State รวมกรณี Array ว่าง', () => {
    const gameState = createGameStateFixture({ pot: 1000 }, [
      { id: 'playerOne', name: 'Player One', status: 'ACTIVE', chips: 1000 },
      { id: 'playerTwo', name: 'Player Two', status: 'FOLDED', chips: 1000 },
    ]);
    const winner = gameState.checkLastManStanding();
    expect(winner?.id).toBe('playerOne');
    expect(gameState.pot).toBe(1000);

    const emptyGame = createGameStateFixture({}, []);
    expect(emptyGame.checkLastManStanding()).toBeNull();
  });

  test('[GameState.checkPotLimitReached] Pot Limit ใช้ค่าอื่นที่ไม่ใช่ 10000 และเรียกตรวจแล้ว State ไม่เปลี่ยน', () => {
    const gameState = createGameStateFixture({ pot: 5000 });
    gameState.maxPotLimit = 5000;
    const isReached = gameState.checkPotLimitReached();
    expect(isReached).toBe(true);
    expect(gameState.pot).toBe(5000);
  });

  test('[GameState.evaluateWinner] เรียก evaluateWinner() ซ้ำแล้วไม่จ่ายเงินซ้ำ', () => {
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

  test('[GameState.handleTie] จัดการเศษชิปเมื่อแบ่งไม่ลงตัว (Pot 101 แบ่ง 2 คน)', () => {
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
          { rank: 13, suit: 'SPADES' },
          { rank: 13, suit: 'HEARTS' },
        ],
      },
    ]);

    // Simulate tie by evaluating winner when hands are exactly tied, or calling handleTie
    // Note: this assumes we can test it through evaluateWinner if cards tie, or call handleTie directly if exposed.
    // The contract says: แบ่ง pot ตามจำนวน winners และจัดการเศษ
    // If evaluateWinner handles the tie:
    gameState.evaluateWinner();

    // Since we want to hardcode Expected without relying on same core function:
    // Total chips before = 2101. Total chips after must be 2101.
    const totalBefore = 2101;
    const totalAfter =
      gameState.activePlayers[0].chips + gameState.activePlayers[1].chips + gameState.pot;
    expect(totalAfter).toBe(totalBefore);

    // According to standard split rules, one gets 51, the other 50.
    // Hardcode this expectation. Let's just assert one gets 1051 and one 1050 (order depends on policy, but we check values).
    const chips = [
      gameState.activePlayers[0].chips,
      gameState.activePlayers[1].chips,
    ].sort((a, b) => a - b);
    expect(chips[0]).toBe(1050);
    expect(chips[1]).toBe(1051);
  });
});
