# Test Directory Structure

โครงสร้างของโฟลเดอร์ Test ถูกจัดกลุ่มให้ตรงกับโครงสร้างของซอร์สโค้ด เพื่อให้อ่านง่ายและรู้ขอบเขตของแต่ละไฟล์ได้อย่างชัดเจน โดยแยกตามฝั่ง Server และ Client ดังนี้

## โครงสร้าง

```text
Test/
├── server/                 # การทดสอบส่วน Backend ทั้งหมด
│   ├── core/               # ระบบ Core Logic และ Schema กลาง
│   │   └── gameLogic/      # กติกาเกม โป๊กเกอร์
│   ├── domain/             # การทดสอบ Model และ Business Logic หลัก
│   │   ├── gameState/      # State ของเกม ไหลตั้งแต่เกิดจนจบ
│   │   │   └── fixtures/   # ตัวสร้างข้อมูล Mock เฉพาะของ GameState
│   │   └── ...
│   ├── infrastructure/     # ระบบที่ต่อกับภายนอก เช่น Database, Storage
│   ├── network/            # การจัดการ Socket ฝั่ง Server
│   └── utils/              # Helper ฟังก์ชันต่างๆ
│
└── client/                 # การทดสอบฝั่ง Frontend / Client
    └── network/            # การเชื่อมต่อ Socket ฝั่ง Client
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
