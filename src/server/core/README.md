คู่มือการนำ Validation ไปใช้ใน Core Logic (ส่งมอบให้ Developer)

เป้าหมาย:
เอกสารนี้อธิบายวิธีนำ gameSchema.ts ที่เขียนเสร็จแล้ว ไปครอบตรวจสอบข้อมูลให้กับฟังก์ชันต่างๆ ใน gameLogic.ts เพื่อให้โค้ดส่วนการทำงานหลัก (Core Logic) สะอาดขึ้น และผลักภาระการตรวจสอบข้อมูลที่ไม่ถูกต้องไปให้ Zod เป็นคนจัดการ

กฎที่ต้องทำตาม:

1. ห้ามเขียนโค้ดดักจับ (catch) Error ของ Zod ภายในฟังก์ชัน Core Logic เด็ดขาด ปล่อยให้ Error ทะลุออกไปเพื่อให้ระบบส่วนอื่น (เช่น Controller) เป็นคนรับไปจัดการต่อ
2. ห้ามไปแก้ไข Test เดิมที่ผ่านอยู่แล้ว (Happy Paths)

ตัวอย่างการใช้งานแบบง่าย:
เมื่อจะเขียนฟังก์ชันแจกไพ่ (dealCards) ให้เรียกใช้ .parse() ในบรรทัดแรกสุดของฟังก์ชัน ถ้ารูปแบบข้อมูลไม่ถูกต้อง โค้ดจะหยุดทำงานและโยน ZodError ออกไปทันที

```typescript
import { dealCardsInputSchema } from './gameSchema';

export function dealCards(
  deck: Card[],
  playerCount: number,
  cardsPerPlayer: number,
): { hands: Card[][]; remainingDeck: Card[] } {
  // ตรวจสอบข้อมูลขาเข้าก่อนเริ่มทำงาน
  dealCardsInputSchema.parse({ deck, playerCount, cardsPerPlayer });

  // (ตัวอย่างนี้แสดงเฉพาะการแทรก Validation เท่านั้น ไม่ใช่ฟังก์ชันฉบับสมบูรณ์)

  // หลังจากบรรทัดนี้ลงไป สามารถเขียนโค้ดการแจกไพ่ตามปกติได้เลย เพราะข้อมูลผ่านข้อกำหนดที่ Schema ตรวจ
}
```

เรื่องสำคัญ: การจัดการการสุ่ม (RNG) ในฟังก์ชันสับไพ่ (shuffleDeck)
เพื่อให้ระบบสับไพ่สามารถถูกทดสอบได้ เราจะรับค่าฟังก์ชันสุ่มตัวเลข (RNG) มาจากภายนอก กฎคือ "ให้เรียกการสุ่มแค่ 1 ครั้งต่อการสลับไพ่ 1 คู่" หลังจากได้ค่าตัวเลขมาแล้ว ให้ตรวจสอบด้วย Zod ก่อนนำไปใช้งาน

ตัวอย่างการสับไพ่ที่ถูกต้อง:

```typescript
import { rngValueSchema, shuffleDeckInputSchema } from './gameSchema';

export function shuffleDeck(
  deck: Card[],
  rngGenerator: () => number = Math.random,
): Card[] {
  shuffleDeckInputSchema.parse(deck);
  const shuffledDeck = [...deck];

  // ใช้ชื่อตัวแปรที่สื่อความหมายชัดเจน
  for (let currentIndex = shuffledDeck.length - 1; currentIndex > 0; currentIndex--) {
    // 1. เรียกใช้งานฟังก์ชันสุ่มเพียงหนึ่งครั้ง
    const randomDecimal = rngGenerator();

    // 2. ตรวจสอบว่าค่าที่สุ่มได้อยู่ในเกณฑ์ที่ถูกต้องหรือไม่ (ต้องอยู่ระหว่าง 0 ถึง 0.999...)
    rngValueSchema.parse(randomDecimal);

    // 3. คำนวณหาตำแหน่งไพ่ใบที่จะนำมาสลับ
    const targetSwapIndex = Math.floor(randomDecimal * (currentIndex + 1));

    // 4. สลับไพ่สองตำแหน่ง
    const tempCard = shuffledDeck[currentIndex];
    shuffledDeck[currentIndex] = shuffledDeck[targetSwapIndex];
    shuffledDeck[targetSwapIndex] = tempCard;
  }

  return shuffledDeck;
}
```

สรุปงานที่ต้องนำไปเชื่อมต่อ (Implementation Checklist)

