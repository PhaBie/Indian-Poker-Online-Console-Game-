# Test Directory Structure

โครงสร้างของโฟลเดอร์ Test ถูกจัดกลุ่มให้ตรงกับโครงสร้างของซอร์สโค้ด เพื่อให้อ่านง่ายและรู้ขอบเขตของแต่ละไฟล์ได้อย่างชัดเจน โดยแยกตามฝั่ง Server และ Client ดังนี้ (หากดูใน VScode โปรดกด CTRL + SHIFT + V เพื่อดูเอกสารนี้ เพราะจะได้อ่านง่ายๆ)

## โครงสร้าง

<!-- prettier-ignore -->
```bash
Test/
├── server/                                         # การทดสอบส่วน Backend ทั้งหมด
│   ├── server.test.ts                              # ทดสอบการทำงานของ Server หลักและการเชื่อมต่อเริ่มต้น
│   │
│   ├── core/                                       # ระบบ Core Logic และ Schema กลาง
│   │   ├── gameSchema.test.ts                      # ตรวจสอบโครงสร้างข้อมูล (Zod Schema) ของระบบ
│   │   └── gameLogic/                              # กติกาเกม โป๊กเกอร์
│   │       ├── gameLogic.deck.test.ts              # การจัดการสำรับไพ่ สับไพ่ และแจกไพ่
│   │       ├── gameLogic.evaluateHand.test.ts      # การประเมินอันดับไพ่ (เช่น ตอง, เรียง, สี)
│   │       ├── gameLogic.compareHands.test.ts      # การเปรียบเทียบไพ่ 2 มือว่าใครชนะ
│   │       ├── gameLogic.getWinners.test.ts        # การหาผู้ชนะจากผู้เล่นทั้งหมดในรอบ
│   │       └── gameLogic.calculateSplitPot.test.ts # การคำนวณแบ่งกองกลางและจัดการเศษชิปเมื่อเสมอ
│   │
│   ├── domain/                                     # การทดสอบ Model และ Business Logic หลัก
│   │   ├── room.test.ts                            # ลอจิกการจัดการภายในห้อง (เพิ่มผู้เล่น, ตั้งค่าห้อง)
│   │   ├── roomManager.test.ts                     # ลอจิกการจัดการหลายๆ ห้องในระบบ (ค้นหา, สร้างห้องใหม่)
│   │   ├── gameState/                              # State ของเกม ไหลตั้งแต่เกิดจนจบ
│   │   │   ├── fixtures/
│   │   │   │   └── gameState.fixture.ts            # ตัวสร้างข้อมูล Mock เฉพาะของ GameState
│   │   │   ├── gameState.actions.test.ts           # สิทธิ์ทำรายการ, FOLD, SEEN, แอคชันผิดเทิร์น
│   │   │   ├── gameState.call.test.ts              # ลอจิกและขอบเขตเงื่อนไขการ CALL
│   │   │   ├── gameState.bet.test.ts               # ลอจิกและขอบเขตเงื่อนไขการ BET
│   │   │   ├── gameState.raise.test.ts             # ลอจิก, ขอบเขตการ RAISE และป้องกันการระบุจำนวนเงินผิดปกติ (Overflow)
│   │   │   ├── gameState.show.test.ts              # การขอ SHOW, Sideshow และจ่ายค่าธรรมเนียมเปรียบเทียบไพ่
│   │   │   ├── gameState.settlement.test.ts        # การจบเกม หาผู้ชนะ แจกรางวัล และแบ่งกองกลาง
│   │   │   ├── gameState.lifecycle.test.ts         # วงจรเกม เช่น หมุนเทิร์น หมุนดีลเลอร์ ตรวจสอบคนหลุด
│   │   │   └── gameState.flow.test.ts              # พฤติกรรมข้ามรอบ (จำลองเหตุการณ์หลายตาต่อเนื่อง)
│   │   ├── player/                                 # การจัดการสถานะของ Player
│   │   │   ├── player.cards.test.ts                # การจัดการไพ่ในมือผู้เล่น (ดูไพ่, ทิ้งไพ่)
│   │   │   ├── player.lifecycle.test.ts            # สถานะวงจรชีวิตของผู้เล่น (รอ, กำลังเล่น, แพ้)
│   │   │   ├── player.money.test.ts                # การจัดการชิปและเงินเดิมพันของผู้เล่น
│   │   │   └── player.serialization.test.ts        # การแปลงข้อมูล Player เป็น JSON (ซ่อนไพ่สำหรับ Public)
│   │   └── helpers/                                # Helper ฟังก์ชันส่วนกลางระดับ Domain
│   │       └── expectGameErrorWithCode.ts          # ฟังก์ชันช่วยดักจับและตรวจสอบ GameError เฉพาะจุด
│   │
│   ├── infrastructure/                             # ระบบที่ต่อกับภายนอก (File System)
│   │   └── storageManager.test.ts                  # การบันทึกและอ่านสถานะห้อง (Room State) ลงไฟล์ JSON
│   │
│   ├── network/                                    # การจัดการ Socket ฝั่ง Server
│   │   └── socketHandler.test.ts                   # รับส่ง Event ระหว่าง Server และ Client
│   │
│   └── utils/                                      # Helper ฟังก์ชันทั่วไป
│       └── helpers.test.ts                         # ฟังก์ชันอรรถประโยชน์เสริม
│
└── client/                                         # การทดสอบฝั่ง Frontend / Client
    └── network/                                    # การเชื่อมต่อ Socket ฝั่ง Client
        └── socketClient.test.ts                    # การยิง Event และตอบสนองจากฝั่ง Client
```

## วิธีรันการทดสอบ

โปรเจกต์นี้ใช้ `bun test` เป็นตัวรันหลัก สามารถรันแยกกลุ่มได้ด้วยคำสั่งใน `package.json` ดังนี้:

- รันทั้งหมด: `bun test`
- ฝั่ง Server ทั้งหมด: `bun run test:server`
- ฝั่ง Client ทั้งหมด: `bun run test:client`
- เฉพาะ GameLogic: `bun run test:logic`
- เฉพาะ GameState: `bun run test:game-state`
- เฉพาะ Schema: `bun run test:schema`

ถ้าต้องการเจาะจงไฟล์ สามารถรันผ่าน path ได้โดยตรง:

```bash
bun test ./Test/server/domain/player/player.money.test.ts
```
