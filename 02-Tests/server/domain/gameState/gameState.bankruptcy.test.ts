import { describe, expect, test } from 'bun:test';
import { GameState } from '../../../../01-Source-code/server/domain/models/GameState';
import { Player } from '../../../../01-Source-code/server/domain/models/Player';

describe('4. การจัดการสถานะและการเล่น (GameState)', () => {
  test('[GameState.processAction] 4.70 ผู้เล่นที่ชิปหมดเหลือ 0 หลังลงเดิมพันจะถูกปรับเป็น FOLDED และข้ามเทิร์นโดยไม่หยุดเกม', () => {
    const bankruptPlayer = new Player('player_bankrupt', 'Bankrupt Player');
    const secondPlayer = new Player('player_second', 'Second Player');
    const thirdPlayer = new Player('player_third', 'Third Player');
    bankruptPlayer.chips = 100;
    secondPlayer.chips = 150;
    thirdPlayer.chips = 150;
    const gameState = new GameState([bankruptPlayer, secondPlayer, thirdPlayer], 50);
    gameState.startGame();

    const isHandTerminated = gameState.processAction(bankruptPlayer.id, 'CALL');

    expect(bankruptPlayer.chips).toBe(0);
    expect(bankruptPlayer.status).toBe('FOLDED');
    expect(isHandTerminated).toBe(false);
    gameState.nextTurn();
    expect(gameState.activePlayers[gameState.currentPlayerIndex].id).toBe(
      secondPlayer.id,
    );
    expect(gameState.checkLastManStanding()).toBeNull();
  });
});
