import { expect, test, describe } from 'bun:test';
import { Player } from '../../src/server/domain/models/Player';
import {
  GameError,
  InsufficientChipsError,
  PlayerStateError,
} from '../../src/server/domain/errors/GameError';
import type { PlayerStatus, Card } from '../../src/shared/types';

const expectGameErrorWithCode = (fn: () => void, expectedCode: string) => {
  let thrownError: unknown;
  try {
    fn();
  } catch (error) {
    thrownError = error;
  }
  expect(thrownError).toBeInstanceOf(GameError);
  expect((thrownError as GameError).code).toBe(expectedCode);
};

describe('3. ระบบการกระทำของผู้เล่น (Player Actions)', () => {
  describe('ชุด A: เงินและการเดิมพัน (payBet & addChips)', () => {
    describe('A.1: การจ่ายเงินเดิมพัน (payBet)', () => {
      test('[Player.payBet] จ่ายเงินปกติในสถานะ ACTIVE → ชิปลดลงและยอดเดิมพันสะสมเพิ่มขึ้น', () => {
        const player = new Player('id1', 'Player 1');
        player.chips = 1000;
        player.bet = 0;
        player.status = 'ACTIVE';

        player.payBet(100);

        expect(player.chips).toBe(900);
        expect(player.bet).toBe(100);
      });

      test('[Player.payBet] จ่ายเงินขณะสถานะ WAITING (สำหรับจ่าย Boot) → ทำได้ตามปกติ', () => {
        const player = new Player('id1', 'Player 1');
        player.chips = 1000;
        player.bet = 0;
        player.status = 'WAITING';

        player.payBet(50);

        expect(player.chips).toBe(950);
        expect(player.bet).toBe(50);
      });

      test('[Player.payBet] จ่ายเดิมพัน 2 ครั้งด้วยยอดเท่าเดิม → ยอดเงินหักสะสมถูกต้อง', () => {
        const player = new Player('id1', 'Player 1');
        player.chips = 1000;
        player.status = 'ACTIVE';

        player.payBet(50);
        player.payBet(50);

        expect(player.chips).toBe(900);
        expect(player.bet).toBe(100);
      });

      test('[Player.payBet] จ่ายเท่าชิปที่เหลือพอดี → ชิปเป็น 0 และเดิมพันสะสมถูกต้อง', () => {
        const player = new Player('id1', 'Player 1');
        player.chips = 200;
        player.status = 'ACTIVE';

        player.payBet(200);

        expect(player.chips).toBe(0);
        expect(player.bet).toBe(200);
      });

      test('[Player.payBet] ชิปไม่พอจ่าย → โยน InsufficientChipsError และเงินต้องไม่เปลี่ยน', () => {
        const player = new Player('id1', 'Player 1');
        player.chips = 100;
        player.bet = 50;
        player.status = 'ACTIVE';

        expect(() => {
          player.payBet(150);
        }).toThrow(InsufficientChipsError);

        expect(player.chips).toBe(100);
        expect(player.bet).toBe(50);
        expect(player.status).toBe('ACTIVE');
      });

      test('[Player.payBet] จ่ายเงินสำเร็จครั้งแรก แต่ครั้งที่สองชิปไม่พอ → โยน InsufficientChipsError และรักษายอดหลังจ่ายครั้งแรก', () => {
        const player = new Player('id1', 'Player 1');
        player.chips = 200;
        player.bet = 0;
        player.status = 'ACTIVE';

        player.payBet(100);

        expect(() => {
          player.payBet(200);
        }).toThrow(InsufficientChipsError);

        expect(player.chips).toBe(100);
        expect(player.bet).toBe(100);
      });

      const invalidPayBetStates: PlayerStatus[] = ['FOLDED', 'DISCONNECTED'];
      test.each(invalidPayBetStates)(
        '[Player.payBet] จ่ายเงินในสถานะที่ไม่อนุญาต (%s) → โยน PlayerStateError',
        (state) => {
          const player = new Player('id1', 'Player 1');
          player.chips = 1000;
          player.bet = 0;
          player.status = state;

          expect(() => {
            player.payBet(100);
          }).toThrow(PlayerStateError);

          expect(player.chips).toBe(1000);
          expect(player.bet).toBe(0);
          expect(player.status).toBe(state);
        },
      );

      const invalidAmounts = [
        { desc: 'ค่าเป็นศูนย์', amount: 0 },
        { desc: 'ค่าติดลบ', amount: -50 },
        { desc: 'ค่าทศนิยม', amount: 10.5 },
        { desc: 'ค่า NaN', amount: NaN },
        { desc: 'ค่า Infinity', amount: Infinity },
        { desc: 'ชนิดเป็นสตริง', amount: '100' as unknown as number },
        { desc: 'ค่าเกิน MAX_SAFE_INTEGER', amount: Number.MAX_SAFE_INTEGER + 1 },
      ];
      test.each(invalidAmounts)(
        '[Player.payBet] จ่ายเงินด้วยข้อมูลผิดรูปแบบ ($desc) → โยน GameError(INVALID_AMOUNT)',
        ({ amount }) => {
          const player = new Player('id1', 'Player 1');
          player.chips = 1000;
          player.bet = 0;
          player.status = 'ACTIVE';

          expectGameErrorWithCode(() => player.payBet(amount), 'INVALID_AMOUNT');
          expect(player.chips).toBe(1000);
          expect(player.bet).toBe(0);
          expect(player.status).toBe('ACTIVE');
        },
      );

      test('[Player.payBet] จ่ายเงินด้วยยอด MAX_SAFE_INTEGER พอดี → รับได้', () => {
        const player = new Player('id1', 'Player 1');
        player.chips = Number.MAX_SAFE_INTEGER;
        player.bet = 0;
        player.status = 'ACTIVE';

        player.payBet(Number.MAX_SAFE_INTEGER);

        expect(player.chips).toBe(0);
        expect(player.bet).toBe(Number.MAX_SAFE_INTEGER);
      });

      test('[Player.payBet] ยอดสะสมเดิมพันเกิน MAX_SAFE_INTEGER → โยน GameError(INVALID_AMOUNT)', () => {
        const player = new Player('id1', 'Player 1');
        player.chips = Number.MAX_SAFE_INTEGER;
        player.bet = Number.MAX_SAFE_INTEGER - 50;
        player.status = 'ACTIVE';

        expectGameErrorWithCode(() => player.payBet(100), 'INVALID_AMOUNT');
        expect(player.chips).toBe(Number.MAX_SAFE_INTEGER);
        expect(player.bet).toBe(Number.MAX_SAFE_INTEGER - 50);
        expect(player.status).toBe('ACTIVE');
      });
    });

    describe('A.2: การเพิ่มชิปโดยระบบ (addChips)', () => {
      const validAddChipsStates: PlayerStatus[] = [
        'WAITING',
        'ACTIVE',
        'FOLDED',
        'DISCONNECTED',
      ];
      test.each(validAddChipsStates)(
        '[Player.addChips] ระบบจ่ายชิปให้ตอนที่สถานะ %s → ชิปเพิ่มขึ้นปกติโดยสถานะและเงินเดิมพันไม่เปลี่ยน',
        (state) => {
          const player = new Player('id1', 'Player 1');
          player.chips = 1000;
          player.bet = 50;
          player.status = state;

          player.addChips(500);

          expect(player.chips).toBe(1500);
          expect(player.bet).toBe(50);
          expect(player.status).toBe(state);
        },
      );

      test('[Player.addChips] ระบบเพิ่มชิปให้ 0 → ข้อมูลชิปไม่เปลี่ยน', () => {
        const player = new Player('id1', 'Player 1');
        player.chips = 1000;
        player.status = 'ACTIVE';

        player.addChips(0);

        expect(player.chips).toBe(1000);
      });

      const invalidAddAmounts = [
        { desc: 'ค่าติดลบ', amount: -100 },
        { desc: 'ค่าทศนิยม', amount: 50.5 },
        { desc: 'ค่า NaN', amount: NaN },
        { desc: 'ค่า Infinity', amount: Infinity },
        { desc: 'ชนิดเป็นสตริง', amount: '100' as unknown as number },
        { desc: 'ค่าเกิน MAX_SAFE_INTEGER', amount: Number.MAX_SAFE_INTEGER + 1 },
      ];
      test.each(invalidAddAmounts)(
        '[Player.addChips] เติมชิปด้วยข้อมูลผิดรูปแบบ ($desc) → โยน GameError(INVALID_AMOUNT)',
        ({ amount }) => {
          const player = new Player('id1', 'Player 1');
          player.chips = 1000;
          player.bet = 50;
          player.status = 'ACTIVE';

          expectGameErrorWithCode(() => player.addChips(amount), 'INVALID_AMOUNT');
          expect(player.chips).toBe(1000);
          expect(player.bet).toBe(50);
          expect(player.status).toBe('ACTIVE');
        },
      );

      test('[Player.addChips] เติมชิปด้วยยอดรวมเป็น MAX_SAFE_INTEGER พอดี → รับได้', () => {
        const player = new Player('id1', 'Player 1');
        player.chips = Number.MAX_SAFE_INTEGER - 500;
        player.status = 'ACTIVE';

        player.addChips(500);

        expect(player.chips).toBe(Number.MAX_SAFE_INTEGER);
      });

      test('[Player.addChips] ยอดรวมหลังจากเติมเกิน MAX_SAFE_INTEGER → โยน GameError(INVALID_AMOUNT)', () => {
        const player = new Player('id1', 'Player 1');
        player.chips = Number.MAX_SAFE_INTEGER - 100;
        player.bet = 200;
        player.status = 'ACTIVE';

        expectGameErrorWithCode(() => player.addChips(200), 'INVALID_AMOUNT');
        expect(player.chips).toBe(Number.MAX_SAFE_INTEGER - 100);
        expect(player.bet).toBe(200);
        expect(player.status).toBe('ACTIVE');
      });
    });
  });

  describe('ชุด B: ไพ่และสถานะ (Cards & Status)', () => {
    describe('B.1: การรับไพ่ (receiveCards)', () => {
      const validReceiveStates: PlayerStatus[] = ['WAITING', 'ACTIVE'];
      test.each(validReceiveStates)(
        '[Player.receiveCards] รับไพ่ 3 ใบตอนสถานะ %s → อัปเดต privateCards โดยทับชุดเดิมและสถานะไม่เปลี่ยน',
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

      test('[Player.receiveCards] รับไพ่ 1 ใบ → เก็บไพ่ตามที่ส่งมาโดยทับชุดเดิม', () => {
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

      const invalidReceiveStates: PlayerStatus[] = ['FOLDED', 'DISCONNECTED'];
      test.each(invalidReceiveStates)(
        '[Player.receiveCards] รับไพ่ตอนสถานะไม่อนุญาต (%s) → โยน PlayerStateError',
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

    describe('B.2: การเปิดดูไพ่ (seeCards)', () => {
      test('[Player.seeCards] ขอเปิดไพ่ครั้งแรกตอนเป็น Blind → เปลี่ยน isBlind เป็น false', () => {
        const player = new Player('id1', 'Player 1');
        player.status = 'ACTIVE';
        player.isBlind = true;

        player.seeCards();

        expect(player.isBlind).toBe(false);
      });

      test('[Player.seeCards] ขอเปิดไพ่ซ้ำตอนที่เคย Seen ไปแล้ว → นิ่งเฉยและคงสถานะ isBlind=false', () => {
        const player = new Player('id1', 'Player 1');
        player.status = 'ACTIVE';
        player.isBlind = false;

        player.seeCards();

        expect(player.isBlind).toBe(false);
      });

      const invalidSeeStates: PlayerStatus[] = ['WAITING', 'FOLDED', 'DISCONNECTED'];
      test.each(invalidSeeStates)(
        '[Player.seeCards] ขอดูไพ่ในสถานะไม่อนุญาต (%s) → โยน PlayerStateError',
        (state) => {
          const player = new Player('id1', 'Player 1');
          player.status = state;
          player.isBlind = true;

          expect(() => player.seeCards()).toThrow(PlayerStateError);
          expect(player.isBlind).toBe(true);
        },
      );
    });

    describe('B.3: การขอ Show ไพ่ (showCards)', () => {
      const allStates: PlayerStatus[] = ['WAITING', 'ACTIVE', 'FOLDED', 'DISCONNECTED'];
      test.each(allStates)(
        '[Player.showCards] ดึงข้อมูลไพ่ (Show) ในสถานะ %s → คืนค่าไพ่ทั้งหมดโดยไม่เปลี่ยนค่าอื่น',
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

    describe('B.4: การหมอบ (fold)', () => {
      test('[Player.fold] สั่งหมอบในขณะที่อยู่ในเกม (ACTIVE) → เปลี่ยนสถานะเป็น FOLDED โดยไม่คืนเงินเดิมพัน', () => {
        const player = new Player('id1', 'Player 1');
        player.status = 'ACTIVE';
        player.chips = 900;
        player.bet = 100;

        player.fold();

        expect(player.status as PlayerStatus).toBe('FOLDED');
        expect(player.chips).toBe(900);
        expect(player.bet).toBe(100);
      });

      const invalidFoldStates: PlayerStatus[] = ['WAITING', 'FOLDED', 'DISCONNECTED'];
      test.each(invalidFoldStates)(
        '[Player.fold] สั่งหมอบในสถานะไม่อนุญาต (%s) → โยน PlayerStateError',
        (state) => {
          const player = new Player('id1', 'Player 1');
          player.status = state;
          player.chips = 1000;
          player.bet = 50;

          expect(() => player.fold()).toThrow(PlayerStateError);
          expect(player.status).toBe(state);
          expect(player.chips).toBe(1000);
          expect(player.bet).toBe(50);
        },
      );
    });

    describe('B.5: การเคลียร์รอบ (resetForNewRound)', () => {
      const allStates: PlayerStatus[] = ['WAITING', 'ACTIVE', 'FOLDED', 'DISCONNECTED'];
      test.each(allStates)(
        '[Player.resetForNewRound] เคลียร์รอบใหม่จากสถานะ %s → ล้างไพ่ ล้างเดิมพัน เปลี่ยนเป็น WAITING และตั้ง isBlind=true',
        (state) => {
          const player = new Player('id1', 'Player 1');
          player.status = state;
          player.chips = 800;
          player.bet = 200;
          player.privateCards = [{ suit: 'SPADES', rank: 14 }];
          player.isBlind = false;

          player.resetForNewRound();

          expect(player.status).toBe('WAITING');
          expect(player.privateCards).toEqual([]);
          expect(player.bet).toBe(0);
          expect(player.isBlind).toBe(true);
          expect(player.chips).toBe(800);
        },
      );

      test('[Player.resetForNewRound] เคลียร์รอบใหม่ซ้ำ 2 ครั้ง → ไม่เกิดข้อผิดพลาดและสถานะยังคงเดิม', () => {
        const player = new Player('id1', 'Player 1');
        player.chips = 1000;
        player.bet = 50;

        player.resetForNewRound();
        player.resetForNewRound();

        expect(player.chips).toBe(1000);
        expect(player.bet).toBe(0);
        expect(player.status).toBe('WAITING');
        expect(player.privateCards).toEqual([]);
      });
    });
  });

  describe('ชุด C: การแปลงและการโหลดข้อมูล JSON (toJSON & fromJSON)', () => {
    describe('C.1: ข้อมูลสาธารณะ (toJSON)', () => {
      test('[Player.toJSON] ดึงข้อมูล Public DTO → ต้องได้ฟิลด์ครบถ้วนแต่ไม่มีฟิลด์ privateCards', () => {
        const player = new Player('id_test', 'Test Name');
        player.chips = 1000;
        player.bet = 50;
        player.status = 'ACTIVE';
        player.isBlind = false;
        player.privateCards = [{ suit: 'SPADES', rank: 14 }];

        const json = player.toJSON() as Record<string, unknown>;

        expect(json.id).toBe('id_test');
        expect(json.name).toBe('Test Name');
        expect(json.chips).toBe(1000);
        expect(json.bet).toBe(50);
        expect(json.status).toBe('ACTIVE');
        expect(json.isBlind).toBe(false);
        expect(json.privateCards).toBeUndefined();
      });
    });

    describe('C.2: การกู้คืนข้อมูลแบบเต็ม (fromJSON)', () => {
      test('[Player.fromJSON] กู้ข้อมูลจาก Object ที่มีไพ่หลายใบ → คืนค่าข้อมูลทั้ง 7 ฟิลด์ครบและไพ่ถูกต้องทุกใบ', () => {
        const validJson: Record<string, unknown> = {
          id: 'id_save',
          name: 'SaveName',
          chips: 5500,
          bet: 500,
          status: 'FOLDED',
          isBlind: false,
          privateCards: [
            { suit: 'HEARTS', rank: 5 },
            { suit: 'DIAMONDS', rank: 6 },
            { suit: 'CLUBS', rank: 7 },
          ],
          extraField: 'shouldBeIgnored',
        };

        const player = Player.fromJSON(validJson);

        expect(player).toBeInstanceOf(Player);
        expect(player.id).toBe('id_save');
        expect(player.name).toBe('SaveName');
        expect(player.chips).toBe(5500);
        expect(player.bet).toBe(500);
        expect(player.status).toBe('FOLDED');
        expect(player.isBlind).toBe(false);
        expect(player.privateCards).toEqual([
          { suit: 'HEARTS', rank: 5 },
          { suit: 'DIAMONDS', rank: 6 },
          { suit: 'CLUBS', rank: 7 },
        ]);
        expect((player as unknown as Record<string, unknown>).extraField).toBeUndefined();
      });

      test('[Player.fromJSON] กู้ข้อมูลจาก Object ที่มีไพ่ 1 ใบ → คืนค่าข้อมูลทั้ง 7 ฟิลด์ครบและไพ่ถูกต้อง', () => {
        const validJson: Record<string, unknown> = {
          id: 'id_save',
          name: 'SaveName',
          chips: 1000,
          bet: 0,
          status: 'WAITING',
          isBlind: true,
          privateCards: [{ suit: 'HEARTS', rank: 14 }],
        };

        const player = Player.fromJSON(validJson);

        expect(player).toBeInstanceOf(Player);
        expect(player.id).toBe('id_save');
        expect(player.name).toBe('SaveName');
        expect(player.chips).toBe(1000);
        expect(player.bet).toBe(0);
        expect(player.status).toBe('WAITING');
        expect(player.isBlind).toBe(true);
        expect(player.privateCards).toEqual([{ suit: 'HEARTS', rank: 14 }]);
      });

      const invalidDataTypes = [
        { desc: 'null', data: null },
        { desc: 'undefined', data: undefined },
        { desc: 'Array แทน Object', data: [] },
        { desc: 'String แทน Object', data: 'not_object' },
      ];
      test.each(invalidDataTypes)(
        '[Player.fromJSON] รับข้อมูลที่ไม่ใช่ Object ($desc) → โยน GameError(INVALID_PLAYER_DATA)',
        ({ data }) => {
          expectGameErrorWithCode(() => Player.fromJSON(data), 'INVALID_PLAYER_DATA');
        },
      );

      const missingFields = [
        { field: 'id', mod: (data: Record<string, unknown>) => delete data.id },
        { field: 'name', mod: (data: Record<string, unknown>) => delete data.name },
        { field: 'chips', mod: (data: Record<string, unknown>) => delete data.chips },
        { field: 'bet', mod: (data: Record<string, unknown>) => delete data.bet },
        { field: 'status', mod: (data: Record<string, unknown>) => delete data.status },
        { field: 'isBlind', mod: (data: Record<string, unknown>) => delete data.isBlind },
        {
          field: 'privateCards',
          mod: (data: Record<string, unknown>) => delete data.privateCards,
        },
      ];
      test.each(missingFields)(
        '[Player.fromJSON] ข้อมูลขาดฟิลด์สำคัญ (ขาด $field) → โยน GameError(INVALID_PLAYER_DATA)',
        ({ mod }) => {
          const json: Record<string, unknown> = {
            id: '1',
            name: 'N',
            chips: 100,
            bet: 10,
            status: 'WAITING',
            isBlind: true,
            privateCards: [],
          };
          mod(json);
          expectGameErrorWithCode(() => Player.fromJSON(json), 'INVALID_PLAYER_DATA');
        },
      );

      const invalidFieldValues = [
        { desc: 'id ว่าง', mod: (data: Record<string, unknown>) => (data.id = '') },
        { desc: 'id ไม่ใช่สตริง', mod: (data: Record<string, unknown>) => (data.id = 1) },
        {
          desc: 'name ไม่ใช่สตริง',
          mod: (data: Record<string, unknown>) => (data.name = 1),
        },
        {
          desc: 'isBlind ไม่ใช่ Boolean',
          mod: (data: Record<string, unknown>) => (data.isBlind = 'true'),
        },
        {
          desc: 'chips เป็นสตริง',
          mod: (data: Record<string, unknown>) => (data.chips = '100'),
        },
        {
          desc: 'chips ติดลบ',
          mod: (data: Record<string, unknown>) => (data.chips = -100),
        },
        {
          desc: 'chips เป็นทศนิยม',
          mod: (data: Record<string, unknown>) => (data.chips = 5.5),
        },
        {
          desc: 'chips เป็น NaN',
          mod: (data: Record<string, unknown>) => (data.chips = NaN),
        },
        {
          desc: 'chips เป็น Infinity',
          mod: (data: Record<string, unknown>) => (data.chips = Infinity),
        },
        {
          desc: 'chips เกิน MAX_SAFE_INTEGER',
          mod: (data: Record<string, unknown>) =>
            (data.chips = Number.MAX_SAFE_INTEGER + 1),
        },
        {
          desc: 'bet เป็นสตริง',
          mod: (data: Record<string, unknown>) => (data.bet = '10'),
        },
        { desc: 'bet ติดลบ', mod: (data: Record<string, unknown>) => (data.bet = -50) },
        {
          desc: 'bet เป็นทศนิยม',
          mod: (data: Record<string, unknown>) => (data.bet = 50.5),
        },
        {
          desc: 'bet เป็น NaN',
          mod: (data: Record<string, unknown>) => (data.bet = NaN),
        },
        {
          desc: 'bet เป็น Infinity',
          mod: (data: Record<string, unknown>) => (data.bet = Infinity),
        },
        {
          desc: 'bet เกิน MAX_SAFE_INTEGER',
          mod: (data: Record<string, unknown>) =>
            (data.bet = Number.MAX_SAFE_INTEGER + 1),
        },
        {
          desc: 'status ไม่ถูกต้อง',
          mod: (data: Record<string, unknown>) => (data.status = 'PLAYING'),
        },
        {
          desc: 'privateCards ไม่ใช่ Array',
          mod: (data: Record<string, unknown>) => (data.privateCards = {}),
        },
        {
          desc: 'ไพ่ใน Array เป็น null',
          mod: (data: Record<string, unknown>) => (data.privateCards = [null]),
        },
        {
          desc: 'ไพ่ใน Array ขาด suit',
          mod: (data: Record<string, unknown>) => (data.privateCards = [{ rank: 14 }]),
        },
        {
          desc: 'ไพ่ใน Array ขาด rank',
          mod: (data: Record<string, unknown>) =>
            (data.privateCards = [{ suit: 'HEARTS' }]),
        },
        {
          desc: 'ไพ่ใน Array suit ผิดประเภท',
          mod: (data: Record<string, unknown>) =>
            (data.privateCards = [{ suit: 1, rank: 14 }]),
        },
        {
          desc: 'ไพ่ใน Array rank ผิดประเภท',
          mod: (data: Record<string, unknown>) =>
            (data.privateCards = [{ suit: 'HEARTS', rank: 'A' }]),
        },
        {
          desc: 'ไพ่ใน Array suit ค่าผิด',
          mod: (data: Record<string, unknown>) =>
            (data.privateCards = [{ suit: 'INVALID_SUIT', rank: 14 }]),
        },
        {
          desc: 'ไพ่ใน Array rank เกินขอบเขตล่าง',
          mod: (data: Record<string, unknown>) =>
            (data.privateCards = [{ suit: 'HEARTS', rank: 1 }]),
        },
        {
          desc: 'ไพ่ใน Array rank เกินขอบเขตบน',
          mod: (data: Record<string, unknown>) =>
            (data.privateCards = [{ suit: 'HEARTS', rank: 15 }]),
        },
        {
          desc: 'ไพ่ใน Array rank ทศนิยม',
          mod: (data: Record<string, unknown>) =>
            (data.privateCards = [{ suit: 'HEARTS', rank: 2.5 }]),
        },
        {
          desc: 'ไพ่ใน Array rank เป็น NaN',
          mod: (data: Record<string, unknown>) =>
            (data.privateCards = [{ suit: 'HEARTS', rank: NaN }]),
        },
        {
          desc: 'ไพ่ใน Array rank เป็น Infinity',
          mod: (data: Record<string, unknown>) =>
            (data.privateCards = [{ suit: 'HEARTS', rank: Infinity }]),
        },
      ];
      test.each(invalidFieldValues)(
        '[Player.fromJSON] ข้อมูลฟิลด์ผิดประเภทหรือรูปแบบ ($desc) → โยน GameError(INVALID_PLAYER_DATA)',
        ({ mod }) => {
          const json: Record<string, unknown> = {
            id: '1',
            name: 'N',
            chips: 100,
            bet: 10,
            status: 'WAITING',
            isBlind: true,
            privateCards: [],
          };
          mod(json);
          expectGameErrorWithCode(() => Player.fromJSON(json), 'INVALID_PLAYER_DATA');
        },
      );
    });
  });
});