เป้าหมายหลักของการนำ Zod Schema ไปใช้งาน คือการทำให้ชุดทดสอบ (Test Suite) ผ่านทั้งหมด โดยสถานะปัจจุบันเป็นดังนี้:

- ✅ ทดสอบตัว Schema (gameSchema.test.ts): ผ่านทั้งหมด 31/31 เคส
- ✅ ทดสอบฝั่ง Core Logic (Happy Paths): ผ่านการจำลองการเล่นปกติทั้งหมด 61/61 เคส

- ❌ ทดสอบการดักจับข้อผิดพลาด (Unhappy Paths): ปัจจุบันยังไม่ผ่าน 89/89 เคส เนื่องจากยังไม่ได้เชื่อม Validation เข้าไป (บางเคสไม่ได้โยน Error เลย หรือบางเคสเกิด JavaScript Error ขึ้นแทน ZodError)

รายการฟังก์ชันที่ต้องดำเนินการแก้ไข (Action Items)
ทีมพัฒนาที่รับผิดชอบในส่วนของ `gameLogic.ts` จะต้องนำ Schema ไปครอบการรับข้อมูลในทุกฟังก์ชัน ดังรายการต่อไปนี้:

1. ฟังก์ชัน `shuffleDeck(deck, rng)`
   - ก่อนทำงาน: ใช้คำสั่ง `shuffleDeckInputSchema.parse(deck);`
   - ภายในลูป: ใช้คำสั่ง `rngValueSchema.parse(randomDecimal);` เพื่อตรวจสอบค่าที่ได้จาก RNG

2. ฟังก์ชัน `dealCards(deck, playerCount, cardsPerPlayer)`
   - ก่อนทำงาน: ใช้คำสั่ง `dealCardsInputSchema.parse({ deck, playerCount, cardsPerPlayer });`

3. ฟังก์ชัน `evaluateHand(hand)`
   - ก่อนทำงาน: ใช้คำสั่ง `evaluateHandInputSchema.parse(hand);`

4. ฟังก์ชัน `compareHands(handA, handB)`
   - ก่อนทำงาน: ใช้คำสั่ง `compareHandsInputSchema.parse({ firstHand: handA, secondHand: handB });`

5. ฟังก์ชัน `getWinners(players)`
   - ก่อนทำงาน: ใช้คำสั่ง `getWinnersInputSchema.parse(players);`

6. ฟังก์ชัน `calculateSplitPot(pot, winnerIds)`
   - ก่อนทำงาน: ใช้คำสั่ง `calculateSplitPotInputSchema.parse({ pot, winnerIds });`

เมื่อทีมพัฒนาดำเนินการนำคำสั่ง `.parse()` ไปใส่ในฟังก์ชันข้างต้นเสร็จสมบูรณ์แล้ว หลังเชื่อมครบ ให้รันยืนยันว่า Test ผ่านทั้งหมด

## รายการตรวจสอบข้อกำหนด (Traceability Matrix)

เพื่อให้มั่นใจว่า Validation Schema และ Core Logic สามารถทำงานสอดคล้องและครอบคลุมข้อกำหนดทั้งหมด โปรดอ้างอิงรายการความรับผิดชอบด้านล่างนี้:

1. **การตรวจสอบจำนวนผู้เล่นและจำนวนไพ่ (Player and Card Quantities)**
   - **ข้อกำหนด:** จำนวนผู้เล่นและจำนวนไพ่ต่อผู้เล่น ต้องเป็นตัวเลขจำนวนเต็มบวกเท่านั้น
   - **Schema ที่รับผิดชอบ:** `positiveSafeIntSchema` (ทดสอบใน 1.6)
   - **Core Test ที่อ้างอิง:** 9.1 `dealCards` (ตรวจสอบกรณีค่าติดลบ หรือค่าน้อยกว่าศูนย์)
   - **สถานะปัจจุบัน:** ชุดทดสอบพร้อมใช้งาน (รอการเชื่อมต่อ Validation จากทีมพัฒนา)

2. **การตรวจสอบความถูกต้องของเงินกองกลาง (Pot Amount Validation)**
   - **ข้อกำหนด:** เงินกองกลางสามารถมีค่าเป็นศูนย์ (0) หรือมากกว่าได้ โดยต้องเป็นตัวเลขจำนวนเต็ม
   - **Schema ที่รับผิดชอบ:** `nonNegativeSafeIntSchema` (ทดสอบใน 1.7)
   - **Core Test ที่อ้างอิง:** 8.2 ตรวจสอบกรณีที่ Pot เป็น 0 แต่มีผู้ชนะ
   - **สถานะปัจจุบัน:** ชุดทดสอบพร้อมใช้งาน (รอการเชื่อมต่อ Validation จากทีมพัฒนา)

