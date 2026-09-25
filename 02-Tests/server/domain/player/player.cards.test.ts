import { expect, test, describe } from 'bun:test';
import { Player } from '../../../../src/server/domain/models/Player';
import { PlayerStateError } from '../../../../src/server/domain/errors/GameError';
import type { PlayerStatus, Card } from '../../../../src/shared/types';

describe('3. การรับไพ่ของผู้เล่น (Player.receiveCards)', () => {
  describe('กรณีการทำงานปกติ (Happy Paths)', () => {
    const validReceiveStates: PlayerStatus[] = ['WAITING', 'ACTIVE'];
    test.each(validReceiveStates)(
      '[Player.receiveCards] 3.9 รับไพ่ 3 ใบตอนสถานะ %s → อัปเดต privateCards โดยทับชุดเดิมและสถานะไม่เปลี่ยน',
      (state) => {
        const player = new Player('id1', 'Player 1');
        player.status = state;
        player.privateCards = [{ suit: 'HEARTS', rank: 2 }];

        const incomingCards: Card[] = [
          { suit: 'SPADES', rank: 14 },
          { suit: 'CLUBS', rank: 13 },
          { suit: 'DIAMONDS', rank: 12 },
        ];
        const expectedCards = structuredClone(incomingCards);

        player.receiveCards(incomingCards);

        expect(player.privateCards).toEqual(expectedCards);
        expect(incomingCards).toEqual(expectedCards);
        expect(player.status).toBe(state);
      },
    );

    test('[Player.receiveCards] 3.10 รับไพ่ 1 ใบ → เก็บไพ่ตามที่ส่งมาโดยทับชุดเดิม', () => {
      const player = new Player('id1', 'Player 1');
      player.status = 'ACTIVE';
      player.privateCards = [{ suit: 'HEARTS', rank: 2 }];

      const incomingCards: Card[] = [{ suit: 'SPADES', rank: 14 }];
      const expectedCards = structuredClone(incomingCards);

      player.receiveCards(incomingCards);

      expect(player.privateCards).toEqual(expectedCards);
      expect(incomingCards).toEqual(expectedCards);
      expect(player.status).toBe('ACTIVE');
    });
  });

  describe('กรณีข้อผิดพลาด (Unhappy Paths)', () => {
    const invalidReceiveStates: PlayerStatus[] = ['FOLDED', 'DISCONNECTED'];
    test.each(invalidReceiveStates)(
      '[Player.receiveCards] 3.27 รับไพ่ตอนสถานะไม่อนุญาต (%s) → โยน PlayerStateError',
      (state) => {
        const player = new Player('id1', 'Player 1');
        player.status = state;
        player.privateCards = [];

        expect(() => {
          player.receiveCards([{ suit: 'SPADES', rank: 14 }]);
        }).toThrow(PlayerStateError);

        expect(player.privateCards).toEqual([]);
        expect(player.status).toBe(state);
      },
    );
  });
});

describe('3. การเปิดดูไพ่ของผู้เล่น (Player.seeCards)', () => {
  describe('กรณีการทำงานปกติ (Happy Paths)', () => {
    test('[Player.seeCards] 3.11 ขอเปิดไพ่ครั้งแรกตอนเป็น Blind → เปลี่ยน isBlind เป็น false', () => {
      const player = new Player('id1', 'Player 1');
      player.status = 'ACTIVE';
      player.isBlind = true;

      player.seeCards();

      expect(player.isBlind).toBe(false);
    });

    test('[Player.seeCards] 3.12 ขอเปิดไพ่ซ้ำตอนที่เคย Seen ไปแล้ว → นิ่งเฉยและคงสถานะ isBlind=false', () => {
      const player = new Player('id1', 'Player 1');
      player.status = 'ACTIVE';
      player.isBlind = false;

      player.seeCards();

      expect(player.isBlind).toBe(false);
    });
  });

  describe('กรณีข้อผิดพลาด (Unhappy Paths)', () => {
    const invalidSeeStates: PlayerStatus[] = ['WAITING', 'FOLDED', 'DISCONNECTED'];
    test.each(invalidSeeStates)(
      '[Player.seeCards] 3.28 ขอดูไพ่ในสถานะไม่อนุญาต (%s) → โยน PlayerStateError',
      (state) => {
        const player = new Player('id1', 'Player 1');
        player.status = state;
        player.isBlind = true;

        expect(() => player.seeCards()).toThrow(PlayerStateError);
        expect(player.isBlind).toBe(true);
      },
    );
  });
});

describe('3. การเปิดเผยไพ่ของผู้เล่น (Player.showCards)', () => {
  describe('กรณีการทำงานปกติ (Happy Paths)', () => {
    const allStates: PlayerStatus[] = ['WAITING', 'ACTIVE', 'FOLDED', 'DISCONNECTED'];
    test.each(allStates)(
      '[Player.showCards] 3.13 ดึงข้อมูลไพ่ (Show) ในสถานะ %s → คืนค่าไพ่ทั้งหมดโดยไม่เปลี่ยนค่าอื่น',
      (state) => {
        const player = new Player('id1', 'Player 1');
        player.status = state;
        player.chips = 1000;
        player.bet = 50;
        player.isBlind = true;
        player.privateCards = [
          { suit: 'SPADES', rank: 14 },
          { suit: 'HEARTS', rank: 2 },
        ];

        const result = player.showCards();

        expect(result).toEqual([
          { suit: 'SPADES', rank: 14 },
          { suit: 'HEARTS', rank: 2 },
        ]);
        expect(player.privateCards).toEqual([
          { suit: 'SPADES', rank: 14 },
          { suit: 'HEARTS', rank: 2 },
        ]);
        expect(player.chips).toBe(1000);
        expect(player.bet).toBe(50);
        expect(player.status).toBe(state);
        expect(player.isBlind).toBe(true);
      },
    );
  });
});
