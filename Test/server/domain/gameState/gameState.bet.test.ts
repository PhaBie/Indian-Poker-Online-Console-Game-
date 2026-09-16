import { expect, test, describe } from 'bun:test';
import { createGameStateFixture } from './fixtures/gameState.fixture';
import { expectGameErrorWithCode } from '../helpers/expectGameErrorWithCode';

describe('gameState.bet', () => {
  test('[GameState.processAction] 4.51 BET ด้วยยอดต่ำกว่า S (Blind) -> โยน INVALID_AMOUNT', () => {
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
      () => gameState.processAction('playerOne', 'BET', 49),
      'INVALID_AMOUNT',
    );
    expect(gameState.activePlayers[0].chips).toBe(1000);
    expect(gameState.pot).toBe(100);
    expect(gameState.currentStake).toBe(50);
  });

  test('[GameState.processAction] 4.51.1 BET ด้วยยอดสูงกว่า 2S (Blind) -> โยน INVALID_AMOUNT', () => {
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
      () => gameState.processAction('playerOne', 'BET', 101),
      'INVALID_AMOUNT',
    );
    expect(gameState.activePlayers[0].chips).toBe(1000);
    expect(gameState.pot).toBe(100);
    expect(gameState.currentStake).toBe(50);
  });

  test.each([
    { amount: 50, expectedChips: 950, expectedPot: 150, expectedStake: 50 },
    { amount: 100, expectedChips: 900, expectedPot: 200, expectedStake: 100 },
  ])(
    '[GameState.processAction] 4.51.2 BET Blind ยอด $amount → ผ่าน',
    ({ amount, expectedChips, expectedPot, expectedStake }) => {
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
      gameState.processAction('playerOne', 'BET', amount);
      expect(gameState.activePlayers[0].chips).toBe(expectedChips);
      expect(gameState.activePlayers[0].bet).toBe(amount);
      expect(gameState.pot).toBe(expectedPot);
      expect(gameState.currentStake).toBe(expectedStake);
      expect(gameState.currentPlayerIndex).toBe(0);
    },
  );

  test('[GameState.processAction] 4.52 BET ด้วยยอดต่ำกว่า 2S (Seen) -> โยน INVALID_AMOUNT', () => {
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
      () => gameState.processAction('playerOne', 'BET', 98),
      'INVALID_AMOUNT',
    );
    expect(gameState.activePlayers[0].chips).toBe(1000);
    expect(gameState.pot).toBe(100);
    expect(gameState.currentStake).toBe(50);
  });

  test('[GameState.processAction] 4.52.1 BET ด้วยยอดสูงกว่า 4S (Seen) -> โยน INVALID_AMOUNT', () => {
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
      () => gameState.processAction('playerOne', 'BET', 202),
      'INVALID_AMOUNT',
    );
    expect(gameState.activePlayers[0].chips).toBe(1000);
    expect(gameState.pot).toBe(100);
    expect(gameState.currentStake).toBe(50);
  });

  test('[GameState.processAction] 4.52.2 BET ด้วยยอดคี่ทศนิยม (Seen) -> โยน INVALID_AMOUNT', () => {
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
      () => gameState.processAction('playerOne', 'BET', 105),
      'INVALID_AMOUNT',
    );
    expect(gameState.activePlayers[0].chips).toBe(1000);
    expect(gameState.pot).toBe(100);
    expect(gameState.currentStake).toBe(50);
  });

  test.each([
    { amount: 100, expectedChips: 900, expectedPot: 200, expectedStake: 50 },
    { amount: 200, expectedChips: 800, expectedPot: 300, expectedStake: 100 },
  ])(
    '[GameState.processAction] 4.52.3 BET Seen ยอด $amount → ผ่าน',
    ({ amount, expectedChips, expectedPot, expectedStake }) => {
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
      gameState.processAction('playerOne', 'BET', amount);
      expect(gameState.activePlayers[0].chips).toBe(expectedChips);
      expect(gameState.activePlayers[0].bet).toBe(amount);
      expect(gameState.pot).toBe(expectedPot);
      expect(gameState.currentStake).toBe(expectedStake);
      expect(gameState.currentPlayerIndex).toBe(0);
    },
  );
});
