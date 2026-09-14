import { expect, test, describe } from 'bun:test';
import { GameState } from '../../src/server/domain/models/GameState';
import { Player } from '../../src/server/domain/models/Player';
import {
  GameError,
  WrongTurnError,
  PlayerStateError,
  InvalidActionError,
} from '../../src/server/domain/errors/GameError';
import type { PlayerStatus, Card, GameActionType } from '../../src/shared/types';

type PlayerFixture = {
  id: string;
  name: string;
  status: PlayerStatus;
  chips: number;
  cards?: Card[];
};

function createMockGameState(
  overrides?: Partial<GameState>,
  playersParams?: PlayerFixture[],
): GameState {
  const defaultPlayers: PlayerFixture[] = [
    { id: 'defaultPlayer1', name: 'Default Player 1', status: 'ACTIVE', chips: 1000 },
    { id: 'defaultPlayer2', name: 'Default Player 2', status: 'ACTIVE', chips: 1000 },
  ];

  const players = (playersParams ?? defaultPlayers).map((playerParam) => {
    const player = new Player(playerParam.id, playerParam.name);
    player.status = playerParam.status;
    player.chips = playerParam.chips;

    if (playerParam.cards) {
      player.privateCards = playerParam.cards;
    }
    return player;
  });

  const gameState = new GameState(players, 50, 10000);
  if (overrides) {
    Object.assign(gameState, overrides);
  }
  return gameState;
}

