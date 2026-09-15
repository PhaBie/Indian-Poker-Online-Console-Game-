# Test Directory Structure

โครงสร้างของโฟลเดอร์ Test ถูกจัดกลุ่มให้ตรงกับโครงสร้างของซอร์สโค้ด เพื่อให้อ่านง่ายและรู้ขอบเขตของโฟลเดอร์ได้อย่างชัดเจน (หากดูใน VScode โปรดกด CTRL + SHIFT + V เพื่อดูเอกสารนี้ เพราะจะได้อ่านง่ายๆ)

## 1. โครงสร้าง

<!-- prettier-ignore -->
\`\`\`bash
Test/
├── server/
│   ├── core/             # กติกาไพ่และ Schema
│   ├── domain/
│   │   ├── gameState/    # การดำเนินเกมและจ่ายรางวัล
│   │   ├── player/       # เงิน ไพ่ และสถานะผู้เล่น
│   │   └── helpers/      # ฟังก์ชันช่วยตรวจผลร่วมกัน
│   ├── infrastructure/   # บันทึกและโหลดไฟล์ JSON
│   ├── network/          # การจัดการข้อความฝั่ง Server
│   └── utils/            # ฟังก์ชันทั่วไป
└── client/
    └── network/          # การเชื่อมต่อฝั่ง Client
\`\`\`

_เทสต์ Room และ RoomManager อยู่ใน `server/domain/` ส่วนเทสต์เริ่มและหยุด Server อยู่ที่ `server/server.test.ts`_

## 2. วิธีรันการทดสอบ

โปรเจกต์นี้ใช้ `bun test` เป็นตัวรันหลัก สามารถรันแยกกลุ่มได้ด้วยคำสั่งใน `package.json` ดังนี้:

- รันทั้งหมด: `bun run test` (หรือ `bun test`)
- ฝั่ง Server ทั้งหมด: `bun run test:server`
- ฝั่ง Client ทั้งหมด: `bun run test:client`
- เฉพาะ Player: `bun run test:player`
- เฉพาะ GameState: `bun run test:game-state`
- เฉพาะ GameLogic: `bun run test:logic`
- เฉพาะ Schema: `bun run test:schema`

ถ้าต้องการเจาะจงไฟล์ สามารถรันผ่าน path ได้โดยตรง เช่น:
\`\`\`bash
bun test ./Test/server/domain/player/player.money.test.ts
\`\`\`

## 3. ข้อควรรู้

- `fixtures/` ใช้เตรียมข้อมูลตั้งต้นสำหรับทดสอบ (Instance จริง ไม่ใช่ Mock) ส่วน `helpers/` ใช้ช่วยตรวจผล
- เทสต์ GameState แยกตามพฤติกรรม เช่น `CALL`, `BET`, `RAISE` และ `SHOW`
- `flow` เป็นการจำลองหลายคำสั่งต่อเนื่องภายในรอบ
- `player.cards` เป็นการทดสอบรับไพ่ ดูไพ่ และคืนข้อมูลไพ่
- การเปรียบเทียบไพ่ `Sideshow` ยังอยู่ในสถานะ Skip พักไว้หลังเดโม
- ข้อกำหนดและเงื่อนไขทั้งหมดของ GameState ให้อ่านต่อจาก `Documentation/gameState-contract.md`
