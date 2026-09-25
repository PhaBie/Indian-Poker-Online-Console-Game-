import { expect, test, describe } from 'bun:test';
import { createGameStateFixture } from './fixtures/gameState.fixture';
import { expectGameErrorWithCode } from '../helpers/expectGameErrorWithCode';

describe('gameState.raise', () => {
  test('[GameState.processAction] 4.5 ผู้เล่น Blind ขอ RAISE ด้วย 100 → หักชิป 100 เข้า Pot 200 และ currentStake เปลี่ยนเป็น 100', () => {
    const gameState = createGameStateFixture({
      currentPlayerIndex: 0,
      currentStake: 50,
      pot: 100,
    });
    const [blindPlayer] = gameState.activePlayers;

    gameState.processAction(blindPlayer.id, 'RAISE', 100);

    expect(gameState.pot).toBe(200);
    expect(gameState.currentStake).toBe(100);
    expect(blindPlayer.chips).toBe(900);
    expect(blindPlayer.bet).toBe(100);
    expect(gameState.currentPlayerIndex).toBe(0);
  });

  test('[GameState.processAction] 4.7 ผู้เล่น Seen ขอ RAISE ด้วย 200 → หักชิป 200 เข้า Pot 300 และ currentStake เปลี่ยนเป็น 100', () => {
    const gameState = createGameStateFixture({
      currentPlayerIndex: 0,
      currentStake: 50,
      pot: 100,
    });
    const [seenPlayer] = gameState.activePlayers;
    seenPlayer.isBlind = false;

    gameState.processAction(seenPlayer.id, 'RAISE', 200);

    expect(gameState.pot).toBe(300);
    expect(gameState.currentStake).toBe(100);
    expect(seenPlayer.chips).toBe(800);
    expect(seenPlayer.bet).toBe(200);
    expect(gameState.currentPlayerIndex).toBe(0);
  });

  const invalidActionAmounts = [
    { desc: 'ค่าติดลบ', amount: -50 },
    { desc: 'ศูนย์', amount: 0 },
    { desc: 'ทศนิยม', amount: 10.5 },
    { desc: 'NaN', amount: NaN },
    { desc: 'Infinity', amount: Infinity },
    { desc: '-Infinity', amount: -Infinity },
    { desc: 'ไม่มีการส่งค่า Amount ให้ RAISE', amount: undefined },
    { desc: 'สตริง', amount: '100' as unknown as number },
    { desc: 'เกิน Safe Integer', amount: Number.MAX_SAFE_INTEGER + 1 },
  ];
  invalidActionAmounts.forEach(({ desc, amount }, idx) => {
    test(`[GameState.processAction] 4.${36 + idx} การเดิมพันยอดเงินผิดรูปแบบ (${desc}) → โยน GameError(INVALID_AMOUNT) และข้อมูลคงเดิม`, () => {
      const gameState = createGameStateFixture(
        { currentPlayerIndex: 0, pot: 500, currentStake: 50 },
        [
          { id: 'activePlayer1', name: 'Active Player 1', status: 'ACTIVE', chips: 1000 },
          { id: 'activePlayer2', name: 'Active Player 2', status: 'ACTIVE', chips: 1000 },
        ],
      );
      const [activePlayer1] = gameState.activePlayers;

      expectGameErrorWithCode(
        () => gameState.processAction(activePlayer1.id, 'RAISE', amount),
        'INVALID_AMOUNT',
      );
      expect(gameState.pot).toBe(500);
      expect(activePlayer1.chips).toBe(1000);
    });
  });

  test('[GameState.processAction] 4.53 Overflow ตรวจสอบว่ารวม Pot แล้วต้องไม่เกิน MAX_SAFE_INTEGER', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50, pot: Number.MAX_SAFE_INTEGER - 50 },
      [
        {
          id: 'playerOne',
          name: 'Player One',
          status: 'ACTIVE',
          chips: 100,
          isBlind: true,
        },
        {
          id: 'playerTwo',
          name: 'Player Two',
          status: 'ACTIVE',
          chips: 100,
          isBlind: true,
        },
      ],
    );
    const playerOne = gameState.activePlayers[0];

    expectGameErrorWithCode(
      () => gameState.processAction(playerOne.id, 'RAISE', 100),
      'INVALID_AMOUNT',
    );
    expect(playerOne.chips).toBe(100);
    expect(gameState.pot).toBe(Number.MAX_SAFE_INTEGER - 50);
    expect(gameState.currentStake).toBe(50);
    expect(gameState.activePlayers[1].status).toBe('ACTIVE');
  });

  test.each([
    { amount: 50, desc: 'เท่ากับ S (ขั้นต่ำของ CALL ไม่ใช่ RAISE)' },
    { amount: 101, desc: 'เกิน 2S' },
  ])(
    '[GameState.processAction] 4.75 RAISE Blind ปฏิเสธยอด $amount ($desc)',
    ({ amount }) => {
      const gameState = createGameStateFixture(
        { currentPlayerIndex: 0, currentStake: 50, pot: 100 },
        [
          {
            id: 'playerOne',
            name: 'Player One',
            status: 'ACTIVE',
            chips: 1000,
            isBlind: true,
          },
          {
            id: 'playerTwo',
            name: 'Player Two',
            status: 'ACTIVE',
            chips: 1000,
            isBlind: true,
          },
        ],
      );
      expectGameErrorWithCode(
        () => gameState.processAction('playerOne', 'RAISE', amount),
        'INVALID_AMOUNT',
      );
      expect(gameState.activePlayers[0].chips).toBe(1000);
      expect(gameState.activePlayers[0].bet).toBe(0);
      expect(gameState.pot).toBe(100);
      expect(gameState.currentStake).toBe(50);
      expect(gameState.currentPlayerIndex).toBe(0);
    },
  );

  test.each([
    { amount: 51, expectedStake: 51, expectedChips: 949, expectedPot: 151 },
    { amount: 100, expectedStake: 100, expectedChips: 900, expectedPot: 200 },
  ])(
    '[GameState.processAction] 4.75.1 RAISE Blind ยอด $amount → Stake เป็น $expectedStake',
    ({ amount, expectedStake, expectedChips, expectedPot }) => {
      const gameState = createGameStateFixture(
        { currentPlayerIndex: 0, currentStake: 50, pot: 100 },
        [
          {
            id: 'playerOne',
            name: 'Player One',
            status: 'ACTIVE',
            chips: 1000,
            isBlind: true,
          },
          {
            id: 'playerTwo',
            name: 'Player Two',
            status: 'ACTIVE',
            chips: 1000,
            isBlind: true,
          },
        ],
      );
      gameState.processAction('playerOne', 'RAISE', amount);
      expect(gameState.activePlayers[0].chips).toBe(expectedChips);
      expect(gameState.activePlayers[0].bet).toBe(amount);
      expect(gameState.pot).toBe(expectedPot);
      expect(gameState.currentStake).toBe(expectedStake);
      expect(gameState.currentPlayerIndex).toBe(0);
    },
  );

  test.each([
    { amount: 100, desc: 'เท่ากับ 2S (ขั้นต่ำของ CALL ไม่ใช่ RAISE)' },
    { amount: 202, desc: 'เกิน 4S' },
  ])(
    '[GameState.processAction] 4.76 RAISE Seen ปฏิเสธยอด $amount ($desc)',
    ({ amount }) => {
      const gameState = createGameStateFixture(
        { currentPlayerIndex: 0, currentStake: 50, pot: 100 },
        [
          {
            id: 'playerOne',
            name: 'Player One',
            status: 'ACTIVE',
            chips: 1000,
            isBlind: false,
          },
          {
            id: 'playerTwo',
            name: 'Player Two',
            status: 'ACTIVE',
            chips: 1000,
            isBlind: true,
          },
        ],
      );
      expectGameErrorWithCode(
        () => gameState.processAction('playerOne', 'RAISE', amount),
        'INVALID_AMOUNT',
      );
      expect(gameState.activePlayers[0].chips).toBe(1000);
      expect(gameState.activePlayers[0].bet).toBe(0);
      expect(gameState.pot).toBe(100);
      expect(gameState.currentStake).toBe(50);
      expect(gameState.currentPlayerIndex).toBe(0);
    },
  );

  test.each([
    { amount: 102, expectedStake: 51, expectedChips: 898, expectedPot: 202 },
    { amount: 200, expectedStake: 100, expectedChips: 800, expectedPot: 300 },
  ])(
    '[GameState.processAction] 4.76.1 RAISE Seen ยอด $amount → Stake เป็น $expectedStake',
    ({ amount, expectedStake, expectedChips, expectedPot }) => {
      const gameState = createGameStateFixture(
        { currentPlayerIndex: 0, currentStake: 50, pot: 100 },
        [
          {
            id: 'playerOne',
            name: 'Player One',
            status: 'ACTIVE',
            chips: 1000,
            isBlind: false,
          },
          {
            id: 'playerTwo',
            name: 'Player Two',
            status: 'ACTIVE',
            chips: 1000,
            isBlind: true,
          },
        ],
      );
      gameState.processAction('playerOne', 'RAISE', amount);
      expect(gameState.activePlayers[0].chips).toBe(expectedChips);
      expect(gameState.activePlayers[0].bet).toBe(amount);
      expect(gameState.pot).toBe(expectedPot);
      expect(gameState.currentStake).toBe(expectedStake);
      expect(gameState.currentPlayerIndex).toBe(0);
    },
  );

  test('[GameState.processAction] 4.50 Seen จ่ายเดิมพันแล้วหารสองเป็นทศนิยม -> โยน INVALID_AMOUNT', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50 },
      [
        {
          id: 'playerOne',
          name: 'Player One',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: false,
        },
        {
          id: 'playerTwo',
          name: 'Player Two',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: true,
        },
      ],
    );
    const playerOne = gameState.activePlayers[0];

    expectGameErrorWithCode(
      () => gameState.processAction(playerOne.id, 'RAISE', 105),
      'INVALID_AMOUNT',
    );
    expect(playerOne.chips).toBe(1000);
  });
});