describe('4. ระบบการเล่นบนโต๊ะ (Game State Engine)', () => {
  describe('Happy Paths', () => {
    test('[GameState.startGame] 4.1 เริ่มเกม → หักชิปเป็น Boot 50 เข้า Pot 100, ผู้เล่นได้รับไพ่คนละ 3 ใบ และผู้เล่นคนแรกสถานะเป็น ACTIVE', () => {
      const gameState = createMockGameState({}, [
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
    });

    test('[GameState.nextTurn] 4.2 เปลี่ยนเทิร์น → เปลี่ยนไปยังผู้เล่นคนถัดไป', () => {
      const gameState = createMockGameState({ currentPlayerIndex: 0 });
      gameState.nextTurn();
      expect(gameState.currentPlayerIndex).toBe(1);
    });

    test('[GameState.nextTurn] 4.3 ผู้เล่นสถานะ FOLDED หรือ DISCONNECTED → ข้ามเทิร์นไปยังคนถัดไปที่เป็น ACTIVE', () => {
      const gameState = createMockGameState({ currentPlayerIndex: 0 }, [
        { id: 'activePlayer', name: 'Active Player', status: 'ACTIVE', chips: 1000 },
        { id: 'foldedPlayer', name: 'Folded Player', status: 'FOLDED', chips: 1000 },
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
      expect(gameState.currentPlayerIndex).toBe(3);
    });

    test('[GameState.processAction] 4.4 ผู้เล่น Blind ขอ CALL → หักชิปเท่า currentStake 50 เข้า Pot 150 และ currentStake คงเดิมที่ 50', () => {
      const gameState = createMockGameState({
        currentPlayerIndex: 0,
        currentStake: 50,
        pot: 100,
      });
      const [blindPlayer] = gameState.activePlayers;

      gameState.processAction(blindPlayer.id, 'CALL');

      expect(gameState.pot).toBe(150);
      expect(gameState.currentStake).toBe(50);
      expect(blindPlayer.chips).toBe(950);
      expect(blindPlayer.bet).toBe(50);
    });

    test('[GameState.processAction] 4.5 ผู้เล่น Blind ขอ RAISE ด้วย 100 → หักชิป 100 เข้า Pot 200 และ currentStake เปลี่ยนเป็น 100', () => {
      const gameState = createMockGameState({
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
    });

    test('[GameState.processAction] 4.6 ผู้เล่น Seen ขอ CALL → หักชิป 100 เข้า Pot 200 และ currentStake คงเดิมที่ 50', () => {
      const gameState = createMockGameState({
        currentPlayerIndex: 0,
        currentStake: 50,
        pot: 100,
      });
      const [seenPlayer] = gameState.activePlayers;
      seenPlayer.isBlind = false;

      gameState.processAction(seenPlayer.id, 'CALL');

      expect(gameState.pot).toBe(200);
      expect(gameState.currentStake).toBe(50);
      expect(seenPlayer.chips).toBe(900);
      expect(seenPlayer.bet).toBe(100);
    });

    test('[GameState.processAction] 4.7 ผู้เล่น Seen ขอ RAISE ด้วย 200 → หักชิป 200 เข้า Pot 300 และ currentStake เปลี่ยนเป็น 100', () => {
      const gameState = createMockGameState({
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
    });

    test('[GameState.processAction] 4.8 วนเทิร์นกลับมาที่ผู้เล่นเดิมแล้วขอ CALL → หักชิปเต็ม 100 เข้า Pot 350 โดยไม่หักลบยอดเดิม', () => {
      const gameState = createMockGameState({
        currentPlayerIndex: 0,
        currentStake: 50,
        pot: 100,
      });
      const [firstPlayer, secondPlayer] = gameState.activePlayers;

      gameState.processAction(firstPlayer.id, 'CALL');
      gameState.nextTurn();
      gameState.processAction(secondPlayer.id, 'RAISE', 100);
      gameState.nextTurn();

      gameState.processAction(firstPlayer.id, 'CALL');

      expect(gameState.pot).toBe(350);
      expect(gameState.currentStake).toBe(100);
      expect(firstPlayer.chips).toBe(850);
      expect(firstPlayer.bet).toBe(150);
    });

    test('[GameState.evaluateWinner] 4.9 จบเกมและผู้เล่นคนแรกถือมือดีกว่า → โอนเงินใน Pot 500 ให้ผู้ชนะ', () => {
      const gameState = createMockGameState({ pot: 500 }, [
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

    test.skip('[GameState.executeSideshow] 4.10 [พักไว้หลังเดโม] → ผู้แพ้เปลี่ยนสถานะเป็น FOLDED', () => {
      const gameState = createMockGameState({ currentPlayerIndex: 0 }, [
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
      ]);
      const [loser, winner] = gameState.activePlayers;

      gameState.executeSideshow(loser.id, winner.id);

      expect(loser.status).toBe('FOLDED');
      expect(winner.status).toBe('ACTIVE');
    });

    test('[GameState.endGame] 4.11 คนอื่นหมอบหมดเหลือผู้เล่นคนเดียว → จบเกมและโอนเงิน Pot 1500 ให้ผู้เล่นที่เหลือรอด', () => {
      const gameState = createMockGameState({ pot: 1500 }, [
        { id: 'survivor', name: 'Survivor', status: 'ACTIVE', chips: 1000 },
        { id: 'foldedPlayer1', name: 'Folded Player 1', status: 'FOLDED', chips: 1000 },
        { id: 'foldedPlayer2', name: 'Folded Player 2', status: 'FOLDED', chips: 1000 },
      ]);
      const [survivor] = gameState.activePlayers;

      gameState.endGame();

      expect(survivor.chips).toBe(2500);
      expect(gameState.pot).toBe(0);
    });

    test('[GameState.processAction] 4.12 เหลือผู้เล่น Blind 2 คนและไพ่เสมอ → ผู้ขอจ่ายค่า SHOW และอีกคนรับกองกลางทั้งหมด', () => {
      const gameState = createMockGameState(
        { pot: 500, currentPlayerIndex: 0, currentStake: 100 },
        [
          {
            id: 'blindRequester',
            name: 'Blind Requester',
            status: 'ACTIVE',
            chips: 1000,
            cards: [
              { suit: 'SPADES', rank: 14 },
              { suit: 'HEARTS', rank: 13 },
              { suit: 'DIAMONDS', rank: 5 },
            ],
          },
          {
            id: 'blindTarget',
            name: 'Blind Target',
            status: 'ACTIVE',
            chips: 1000,
            cards: [
              { suit: 'CLUBS', rank: 14 },
              { suit: 'DIAMONDS', rank: 13 },
              { suit: 'SPADES', rank: 5 },
            ],
          },
        ],
      );
      const [blindRequester, blindTarget] = gameState.activePlayers;

      gameState.processAction(blindRequester.id, 'SHOW');

      expect(gameState.pot).toBe(0);
      expect(blindRequester.chips).toBe(900);
      expect(blindTarget.chips).toBe(1600);
    });

    test('[GameState.processAction] 4.13 ผู้เล่น Seen ขอ SHOW กับ Seen และไพ่เสมอ → ผู้ขอจ่ายค่า SHOW สองเท่า (200) และอีกคนรับกองกลางทั้งหมด', () => {
      const gameState = createMockGameState(
        { pot: 500, currentPlayerIndex: 0, currentStake: 100 },
        [
          {
            id: 'seenRequester',
            name: 'Seen Requester',
            status: 'ACTIVE',
            chips: 1000,
            cards: [
              { suit: 'SPADES', rank: 14 },
              { suit: 'HEARTS', rank: 13 },
              { suit: 'DIAMONDS', rank: 5 },
            ],
          },
          {
            id: 'seenTarget',
            name: 'Seen Target',
            status: 'ACTIVE',
            chips: 1000,
            cards: [
              { suit: 'CLUBS', rank: 14 },
              { suit: 'DIAMONDS', rank: 13 },
              { suit: 'SPADES', rank: 5 },
            ],
          },
        ],
      );
      const [seenRequester, seenTarget] = gameState.activePlayers;
      seenRequester.isBlind = false;
      seenTarget.isBlind = false;

      gameState.processAction(seenRequester.id, 'SHOW');

      expect(seenRequester.chips).toBe(800);
      expect(seenTarget.chips).toBe(1700);
    });

    test('[GameState.processAction] 4.14 ขอ SHOW เมื่อเหลือผู้เล่นมากกว่า 2 คน → โยน InvalidActionError', () => {
      const gameState = createMockGameState(
        { pot: 500, currentPlayerIndex: 0, currentStake: 100 },
        [
          {
            id: 'requester',
            name: 'Requester',
            status: 'ACTIVE',
            chips: 1000,
            cards: [
              { suit: 'SPADES', rank: 14 },
              { suit: 'HEARTS', rank: 13 },
              { suit: 'DIAMONDS', rank: 5 },
            ],
          },
          {
            id: 'target1',
            name: 'Target 1',
            status: 'ACTIVE',
            chips: 1000,
            cards: [
              { suit: 'CLUBS', rank: 14 },
              { suit: 'DIAMONDS', rank: 13 },
              { suit: 'SPADES', rank: 5 },
            ],
          },
          {
            id: 'target2',
            name: 'Target 2',
            status: 'ACTIVE',
            chips: 1000,
            cards: [
              { suit: 'HEARTS', rank: 2 },
              { suit: 'CLUBS', rank: 3 },
              { suit: 'DIAMONDS', rank: 4 },
            ],
          },
        ],
      );
      const [requester] = gameState.activePlayers;

      expect(() => {
        gameState.processAction(requester.id, 'SHOW');
      }).toThrow(InvalidActionError);

      expect(gameState.pot).toBe(500);
      expect(requester.chips).toBe(1000);
    });

    test('[GameState.processAction] 4.15 ขอ SHOW เมื่อไม่ใช่เทิร์นตนเอง → โยน WrongTurnError', () => {
      const gameState = createMockGameState(
        { pot: 500, currentPlayerIndex: 1, currentStake: 100 },
        [
          {
            id: 'waitingPlayer',
            name: 'Waiting Player',
            status: 'ACTIVE',
            chips: 1000,
            cards: [
              { suit: 'SPADES', rank: 14 },
              { suit: 'HEARTS', rank: 13 },
              { suit: 'DIAMONDS', rank: 5 },
            ],
          },
          {
            id: 'currentPlayer',
            name: 'Current Player',
            status: 'ACTIVE',
            chips: 1000,
            cards: [
              { suit: 'CLUBS', rank: 14 },
              { suit: 'DIAMONDS', rank: 13 },
              { suit: 'SPADES', rank: 5 },
            ],
          },
        ],
      );
      const [waitingPlayer] = gameState.activePlayers;

      expect(() => {
        gameState.processAction(waitingPlayer.id, 'SHOW');
      }).toThrow(WrongTurnError);

      expect(gameState.pot).toBe(500);
      expect(waitingPlayer.chips).toBe(1000);
    });

    test('[GameState.processAction] 4.16 ผู้เล่น Seen ขอ SHOW กับผู้เล่น Blind → โยน InvalidActionError', () => {
      const gameState = createMockGameState(
        { pot: 500, currentPlayerIndex: 0, currentStake: 100 },
        [
          {
            id: 'seenRequester',
            name: 'Seen Requester',
            status: 'ACTIVE',
            chips: 1000,
            cards: [
              { suit: 'SPADES', rank: 14 },
              { suit: 'HEARTS', rank: 13 },
              { suit: 'DIAMONDS', rank: 5 },
            ],
          },
          {
            id: 'blindTarget',
            name: 'Blind Target',
            status: 'ACTIVE',
            chips: 1000,
            cards: [
              { suit: 'CLUBS', rank: 14 },
              { suit: 'DIAMONDS', rank: 13 },
              { suit: 'SPADES', rank: 5 },
            ],
          },
        ],
      );
      const [seenRequester, blindTarget] = gameState.activePlayers;
      seenRequester.isBlind = false;
      blindTarget.isBlind = true;

      expect(() => {
        gameState.processAction(seenRequester.id, 'SHOW');
      }).toThrow(InvalidActionError);

      expect(gameState.pot).toBe(500);
      expect(seenRequester.chips).toBe(1000);
    });

    test('[GameState.startGame] 4.17 เริ่มเกมกับผู้เล่นสถานะ Blind → ผู้เล่นได้รับ privateCards ครบ 3 ใบและ isBlind ยังเป็น true', () => {
      const gameState = createMockGameState({}, [
        { id: 'firstPlayer', name: 'First Player', status: 'WAITING', chips: 1000 },
        { id: 'secondPlayer', name: 'Second Player', status: 'WAITING', chips: 1000 },
      ]);
      gameState.startGame();

      const [firstPlayer] = gameState.activePlayers;
      expect(firstPlayer.isBlind).toBe(true);
      expect(firstPlayer.privateCards.length).toBe(3);
    });

    test('[GameState.startGame] 4.18 เริ่มเกมด้วย Boot ที่กำหนดเอง → Pot และชิปถูกหักตาม Boot ใหม่', () => {
      const gameState = createMockGameState({}, [
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
      const gameState = createMockGameState({}, [
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
      const gameState = createMockGameState({ currentPlayerIndex: 0 }, [
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
      const gameState = createMockGameState({ currentPlayerIndex: 0 }, [
        { id: `foldedPlayer`, name: `Folded Player`, status: `FOLDED`, chips: 1000 },
        {
          id: `disconnectedPlayer`,
          name: `Disconnected Player`,
          status: `DISCONNECTED`,
          chips: 1000,
        },
      ]);

      expect(() => {
        gameState.nextTurn();
      }).toThrow(PlayerStateError);

      expect(gameState.currentPlayerIndex).toBe(0);
    });

    test('[GameState.rotateDealer] 4.22 หมุน Dealer และวนกลับมาเริ่มต้นแถวใหม่', () => {
      const gameState = createMockGameState({ dealerIndex: 1 }, [
        { id: 'player1', name: 'Player 1', status: 'WAITING', chips: 1000 },
        { id: 'player2', name: 'Player 2', status: 'WAITING', chips: 1000 },
        { id: 'player3', name: 'Player 3', status: 'WAITING', chips: 1000 },
      ]);
      gameState.rotateDealer();
      expect(gameState.dealerIndex).toBe(2);
      gameState.rotateDealer();
      expect(gameState.dealerIndex).toBe(0);
    });

    test('[GameState.processAction] 4.23 การทำ FOLD → เปลี่ยนสถานะเป็น FOLDED ไม่คืนชิป', () => {
      const gameState = createMockGameState({ currentPlayerIndex: 0, pot: 200 }, [
        { id: 'foldingPlayer', name: 'Folding Player', status: 'ACTIVE', chips: 900 },
        { id: 'otherPlayer', name: 'Other Player', status: 'ACTIVE', chips: 900 },
      ]);
      const [foldingPlayer] = gameState.activePlayers;
      foldingPlayer.bet = 100;

      gameState.processAction(foldingPlayer.id, 'FOLD');

      expect(foldingPlayer.status).toBe('FOLDED');
      expect(foldingPlayer.chips).toBe(900);
      expect(gameState.pot).toBe(200);
    });

    test('[GameState.processAction] 4.24 การทำ SEEN → เปลี่ยนเป็น isBlind=false ไม่เสียเงินเพิ่ม', () => {
      const gameState = createMockGameState({ currentPlayerIndex: 0, pot: 200 }, [
        { id: 'seeingPlayer', name: 'Seeing Player', status: 'ACTIVE', chips: 900 },
        { id: 'otherPlayer', name: 'Other Player', status: 'ACTIVE', chips: 900 },
      ]);
      const [seeingPlayer] = gameState.activePlayers;
      seeingPlayer.isBlind = true;

      gameState.processAction(seeingPlayer.id, 'SEEN');

      expect(seeingPlayer.isBlind).toBe(false);
      expect(seeingPlayer.chips).toBe(900);
    });

    test('[GameState.requestShow] 4.25 ผู้ขอแพ้เมื่อหน้าไพ่เสมอกัน', () => {
      const gameState = createMockGameState(
        { pot: 500, currentPlayerIndex: 0, currentStake: 100 },
        [
          {
            id: 'requester',
            name: 'Requester',
            status: 'ACTIVE',
            chips: 1000,
            cards: [
              { suit: 'SPADES', rank: 14 },
              { suit: 'HEARTS', rank: 13 },
              { suit: 'DIAMONDS', rank: 5 },
            ],
          },
          {
            id: 'target',
            name: 'Target',
            status: 'ACTIVE',
            chips: 1000,
            cards: [
              { suit: 'CLUBS', rank: 14 },
              { suit: 'DIAMONDS', rank: 13 },
              { suit: 'SPADES', rank: 5 },
            ],
          },
        ],
      );
      const [requester, target] = gameState.activePlayers;

      gameState.requestShow(requester.id);

      expect(gameState.pot).toBe(0);
      expect(requester.chips).toBe(900);
      expect(target.chips).toBe(1600);
    });

    test('[GameState.checkLastManStanding] 4.26 ตรวจหาคนสุดท้ายรอดชีวิต', () => {
      const gameState = createMockGameState({}, [
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
      const gameState = createMockGameState({ pot: 300 }, [
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
      const gameState = createMockGameState({ maxPotLimit: 10000 });

      gameState.pot = 9999;
      expect(gameState.checkPotLimitReached()).toBe(false);

      gameState.pot = 10000;
      expect(gameState.checkPotLimitReached()).toBe(true);

      gameState.pot = 10001;
      expect(gameState.checkPotLimitReached()).toBe(true);
    });

    test('[GameState.handlePlayerDisconnect] 4.29 เปลี่ยนสถานะผู้เล่นเป็น DISCONNECTED ไม่คืนเงิน', () => {
      const gameState = createMockGameState({ pot: 500 }, [
        {
          id: 'disconnectingPlayer',
          name: 'Disconnecting Player',
          status: 'ACTIVE',
          chips: 900,
        },
        { id: 'otherPlayer', name: 'Other Player', status: 'ACTIVE', chips: 1000 },
      ]);
      const [disconnectingPlayer] = gameState.activePlayers;
      disconnectingPlayer.bet = 100;

      gameState.handlePlayerDisconnect(disconnectingPlayer.id);

      expect(disconnectingPlayer.status).toBe('DISCONNECTED');
      expect(disconnectingPlayer.chips).toBe(900);
    });

    test('[GameState Flow] 4.30 การเล่นต่อเนื่องหลาย Action โดยไม่ผ่าน Server', () => {
      const gameState = createMockGameState({ currentPlayerIndex: 0 }, [
        { id: 'foldingPlayer', name: 'Folding Player', status: 'WAITING', chips: 1000 },
        { id: 'survivor', name: 'Survivor', status: 'WAITING', chips: 1000 },
      ]);
      const [foldingPlayer, survivor] = gameState.activePlayers;

      gameState.startGame();
      expect(gameState.pot).toBe(100);

      gameState.processAction(foldingPlayer.id, 'FOLD');
      expect(foldingPlayer.status).toBe('FOLDED');

      const lastMan = gameState.checkLastManStanding();
      expect(lastMan?.id).toBe(survivor.id);

      gameState.endGame();
      expect(survivor.chips).toBe(1050);
    });

    test('[GameState.nextTurn] 4.43 วนเทิร์นจากท้ายกลับมาคนแรก', () => {
      const gameState = createMockGameState({ currentPlayerIndex: 2 }, [
        { id: 'firstPlayer', name: 'First Player', status: 'ACTIVE', chips: 1000 },
        { id: 'secondPlayer', name: 'Second Player', status: 'ACTIVE', chips: 1000 },
        { id: 'thirdPlayer', name: 'Third Player', status: 'ACTIVE', chips: 1000 },
      ]);
      gameState.nextTurn();
      expect(gameState.currentPlayerIndex).toBe(0);
    });

    test('[GameState.checkLastManStanding] 4.44 คืนค่า null เมื่อเหลือผู้เล่น ACTIVE มากกว่า 1 คน', () => {
      const gameState = createMockGameState({}, [
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
      const gameState = createMockGameState({}, [
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

    test('[GameState.requestShow] 4.46 ผู้ขอ SHOW ชนะด้วยไพ่ที่สูงกว่า → ผู้ขอรับ Pot ทั้งหมด', () => {
      const gameState = createMockGameState(
        { pot: 500, currentPlayerIndex: 0, currentStake: 100 },
        [
          {
            id: 'requester',
            name: 'Requester',
            status: 'ACTIVE',
            chips: 1000,
            cards: [
              { suit: 'SPADES', rank: 14 },
              { suit: 'HEARTS', rank: 14 },
              { suit: 'DIAMONDS', rank: 14 },
            ],
          },
          {
            id: 'target',
            name: 'Target',
            status: 'ACTIVE',
            chips: 1000,
            cards: [
              { suit: 'CLUBS', rank: 2 },
              { suit: 'DIAMONDS', rank: 3 },
              { suit: 'SPADES', rank: 4 },
            ],
          },
        ],
      );
      const [requester, target] = gameState.activePlayers;
      gameState.requestShow(requester.id);

      expect(gameState.pot).toBe(0);
      expect(requester.chips).toBe(1500);
      expect(target.chips).toBe(1000);
    });

    test('[GameState.evaluateWinner] 4.47 ไม่จ่ายให้คนที่หมอบแม้ไพ่จะดีที่สุดในโต๊ะ', () => {
      const gameState = createMockGameState({ pot: 500 }, [
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
  });

  describe('Unhappy Paths', () => {
    test('[GameState.processAction] 4.31 สั่งเล่น CALL นอกเทิร์นตนเอง → โยน WrongTurnError และ pot, currentPlayerIndex และ bet ของผู้ขอไม่เปลี่ยน', () => {
      const gameState = createMockGameState(
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
      const gameState = createMockGameState(
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

    test('[GameState.endGame] 4.33 จบรอบซ้ำสองครั้ง → ผู้ชนะรับเงินจาก Pot แค่รอบแรก และชิปไม่เพิ่มเบิ้ล', () => {
      const gameState = createMockGameState({ pot: 1000 }, [
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

    test('[GameState.processAction] 4.34 แอคชันไม่รู้จัก → โยน Error และเงินไม่เปลี่ยน', () => {
      const gameState = createMockGameState(
        { currentPlayerIndex: 0, pot: 500, currentStake: 50 },
        [
          { id: `activePlayer1`, name: `Player 1`, status: `ACTIVE`, chips: 1000 },
          { id: `activePlayer2`, name: `Player 2`, status: `ACTIVE`, chips: 1000 },
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
      const gameState = createMockGameState(
        { currentPlayerIndex: 0, pot: 500, currentStake: 50 },
        [
          { id: 'activePlayer1', name: 'Active Player 1', status: 'ACTIVE', chips: 1000 },
          { id: 'activePlayer2', name: 'Active Player 2', status: 'ACTIVE', chips: 1000 },
        ],
      );
      const [activePlayer1, activePlayer2] = gameState.activePlayers;

      let caughtError: GameError | undefined;
      try {
        gameState.processAction('unknownPlayerId', 'FOLD');
      } catch (e) {
        caughtError = e as GameError;
      }
      expect(caughtError).toBeInstanceOf(GameError);
      expect(caughtError?.code).toBe('PLAYER_NOT_FOUND');

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

    const invalidActionAmounts = [
      { desc: 'ค่าติดลบ', amount: -50 },
      { desc: 'ศูนย์', amount: 0 },
      { desc: 'ทศนิยม', amount: 10.5 },
      { desc: 'NaN', amount: NaN },
      { desc: 'Infinity', amount: Infinity },
      { desc: 'สตริง', amount: '100' as unknown as number },
      { desc: 'เกิน Safe Integer', amount: Number.MAX_SAFE_INTEGER + 1 },
    ];
    invalidActionAmounts.forEach(({ desc, amount }, idx) => {
      test(`[GameState.processAction] 4.${36 + idx} การเดิมพันยอดเงินผิดรูปแบบ (${desc}) → โยน GameError(INVALID_AMOUNT) และข้อมูลคงเดิม`, () => {
        const gameState = createMockGameState(
          { currentPlayerIndex: 0, pot: 500, currentStake: 50 },
          [
            {
              id: 'activePlayer1',
              name: 'Active Player 1',
              status: 'ACTIVE',
              chips: 1000,
            },
            {
              id: 'activePlayer2',
              name: 'Active Player 2',
              status: 'ACTIVE',
              chips: 1000,
            },
          ],
        );
        const [activePlayer1, activePlayer2] = gameState.activePlayers;

        let caughtError: GameError | undefined;
        try {
          gameState.processAction(activePlayer1.id, 'RAISE', amount);
        } catch (e) {
          caughtError = e as GameError;
        }
        expect(caughtError).toBeInstanceOf(GameError);
        expect(caughtError?.code).toBe('INVALID_AMOUNT');

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
    });
  });
});
