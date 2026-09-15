import { expect, test, describe } from 'bun:test';
import {
  WrongTurnError,
  PlayerStateError,
  InvalidActionError,
} from '../../../../src/server/domain/errors/GameError';
import type { GameActionType } from '../../../../src/shared/types';
import { createGameStateFixture } from './fixtures/gameState.fixture';
import { expectGameErrorWithCode } from '../helpers/expectGameErrorWithCode';

describe('gameState.actions', () => {
  test('[GameState.processAction] 4.23 การทำ FOLD → เปลี่ยนสถานะเป็น FOLDED ไม่คืนชิป', () => {
    const gameState = createGameStateFixture({ currentPlayerIndex: 0, pot: 200 }, [
      { id: 'foldingPlayer', name: 'Folding Player', status: 'ACTIVE', chips: 900 },
      { id: 'otherPlayer', name: 'Other Player', status: 'ACTIVE', chips: 900 },
    ]);
    const [foldingPlayer] = gameState.activePlayers;
    foldingPlayer.bet = 100;

    gameState.processAction(foldingPlayer.id, 'FOLD');

    expect(foldingPlayer.status).toBe('FOLDED');
    expect(foldingPlayer.chips).toBe(900);
    expect(gameState.pot).toBe(200);
    expect(gameState.currentPlayerIndex).toBe(0);
  });

  test('[GameState.processAction] 4.24 การทำ SEEN → เปลี่ยนเป็น isBlind=false ไม่เสียเงินเพิ่ม', () => {
    const gameState = createGameStateFixture({ currentPlayerIndex: 0, pot: 200 }, [
      { id: 'seeingPlayer', name: 'Seeing Player', status: 'ACTIVE', chips: 900 },
      { id: 'otherPlayer', name: 'Other Player', status: 'ACTIVE', chips: 900 },
    ]);
    const [seeingPlayer] = gameState.activePlayers;
    seeingPlayer.isBlind = true;

    gameState.processAction(seeingPlayer.id, 'SEEN');

    expect(seeingPlayer.isBlind).toBe(false);
    expect(seeingPlayer.chips).toBe(900);
    expect(gameState.currentPlayerIndex).toBe(0);
  });

  test('[GameState.processAction] 4.31 สั่งเล่น CALL นอกเทิร์นตนเอง → โยน WrongTurnError และ pot, currentPlayerIndex และ bet ของผู้ขอไม่เปลี่ยน', () => {
    const gameState = createGameStateFixture(
      {
        currentPlayerIndex: 1,
        pot: 500,
        currentStake: 50,
      },
      [
        {
          id: 'wrongTurnPlayer',
          name: 'Wrong Turn Player',
          status: 'ACTIVE',
          chips: 1000,
        },
        { id: 'currentPlayer', name: 'Current Player', status: 'ACTIVE', chips: 1000 },
      ],
    );
    const [wrongTurnPlayer] = gameState.activePlayers;

    expect(() => {
      gameState.processAction(wrongTurnPlayer.id, 'CALL');
    }).toThrow(WrongTurnError);

    expect(gameState.pot).toBe(500);
    expect(gameState.currentPlayerIndex).toBe(1);
    expect(wrongTurnPlayer.bet).toBe(0);
  });

  test('[GameState.processAction] 4.32 ผู้เล่นที่มีสถานะ FOLDED ขอ CALL → โยน PlayerStateError', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, pot: 500, currentStake: 50 },
      [
        { id: 'foldedPlayer', name: 'Folded Player', status: 'FOLDED', chips: 1000 },
        { id: 'activePlayer', name: 'Active Player', status: 'ACTIVE', chips: 1000 },
      ],
    );
    const [foldedPlayer] = gameState.activePlayers;

    expect(() => {
      gameState.processAction(foldedPlayer.id, 'CALL');
    }).toThrow(PlayerStateError);

    expect(gameState.pot).toBe(500);
  });

  test('[GameState.processAction] 4.34 แอคชันไม่รู้จัก → โยน Error และเงินไม่เปลี่ยน', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, pot: 500, currentStake: 50 },
      [
        { id: 'activePlayer1', name: 'Player 1', status: 'ACTIVE', chips: 1000 },
        { id: 'activePlayer2', name: 'Player 2', status: 'ACTIVE', chips: 1000 },
      ],
    );
    const [activePlayers] = gameState.activePlayers;

    expect(() => {
      gameState.processAction(
        activePlayers.id,
        'JUMP_AROUND' as unknown as GameActionType,
      );
    }).toThrow(InvalidActionError);

    expect(gameState.pot).toBe(500);
    expect(gameState.currentStake).toBe(50);
    expect(gameState.currentPlayerIndex).toBe(0);
    expect(activePlayers.chips).toBe(1000);
    expect(activePlayers.bet).toBe(0);
    expect(activePlayers.status).toBe('ACTIVE');
  });

  test('[GameState.processAction] 4.35 ผู้เล่นที่ไม่อยู่ในห้องขอทำรายการ → โยน GameError(PLAYER_NOT_FOUND) และเงินไม่เปลี่ยน', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, pot: 500, currentStake: 50 },
      [
        { id: 'activePlayer1', name: 'Active Player 1', status: 'ACTIVE', chips: 1000 },
        { id: 'activePlayer2', name: 'Active Player 2', status: 'ACTIVE', chips: 1000 },
      ],
    );
    const [activePlayer1, activePlayer2] = gameState.activePlayers;

    expectGameErrorWithCode(
      () => gameState.processAction('unknownPlayerId', 'FOLD'),
      'PLAYER_NOT_FOUND',
    );

    expect(gameState.pot).toBe(500);
    expect(gameState.currentStake).toBe(50);
    expect(gameState.currentPlayerIndex).toBe(0);
    expect(activePlayer1.chips).toBe(1000);
    expect(activePlayer1.bet).toBe(0);
    expect(activePlayer1.status).toBe('ACTIVE');
    expect(activePlayer2.chips).toBe(1000);
    expect(activePlayer2.bet).toBe(0);
    expect(activePlayer2.status).toBe('ACTIVE');
  });

  test('[GameState.processAction] 4.48 ผู้เล่นสถานะ WAITING ขอทำ Action ไม่ได้', () => {
    const gameState = createGameStateFixture({ currentPlayerIndex: 0 }, [
      { id: 'playerOne', name: 'Player One', status: 'WAITING', chips: 1000 },
      { id: 'playerTwo', name: 'Player Two', status: 'ACTIVE', chips: 1000 },
    ]);
    expectGameErrorWithCode(
      () => gameState.processAction('playerOne', 'BET', 100),
      'INVALID_ACTION',
    );
    expect(gameState.activePlayers[0].chips).toBe(1000);
    expect(gameState.pot).toBe(0);
  });

  test('[GameState.processAction] 4.48.1 ผู้เล่นสถานะ DISCONNECTED ขอทำ Action ไม่ได้', () => {
    const gameState = createGameStateFixture({ currentPlayerIndex: 0 }, [
      { id: 'playerOne', name: 'Player One', status: 'DISCONNECTED', chips: 1000 },
      { id: 'playerTwo', name: 'Player Two', status: 'ACTIVE', chips: 1000 },
    ]);
    expectGameErrorWithCode(
      () => gameState.processAction('playerOne', 'BET', 100),
      'INVALID_ACTION',
    );
    expect(gameState.activePlayers[0].chips).toBe(1000);
    expect(gameState.pot).toBe(0);
  });

  test('[GameState.processAction] 4.49 SEEN ซ้ำไม่เสียเงิน และแทงรอบถัดไปคิดแบบ Seen', () => {
    const gameState = createGameStateFixture(
      { currentPlayerIndex: 0, currentStake: 50 },
      [
        {
          id: 'playerOne',
          name: 'Player One',
          status: 'ACTIVE',
          chips: 1000,
          isBlind: true,
        },
        { id: 'playerTwo', name: 'Player Two', status: 'ACTIVE', chips: 1000 },
      ],
    );
    const playerOne = gameState.activePlayers[0];

    gameState.processAction(playerOne.id, 'SEEN');
    expect(playerOne.isBlind).toBe(false);
    expect(playerOne.chips).toBe(1000);

    gameState.processAction(playerOne.id, 'SEEN');
    expect(playerOne.chips).toBe(1000);

    gameState.processAction(playerOne.id, 'CALL');
    expect(playerOne.chips).toBe(900);
    expect(gameState.currentPlayerIndex).toBe(0);
  });
});
