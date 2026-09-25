import { describe, expect, test } from 'bun:test';
import { GAME_CONSTANTS } from '../../../../src/shared/constants';
import { Player } from '../../../../src/server/domain/models/Player';

describe('3. ระบบผู้เล่น (Player)', () => {
  describe('กรณีทำงานสำเร็จ (Happy Paths)', () => {
    test('[Player.constructor] 3.33 ผู้เล่นที่ถูกสร้างใหม่ได้รับชิปเริ่มต้นตามค่ามาตรฐานที่กำหนด (1,000 ชิป)', () => {
      const createdPlayer = new Player('player_test_id', 'Test Player');
      expect(createdPlayer.chips).toBe(GAME_CONSTANTS.DEFAULT_STARTING_CHIPS);
      expect(GAME_CONSTANTS.DEFAULT_STARTING_CHIPS).toBe(1000);
    });
  });
});
