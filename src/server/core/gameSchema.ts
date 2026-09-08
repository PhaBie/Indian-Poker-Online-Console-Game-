import { z } from "zod";
import type { Card, Suit, Rank } from "../../shared/types";

// ขออนุญาตเขียน Comment มันจะมีประโยชน์เวลาเข้ามาอ่าน จะได้รู้ว่ามี validate อะไรบ้าง
// สามารถเข้ามาเรียกใช้ได้เลย

/**
 * --------------------------------------------------------------------------
 * Base Schemas (ข้อกำหนดข้อมูลพื้นฐาน)
 * --------------------------------------------------------------------------
 */

// กำหนดให้ดอกไพ่ต้องตรงกับประเภทใดประเภทหนึ่งใน 4 ชนิดที่ระบบรองรับเท่านั้น
export const cardSuitSchema = z.enum(["SPADES", "HEARTS", "DIAMONDS", "CLUBS"]) as z.ZodType<Suit>;

// กำหนดให้แต้มไพ่ต้องเป็นจำนวนเต็มที่อยู่ในช่วง 2 ถึง 14 เท่านั้น (11=J, 12=Q, 13=K, 14=A)
export const cardRankSchema = z.number().int().min(2).max(14).safe() as z.ZodType<Rank>;

// กำหนดโครงสร้างข้อมูลของไพ่ 1 ใบ โดยไม่อนุญาตให้มีการส่งฟิลด์อื่นเกินความจำเป็นเข้ามาในระบบ (Strict Mode)
export const cardSchema = z.object({
    suit: cardSuitSchema,
    rank: cardRankSchema,
}).strict() as z.ZodType<Card>;

// กำหนดให้ข้อมูลตัวเลขเป็นจำนวนเต็มบวกเท่านั้น ป้องกันการรับค่า 0, ค่าติดลบ, ทศนิยม หรือค่าที่เกินขีดจำกัดปลอดภัย
export const positiveSafeIntSchema = z.number().int().positive().safe();

// กำหนดให้ข้อมูลตัวเลขเป็นจำนวนเต็มที่ไม่ติดลบ (อนุญาตให้เป็น 0 ได้) เพื่อใช้กับข้อมูลประเภทเงินเดิมพันหรือจำนวนชิป
export const nonNegativeSafeIntSchema = z.number().int().nonnegative().safe();

/**
 * ฟังก์ชันช่วยเหลือสำหรับการตรวจสอบไพ่ซ้ำในชุดไพ่
 * โดยเปรียบเทียบจากจำนวนไพ่ทั้งหมด กับ จำนวนไพ่ที่ไม่ซ้ำกัน
 */
const hasDuplicateCards = (cardList: Card[]): boolean => {
    const uniqueCardKeys = new Set(cardList.map((card) => `${card.suit}-${card.rank}`));
    return uniqueCardKeys.size !== cardList.length;
};

/**
 * --------------------------------------------------------------------------
 * Function Input Schemas (ข้อกำหนดข้อมูลขาเข้าของแต่ละฟังก์ชัน)
 * --------------------------------------------------------------------------
 */

// 1. กำหนดให้สำรับไพ่ที่รับเข้ามาก่อนการสับไพ่ต้องไม่มีไพ่ซ้ำกัน (อนุญาตให้เป็นสำรับว่างหรือมีไพ่ใบเดียวได้ในกรณีทดสอบ)
export const shuffleDeckInputSchema = z.array(cardSchema).refine(
    (cardList) => !hasDuplicateCards(cardList),
    { message: "Invalid deck configuration: duplicate cards detected." }
);

// กำหนดให้ค่าสุ่ม (Random Number Generator) ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป และน้อยกว่า 1 เสมอ (ช่วง [0, 1))
export const rngValueSchema = z.number().min(0).lt(1);

