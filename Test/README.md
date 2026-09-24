# Test Directory Structure

โครงสร้างของโฟลเดอร์ Test ถูกจัดกลุ่มให้ตรงกับโครงสร้างของซอร์สโค้ด เพื่อให้อ่านง่ายและรู้ขอบเขตของโฟลเดอร์ได้อย่างชัดเจน (หากดูใน VScode โปรดกด CTRL + SHIFT + V เพื่อดูเอกสารนี้ เพราะจะได้อ่านง่ายๆ)

## 1. โครงสร้าง

<!-- prettier-ignore -->
```bash
Test/
├── server/
│   ├── core/             # กติกาไพ่และ Schema
│   ├── domain/
│   │   ├── gameState/    # การดำเนินเกมและจ่ายรางวัล
│   │   ├── player/       # เงิน ไพ่ และสถานะผู้เล่น
│   │   ├── services/     # บริการโดเมน (roomManager.test.ts)
│   │   └── helpers/      # ฟังก์ชันช่วยตรวจผลร่วมกัน
│   ├── infrastructure/   # บันทึกและโหลดไฟล์ JSON
│   └── network/          # การจัดการข้อความฝั่ง Server, Validator และ Network Helpers
├── client/
│   ├── network/          # การเชื่อมต่อฝั่ง Client (SocketClient)
│   ├── state/            # ทดสอบการจัดการสถานะ ClientState
│   └── ui/               # ทดสอบหน้าจอ เมนู และการนำทาง UI
└── shared/
    └── networkMode.test.ts # ทดสอบการกำหนด URL และโหมดเครือข่าย
```

_เทสต์ Room อยู่ใน `server/domain/room.test.ts` และ RoomManager อยู่ใน `server/domain/services/roomManager.test.ts` ส่วนเทสต์เริ่มและหยุด Server อยู่ที่ `server/server.test.ts`_

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

```bash
bun test ./Test/server/domain/player/player.money.test.ts
```

## 3. ข้อควรรู้

- `fixtures/` ใช้เตรียมข้อมูลตั้งต้นสำหรับทดสอบ (Instance จริง ไม่ใช่ Mock) ส่วน `helpers/` ใช้ช่วยตรวจผล
- การจัดกลุ่มเทสต์: `GameState` ถูกแยกตามพฤติกรรม (`CALL`, `BET`, `RAISE`, `SHOW`), ส่วน `flow` ใช้จำลองหลายคำสั่งต่อเนื่องภายในรอบ และ `player.cards` เน้นทดสอบการรับไพ่ ดูไพ่ และคืนข้อมูลไพ่
- ข้อกำหนดและเงื่อนไขของ GameState ให้อ่านจาก `Documentation/contracts/gameState-contract.md` (โดยฟีเจอร์การดวลไพ่ `Sideshow`/`DUEL` ได้รับการตรวจสอบ flow และรักษาความลับของไพ่ Card Privacy ในชุดทดสอบครบถ้วน)