3. **การตรวจสอบขนาดของมือไพ่ (Hand Size Validation)**
   - **ข้อกำหนด:** ผู้เล่นแต่ละคนจะต้องถือไพ่ในมือจำนวน 3 ใบถ้วน
   - **Schema ที่รับผิดชอบ:** `evaluateHandInputSchema` (ทดสอบใน 4.2)
   - **Core Test ที่อ้างอิง:** 9.2 `evaluateHand` (ตรวจสอบกรณีที่ไพ่มีเพียง 1 ใบ หรือมีจำนวนเกินกำหนด)
   - **สถานะปัจจุบัน:** ชุดทดสอบพร้อมใช้งาน (รอการเชื่อมต่อ Validation จากทีมพัฒนา)

4. **การตรวจสอบความซ้ำซ้อนของข้อมูลผู้เล่น (Player ID Uniqueness)**
   - **ข้อกำหนด:** รหัสประจำตัว (ID) ของผู้เล่นแต่ละคนในวงต้องไม่ซ้ำซ้อนกัน
   - **Schema ที่รับผิดชอบ:** `getWinnersInputSchema` (ทดสอบใน 6.3)
   - **Core Test ที่อ้างอิง:** 9.4 `getWinners` (ตรวจสอบกรณีที่พบ ID ของผู้เล่นซ้ำกัน)
   - **สถานะปัจจุบัน:** ชุดทดสอบพร้อมใช้งาน (รอการเชื่อมต่อ Validation จากทีมพัฒนา)

5. **การตรวจสอบความซ้ำซ้อนของไพ่ในระบบ (Card Uniqueness)**
   - **ข้อกำหนด:** ห้ามมีไพ่ใบเดียวกันปรากฏซ้ำซ้อนกันในระบบ (ทั้งภายในสำรับเดียวกัน ภายในมือเดียวกัน และห้ามซ้ำข้ามมือผู้เล่นในฟังก์ชัน `getWinners`) อย่างไรก็ตาม ฟังก์ชัน `compareHands` ได้รับการยกเว้นให้สามารถรับมือไพ่ที่เป็นอิสระต่อกัน (ซ้ำกันได้) เนื่องจากการเปรียบเทียบถูกประเมินแยกฝั่ง
   - **Schema ที่รับผิดชอบ:** `getWinnersInputSchema` (ทดสอบใน 6.4)
   - **Core Test ที่อ้างอิง:** 9.4 `getWinners` (ตรวจสอบกรณีที่ไพ่ใบเดียวกันถูกแจกให้ผู้เล่นมากกว่าหนึ่งคน)
   - **สถานะปัจจุบัน:** ชุดทดสอบพร้อมใช้งาน (รอการเชื่อมต่อ Validation จากทีมพัฒนา)

6. **การตรวจสอบค่าฟังก์ชันสุ่มตัวเลข (RNG Value Validation)**
   - **ข้อกำหนด:** ค่าที่ได้รับจากฟังก์ชันสุ่มจะต้องมีค่าตั้งแต่ 0 ขึ้นไป และน้อยกว่า 1 เสมอ (ช่วง [0, 1))
   - **Schema ที่รับผิดชอบ:** `rngValueSchema` (ทดสอบใน 1.8 และ 1.9)
   - **Core Test ที่อ้างอิง:** 9.6 `shuffleDeck` (ตรวจสอบกรณีค่า RNG ผิดขอบเขตหรือผิดประเภท)
   - **สถานะปัจจุบัน:** ชุดทดสอบพร้อมใช้งาน (รอการเชื่อมต่อ Validation จากทีมพัฒนา)

7. **ความเป็นอิสระของข้อมูลสำรับไพ่ (Reference Independence)**
   - **ข้อกำหนด:** การสร้างสำรับไพ่ใหม่แต่ละครั้ง จะต้องคืนค่าเป็นออบเจกต์ที่แยกขาดจากกัน (Deep Clone) ห้ามใช้ Reference อ้างอิงหน่วยความจำเดียวกัน
   - **Schema ที่รับผิดชอบ:** บังคับใช้ในฝั่ง Core Logic (`createDeck`)
   - **Core Test ที่อ้างอิง:** 3.1.2 ตรวจสอบการสร้างสำรับสองครั้ง ว่าออบเจกต์ภายในเป็นคนละ Reference กัน
   - **สถานะปัจจุบัน:** ผ่านการทดสอบเรียบร้อยแล้ว (อัปเดตสมบูรณ์)

