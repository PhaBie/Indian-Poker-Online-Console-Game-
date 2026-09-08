import { expect, test, describe } from "bun:test";
import {
    cardSchema,
    shuffleDeckInputSchema,
    rngValueSchema,
    dealCardsInputSchema,
    evaluateHandInputSchema,
    compareHandsInputSchema,
    getWinnersInputSchema,
    calculateSplitPotInputSchema,
    positiveSafeIntSchema,
    nonNegativeSafeIntSchema,
} from "../../src/server/core/gameSchema";
import type { Card } from "../../src/shared/types";

describe("การทดสอบ Validation ของ gameSchema", () => {
    describe("1. ข้อมูลพื้นฐาน (Base Types)", () => {
        test("1.1 cardSchema - ข้อมูลไพ่ถูกต้อง", () => {
            expect(cardSchema.parse({ suit: 'SPADES', rank: 14 })).toEqual({ suit: 'SPADES', rank: 14 });
        });

        test("1.2 cardSchema - ดอกไพ่ไม่ถูกต้อง (ไม่อยู่ใน 4 ชนิดที่รองรับ)", () => {
            const result = cardSchema.safeParse({ suit: 'INVALID', rank: 14 });
            expect(result.success).toBe(false);
        });

        test("1.3 cardSchema - แต้มไพ่อยู่นอกขอบเขต (น้อยกว่า 2 หรือมากกว่า 14)", () => {
            const resultLow = cardSchema.safeParse({ suit: 'SPADES', rank: 1 });
            expect(resultLow.success).toBe(false);
            const resultHigh = cardSchema.safeParse({ suit: 'SPADES', rank: 15 });
            expect(resultHigh.success).toBe(false);
        });

        test("1.4 cardSchema - ไม่อนุญาตให้มีฟิลด์ส่วนเกิน (Strict Mode)", () => {
            const result = cardSchema.safeParse({ suit: 'SPADES', rank: 14, extra: 'prop' });
            expect(result.success).toBe(false);
        });

        test("1.4.1 cardSchema - แต้มไพ่ไม่รับค่าที่ผิดประเภท (ทศนิยม, String, NaN, Infinity)", () => {
            expect(cardSchema.safeParse({ suit: 'SPADES', rank: 14.5 }).success).toBe(false);
            expect(cardSchema.safeParse({ suit: 'SPADES', rank: "10" }).success).toBe(false);
            expect(cardSchema.safeParse({ suit: 'SPADES', rank: NaN }).success).toBe(false);
            expect(cardSchema.safeParse({ suit: 'SPADES', rank: Infinity }).success).toBe(false);
        });

        test("1.5 cardSchema - ข้อมูลไพ่ขาดฟิลด์ (Missing fields)", () => {
            expect(cardSchema.safeParse({ suit: 'SPADES' }).success).toBe(false);
            expect(cardSchema.safeParse({ rank: 14 }).success).toBe(false);
            expect(cardSchema.safeParse({}).success).toBe(false);
        });

        test("1.6 positiveSafeIntSchema - ขอบเขตจำนวนเต็มบวก (ไม่รวมศูนย์)", () => {
            expect(positiveSafeIntSchema.parse(1)).toBe(1);
            expect(positiveSafeIntSchema.parse(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);

            expect(positiveSafeIntSchema.safeParse(0).success).toBe(false);
            expect(positiveSafeIntSchema.safeParse(-1).success).toBe(false);
            expect(positiveSafeIntSchema.safeParse(1.5).success).toBe(false);
            expect(positiveSafeIntSchema.safeParse(Number.MAX_SAFE_INTEGER + 1).success).toBe(false);
            expect(positiveSafeIntSchema.safeParse(NaN).success).toBe(false);
            expect(positiveSafeIntSchema.safeParse(Infinity).success).toBe(false);
            expect(positiveSafeIntSchema.safeParse(-Infinity).success).toBe(false);
            expect(positiveSafeIntSchema.safeParse("1").success).toBe(false);
        });

        test("1.7 nonNegativeSafeIntSchema - ขอบเขตจำนวนเต็มบวกหรือศูนย์ (รวมศูนย์)", () => {
            expect(nonNegativeSafeIntSchema.parse(0)).toBe(0);
            expect(nonNegativeSafeIntSchema.parse(1)).toBe(1);
            expect(nonNegativeSafeIntSchema.parse(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);

            expect(nonNegativeSafeIntSchema.safeParse(-1).success).toBe(false);
            expect(nonNegativeSafeIntSchema.safeParse(1.5).success).toBe(false);
            expect(nonNegativeSafeIntSchema.safeParse(Number.MAX_SAFE_INTEGER + 1).success).toBe(false);
            expect(nonNegativeSafeIntSchema.safeParse(NaN).success).toBe(false);
            expect(nonNegativeSafeIntSchema.safeParse(Infinity).success).toBe(false);
            expect(nonNegativeSafeIntSchema.safeParse(-Infinity).success).toBe(false);
            expect(nonNegativeSafeIntSchema.safeParse("0").success).toBe(false);
        });

        test("1.8 rngValueSchema - ค่าสุ่มถูกต้อง (อยู่ในช่วง [0, 1))", () => {
            expect(rngValueSchema.parse(0)).toBe(0);
            expect(rngValueSchema.parse(0.9999)).toBe(0.9999);
        });

        test("1.9 rngValueSchema - ค่าสุ่มไม่ถูกต้อง (ติดลบ หรือตั้งแต่ 1 ขึ้นไป)", () => {
            expect(rngValueSchema.safeParse(1).success).toBe(false);
            expect(rngValueSchema.safeParse(-0.1).success).toBe(false);
        });
    });

    describe("2. shuffleDeckInputSchema (สำรับไพ่สำหรับการสับ)", () => {
        test("2.1 สำรับไพ่ถูกต้อง (สำรับว่าง, 1 ใบ, หลายใบและไม่ซ้ำกัน)", () => {
            expect(shuffleDeckInputSchema.parse([])).toEqual([]);
            expect(shuffleDeckInputSchema.parse([{ suit: 'HEARTS', rank: 2 }])).toHaveLength(1);
            expect(shuffleDeckInputSchema.parse([
                { suit: 'HEARTS', rank: 2 },
                { suit: 'SPADES', rank: 2 }
            ])).toHaveLength(2);
        });

        test("2.2 สำรับไพ่ไม่ถูกต้อง (พบไพ่ซ้ำกันในสำรับ)", () => {
            const result = shuffleDeckInputSchema.safeParse([
                { suit: 'HEARTS', rank: 2 },
                { suit: 'HEARTS', rank: 2 }
            ]);
            expect(result.success).toBe(false);
        });
    });

    describe("3. dealCardsInputSchema (ข้อมูลสำหรับการแจกไพ่)", () => {
        test("3.1 ข้อมูลขาเข้าถูกต้อง (ไพ่ในสำรับเพียงพอต่อการแจก)", () => {
            const deck: Card[] = [{ suit: 'HEARTS', rank: 2 }, { suit: 'SPADES', rank: 3 }];
            const input = {
                deck,
                playerCount: 1,
                cardsPerPlayer: 2,
            };
            expect(dealCardsInputSchema.parse(input)).toEqual(input);
        });

        test("3.2 ข้อมูลขาเข้าไม่ถูกต้อง (ไพ่ในสำรับไม่เพียงพอต่อการแจก)", () => {
            const result = dealCardsInputSchema.safeParse({
                deck: [{ suit: 'HEARTS', rank: 2 }],
                playerCount: 1,
                cardsPerPlayer: 2,
            });
            expect(result.success).toBe(false);
        });

        test("3.3 ข้อมูลขาเข้าไม่ถูกต้อง (จำนวนผู้เล่นหรือจำนวนไพ่ต่อคนเป็น 0 หรือติดลบ)", () => {
            const resultZeroPlayers = dealCardsInputSchema.safeParse({
                deck: [{ suit: 'HEARTS', rank: 2 }],
                playerCount: 0,
                cardsPerPlayer: 1,
            });
            expect(resultZeroPlayers.success).toBe(false);

            const resultNegativeCards = dealCardsInputSchema.safeParse({
                deck: [{ suit: 'HEARTS', rank: 2 }],
                playerCount: 1,
                cardsPerPlayer: -1,
            });
            expect(resultNegativeCards.success).toBe(false);
        });

        test("3.4 ข้อมูลขาเข้าไม่ถูกต้อง (จำนวนผู้เล่นเป็นทศนิยม)", () => {
            const result = dealCardsInputSchema.safeParse({
                deck: [{ suit: 'HEARTS', rank: 2 }],
                playerCount: 1.5,
                cardsPerPlayer: 1,
            });
            expect(result.success).toBe(false);
        });
    });

    describe("4. evaluateHandInputSchema (ไพ่ในมือสำหรับการประเมิน)", () => {
        test("4.1 ข้อมูลไพ่ถูกต้อง (มี 3 ใบถ้วนและไม่ซ้ำกัน)", () => {
            const input: Card[] = [
                { suit: 'HEARTS', rank: 2 },
                { suit: 'SPADES', rank: 3 },
                { suit: 'CLUBS', rank: 4 }
            ];
            expect(evaluateHandInputSchema.parse(input)).toEqual(input);
        });

        test("4.2 ข้อมูลไพ่ไม่ถูกต้อง (จำนวนไพ่ไม่เท่ากับ 3 ใบ)", () => {
            expect(evaluateHandInputSchema.safeParse([{ suit: 'HEARTS', rank: 2 }]).success).toBe(false);
            expect(evaluateHandInputSchema.safeParse([
                { suit: 'HEARTS', rank: 2 }, { suit: 'SPADES', rank: 3 },
                { suit: 'CLUBS', rank: 4 }, { suit: 'DIAMONDS', rank: 5 }
            ]).success).toBe(false);
        });

        test("4.3 ข้อมูลไพ่ไม่ถูกต้อง (พบไพ่ซ้ำกันในมือ)", () => {
            expect(evaluateHandInputSchema.safeParse([
                { suit: 'HEARTS', rank: 2 },
                { suit: 'HEARTS', rank: 2 },
                { suit: 'CLUBS', rank: 4 }
            ]).success).toBe(false);
        });
    });

    describe("5. compareHandsInputSchema (มือไพ่สำหรับการเปรียบเทียบ)", () => {
        test("5.1 ข้อมูลถูกต้อง (มือไพ่สองมืออิสระต่อกันและไม่ผิดกฎ)", () => {
            const firstHand: Card[] = [
                { suit: 'HEARTS', rank: 2 }, { suit: 'SPADES', rank: 3 }, { suit: 'CLUBS', rank: 4 }
            ];
            const secondHand: Card[] = [
                { suit: 'HEARTS', rank: 2 }, { suit: 'DIAMONDS', rank: 3 }, { suit: 'CLUBS', rank: 5 }
            ];
            expect(compareHandsInputSchema.parse({ firstHand, secondHand })).toEqual({ firstHand, secondHand });
        });

        test("5.2 ข้อมูลถูกต้อง (มือไพ่สองมือมีไพ่เหมือนกันทุกประการ อนุญาตให้ทำได้เนื่องจากประเมินแยกกัน)", () => {
            const hand: Card[] = [
                { suit: 'HEARTS', rank: 2 }, { suit: 'SPADES', rank: 3 }, { suit: 'CLUBS', rank: 4 }
            ];
            expect(compareHandsInputSchema.parse({ firstHand: hand, secondHand: hand })).toEqual({ firstHand: hand, secondHand: hand });
        });
    });

    describe("6. getWinnersInputSchema (กลุ่มผู้เล่นสำหรับการหาผู้ชนะ)", () => {
        test("6.1 ข้อมูลถูกต้อง (ไม่มีผู้เล่นในกลุ่ม)", () => {
            expect(getWinnersInputSchema.parse([])).toEqual([]);
        });

        test("6.2 ข้อมูลถูกต้อง (ผู้เล่นหลายคนมี ID ไม่ซ้ำกัน และไม่มีไพ่ซ้ำกันเมื่อรวมทั้งวง)", () => {
            const input: { id: string, cards: Card[] }[] = [
                { id: "p1", cards: [{ suit: 'HEARTS', rank: 2 }, { suit: 'SPADES', rank: 3 }, { suit: 'CLUBS', rank: 4 }] },
                { id: "p2", cards: [{ suit: 'DIAMONDS', rank: 2 }, { suit: 'HEARTS', rank: 3 }, { suit: 'SPADES', rank: 4 }] }
            ];
            expect(getWinnersInputSchema.parse(input)).toEqual(input);
        });

        test("6.3 ข้อมูลไม่ถูกต้อง (พบ ID ผู้เล่นซ้ำซ้อน)", () => {
            const input = [
                { id: "p1", cards: [{ suit: 'HEARTS', rank: 2 }, { suit: 'SPADES', rank: 3 }, { suit: 'CLUBS', rank: 4 }] },
                { id: "p1", cards: [{ suit: 'DIAMONDS', rank: 2 }, { suit: 'HEARTS', rank: 3 }, { suit: 'SPADES', rank: 4 }] }
            ];
            expect(getWinnersInputSchema.safeParse(input).success).toBe(false);
        });

        test("6.4 ข้อมูลไม่ถูกต้อง (พบไพ่ซ้ำกันระหว่างผู้เล่นในวง)", () => {
            const input = [
                { id: "p1", cards: [{ suit: 'HEARTS', rank: 2 }, { suit: 'SPADES', rank: 3 }, { suit: 'CLUBS', rank: 4 }] },
                { id: "p2", cards: [{ suit: 'HEARTS', rank: 2 }, { suit: 'DIAMONDS', rank: 3 }, { suit: 'SPADES', rank: 5 }] }
            ];
            expect(getWinnersInputSchema.safeParse(input).success).toBe(false);
        });
    });

    describe("7. calculateSplitPotInputSchema (ข้อมูลสำหรับการแบ่งกองกลาง)", () => {
        test("7.1 ข้อมูลถูกต้อง (เงินกองกลางเป็นบวกและมีผู้ชนะหลายคน)", () => {
            expect(calculateSplitPotInputSchema.parse({ pot: 1000, winnerIds: ["p1", "p2"] })).toEqual({ pot: 1000, winnerIds: ["p1", "p2"] });
        });

        test("7.2 ข้อมูลถูกต้อง (เงินกองกลางเป็น 0 และไม่มีผู้ชนะ)", () => {
            expect(calculateSplitPotInputSchema.parse({ pot: 0, winnerIds: [] })).toEqual({ pot: 0, winnerIds: [] });
        });

        test("7.3 ข้อมูลไม่ถูกต้อง (เงินกองกลางมากกว่า 0 แต่ไม่มีผู้ชนะ)", () => {
            const result = calculateSplitPotInputSchema.safeParse({ pot: 1000, winnerIds: [] });
            expect(result.success).toBe(false);
        });

        test("7.4 ข้อมูลไม่ถูกต้อง (เงินกองกลางติดลบ)", () => {
            expect(calculateSplitPotInputSchema.safeParse({ pot: -100, winnerIds: ["p1"] }).success).toBe(false);
        });

        test("7.5 ข้อมูลไม่ถูกต้อง (เงินกองกลางเป็นทศนิยม)", () => {
            expect(calculateSplitPotInputSchema.safeParse({ pot: 100.5, winnerIds: ["p1"] }).success).toBe(false);
        });

        test("7.6 ข้อมูลไม่ถูกต้อง (พบ ID ผู้ชนะซ้ำซ้อน)", () => {
            expect(calculateSplitPotInputSchema.safeParse({ pot: 1000, winnerIds: ["p1", "p1"] }).success).toBe(false);
        });
    });
});