// 2. กำหนดเงื่อนไขก่อนแจกไพ่: ต้องมีจำนวนไพ่ในสำรับมากพอที่จะแจกให้ผู้เล่นทุกคนตามจำนวนที่ระบุ และข้อมูลผู้เล่น/ไพ่ต้องเป็นจำนวนเต็มบวกที่ถูกต้อง
export const dealCardsInputSchema = z.object({
    deck: shuffleDeckInputSchema,
    playerCount: positiveSafeIntSchema,
    cardsPerPlayer: positiveSafeIntSchema,
}).strict().refine(
    (dealInfo) => dealInfo.deck.length >= dealInfo.playerCount * dealInfo.cardsPerPlayer,
    { message: "Insufficient cards in the deck to deal the required amount to all players." }
);

// 3. กำหนดเงื่อนไขไพ่ในมือสำหรับนำไปประเมินผล: ต้องมีไพ่จำนวน 3 ใบถ้วน และไพ่ทั้ง 3 ใบต้องไม่ซ้ำกัน
export const evaluateHandInputSchema = z.array(cardSchema)
    .length(3, { message: "Invalid hand size: exactly 3 cards are required." })
    .refine(
        (cardList) => !hasDuplicateCards(cardList),
        { message: "Invalid hand configuration: duplicate cards detected within the hand." }
    );

// 4. กำหนดเงื่อนไขสำหรับการเปรียบเทียบมือไพ่: ตรวจสอบความถูกต้องของไพ่แต่ละมือแยกกัน (อิสระจากกัน จึงอนุญาตให้เทียบไพ่มือเดียวกันกับตัวเองได้)
export const compareHandsInputSchema = z.object({
    firstHand: evaluateHandInputSchema,
    secondHand: evaluateHandInputSchema,
}).strict();

// กำหนดโครงสร้างข้อมูลของผู้เล่นพร้อมไพ่ในมือ เพื่อเตรียมไว้สำหรับการหาผู้ชนะ
export const playerHandSchema = z.object({
    id: z.string().min(1),
    cards: evaluateHandInputSchema,
}).strict();

// 5. กำหนดเงื่อนไขก่อนหาผู้ชนะ:
// - รหัสประจำตัว (ID) ของผู้เล่นแต่ละคนในวงต้องไม่ซ้ำกัน
// - เมื่อนำไพ่ของผู้เล่นทุกคนมารวมกัน จะต้องไม่มีไพ่ซ้ำกันหลุดเข้ามาในวงเล่น
export const getWinnersInputSchema = z.array(playerHandSchema).refine(
    (playerList) => {
        const uniquePlayerIds = new Set(playerList.map((player) => player.id));
        return playerList.length === uniquePlayerIds.size;
    },
    { message: "Duplicate player identifiers detected in the input." }
).refine(
    (playerList) => {
        const allCardsInPlay = playerList.flatMap((player) => player.cards);
        return !hasDuplicateCards(allCardsInPlay);
    },
    { message: "Data inconsistency: identical cards found across multiple players." }
);

// 6. กำหนดเงื่อนไขก่อนแบ่งเงินกองกลาง (Split Pot):
// - ยอดเงินในกองกลาง (Pot) ต้องเป็นจำนวนเต็มที่ไม่ติดลบ
// - รหัสประจำตัว (ID) ของผู้ชนะต้องไม่ซ้ำกัน
// - หากเงินกองกลางมีมากกว่า 0 จะต้องมีรายชื่อผู้ชนะอย่างน้อย 1 คนเสมอ (หากไม่มีผู้ชนะ Schema จะปฏิเสธข้อมูลทันที)
export const calculateSplitPotInputSchema = z.object({
    pot: nonNegativeSafeIntSchema,
    winnerIds: z.array(z.string().min(1)).refine(
        (winnerIdList) => {
            const uniqueWinnerIds = new Set(winnerIdList);
            return winnerIdList.length === uniqueWinnerIds.size;
        },
        { message: "Duplicate winner identifiers detected." }
    ),
}).strict().superRefine((splitData, validationContext) => {
    const hasNoWinners = splitData.winnerIds.length === 0;
    if (splitData.pot > 0 && hasNoWinners) {
        validationContext.addIssue({
            code: "custom",
            message: "Invalid payout configuration: the pot is greater than 0, but no winners were provided.",
        });
    }
});
