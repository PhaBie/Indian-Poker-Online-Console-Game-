# Testing Guide (วิธีการทดสอบระบบ)

ส่วนสำคัญของเกมอย่าง GameState และ Core Logic ได้รับการออกแบบให้ง่ายต่อการทดสอบ โดยต้องมี Unit Test คลุมทั้ง:

- **Happy Path:** กรณีที่ทำงานปกติ
- **Unhappy Path:** กรณีเกิดข้อผิดพลาด ข้อมูลไม่ถูกต้อง หรือ Edge case

## โครงสร้างของโฟลเดอร์ Test

จัดกลุ่มให้ตรงกับโครงสร้างของซอร์สโค้ด เพื่อให้อ่านง่าย:

```text
02-Tests/
├── server/                 # การทดสอบส่วน Backend ทั้งหมด
│   ├── core/               # ระบบ Core Logic และ Schema กลาง
│   ├── domain/             # การทดสอบ Model และ Business Logic หลัก
│   └── network/            # การจัดการ Socket ฝั่ง Server
│
├── client/                 # การทดสอบฝั่ง Frontend / Client
│   ├── audio/              # ทดสอบระบบเสียง
│   ├── network/            # การเชื่อมต่อ Socket ฝั่ง Client
│   ├── state/              # การทดสอบการจัดการสถานะในไคลเอนต์
│   └── ui/                 # ทดสอบ UI Components และ Navigation
│
└── shared/                 # ทดสอบส่วนที่ใช้ร่วมกันระหว่าง Client และ Server
```

## คำสั่งสำหรับรันการทดสอบ

โปรเจกต์นี้ใช้ `bun test` เป็นตัวรันหลัก สามารถรันแยกกลุ่มได้ด้วยคำสั่งใน `package.json`

- **รันทั้งหมด:** `bun test` หรือ `bun run test`
- **ฝั่ง Server ทั้งหมด:** `bun run test:server`
- **ฝั่ง Client ทั้งหมด:** `bun run test:client`
- **เฉพาะส่วนผู้เล่น (Player):** `bun run test:player`
- **เฉพาะสถานะเกม (GameState):** `bun run test:game-state`
- **เฉพาะกติกาเกม (GameLogic):** `bun run test:logic`
- **เฉพาะ Schema:** `bun run test:schema`
- **เฉพาะ Validator:** `bun run test:validator`

**การรันเจาะจงไฟล์:**
หากต้องการทดสอบแค่ไฟล์เดียว สามารถเรียก path ตรงๆ ได้เลย เช่น:

```bash
bun test ./02-Tests/server/domain/player/player.money.test.ts //ตัวอย่าง
```