8. **การจำกัดโครงสร้างไพ่ (Strict Card Schema)**
   - **ข้อกำหนด:** ออบเจกต์ไพ่จะต้องประกอบด้วยฟิลด์ `suit` และ `rank` เท่านั้น ไม่อนุญาตให้มีฟิลด์ส่วนเกินอื่นๆ แฝงเข้ามาในระบบ
   - **Schema ที่รับผิดชอบ:** `cardSchema` (ทดสอบใน 1.4)
   - **Core Test ที่อ้างอิง:** 9.2 `evaluateHand` (ตรวจสอบการปฏิเสธออบเจกต์ไพ่ที่มีฟิลด์ส่วนเกิน)
   - **สถานะปัจจุบัน:** ชุดทดสอบพร้อมใช้งาน (รอการเชื่อมต่อ Validation จากทีมพัฒนา)

9. **การป้องกันข้อมูลตัวเลขผิดประเภท (Type Safety for Numbers)**
   - **ข้อกำหนด:** ตัวเลขที่รับเข้ามาในระบบจะต้องเป็นตัวเลขทางคณิตศาสตร์ที่ถูกต้อง ห้ามเป็น `NaN`, `Infinity`, `-Infinity` หรือข้อความ (String)
   - **Schema ที่รับผิดชอบ:** `positiveSafeIntSchema` และ `nonNegativeSafeIntSchema` (ทดสอบใน 1.6 และ 1.7)
   - **Core Test ที่อ้างอิง:** 9.1 `dealCards` และ 9.5 `calculateSplitPot` (ตรวจสอบการรับค่าขอบเขตตัวเลขที่ไม่ปลอดภัย)
   - **สถานะปัจจุบัน:** ชุดทดสอบพร้อมใช้งาน (รอการเชื่อมต่อ Validation จากทีมพัฒนา)

10. **ความแม่นยำในการแบ่งเศษชิปรางวัล (Split Pot Remainder Distribution)**
    - **ข้อกำหนด:** หากยอดเงินกองกลางไม่สามารถหารลงตัวด้วยจำนวนผู้ชนะได้ เศษชิปที่เหลือจะต้องถูกแบ่งจ่ายเป็นจำนวนเต็มให้แก่ผู้เล่นในลำดับแรกๆ อย่างถูกต้อง
    - **Schema ที่รับผิดชอบ:** บังคับใช้ในฝั่ง Core Logic (`calculateSplitPot`)
    - **Core Test ที่อ้างอิง:** 8.4 ตรวจสอบว่าเศษชิปถูกปัดเป็นจำนวนเต็มและแบ่งให้ผู้เล่นถูกต้อง
    - **สถานะปัจจุบัน:** ผ่านการทดสอบเรียบร้อยแล้ว (อัปเดตสมบูรณ์)

11. **การปกป้องข้อมูลไม่ให้ถูกดัดแปลง (Immutability)**
    - **ข้อกำหนด:** ข้อมูลขาเข้า (Input) ที่เป็นอาร์เรย์หรือออบเจกต์ จะต้องไม่ถูกดัดแปลง แก้ไข หรือเรียงลำดับใหม่ (Sort) จากภายในฟังก์ชันโดยเด็ดขาด
    - **Schema ที่รับผิดชอบ:** บังคับใช้ในฝั่ง Core Logic ทุกฟังก์ชันที่มีรับค่า Reference Type
    - **Core Test ที่อ้างอิง:** ตรวจสอบร่วมในฟังก์ชัน 3.5 `dealCards`, 6.8 `compareHands`, 7.3 `getWinners` และ 8.6 `calculateSplitPot`
    - **สถานะปัจจุบัน:** ผ่านการทดสอบเรียบร้อยแล้ว (อัปเดตสมบูรณ์)

## คำสั่งสำหรับรันการทดสอบ (Test & Lint Commands)

เพื่ออำนวยความสะดวกให้ทีมพัฒนาสามารถตรวจสอบความถูกต้องของโค้ดระหว่างและหลังการเชื่อม Validation สามารถรันคำสั่งเหล่านี้ผ่าน Terminal:

1. **รัน Schema Tests** (ยืนยันโครงสร้าง Schema)
   ```bash
   bun test Test/core/gameSchema.test.ts
   ```
2. **รัน Core Logic Tests** (ยืนยันว่าโค้ดหลักทำงานถูกต้องและดักจับ Error ได้)
   ```bash
   bun run test:logic
   ```
3. **ตรวจสอบ Typescript (Static Analysis)**
   ```bash
   tsc --noEmit
   ```
4. **ตรวจสอบ ESLint**
   ```bash
   eslint src Test
   ```
