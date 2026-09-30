# โครงสร้างโฟลเดอร์หลัก (Code Map / Project Structure)

คู่มือสำหรับหาตำแหน่งไฟล์ในโปรเจกต์ หากคุณต้องการแก้ส่วนไหน สามารถดูโครงสร้างอ้างอิงนี้ได้เลย

```text
Indian-Poker-Online-Console-Game-/
├── .github/                           # CI/CD Workflows และ GitHub Configurations
├── .husky/                            # Git Hooks สำหรับตรวจสอบโค้ดก่อน Commit
├── .prettierignore                    # รายการยกเว้นการจัดรูปแบบของ Prettier
├── .prettierrc                        # การตั้งค่า Prettier Code Formatter
├── 01-Source-code/                    # โค้ดหลัก
│   ├── client/                        # ส่วนทำงานฝั่งผู้เล่น (UI Terminal)
│   │   ├── assets/                    # ไฟล์ Assets และ Resource
│   │   ├── audio/                     # จัดการระบบเสียง
│   │   ├── data/                      # ไฟล์ข้อมูลตั้งค่าของไคลเอนต์
│   │   ├── network/                   # SocketClient จัดการ WebSocket ฝั่ง Client
│   │   ├── shared/                    # ไฟล์ Utilities และของที่ใช้ร่วมกันในไคลเอนต์
│   │   ├── state/                     # จัดการสถานะในไคลเอนต์
│   │   ├── ui/                        # ส่วนประกอบของ UI ด้วย React + Ink
│   │   │   ├── navigation/            # ระบบสลับหน้าจอ
│   │   │   ├── screens/               # หน้าจอต่างๆ เช่น lobby, game, result
│   │   │   └── shared/                # Components, Hooks, Theme, Windows
│   │   ├── config.ts                  # ไฟล์คอนฟิก
│   │   ├── index.ts                   # Entry point ฝั่งไคลเอนต์
│   │   └── previewGame.tsx            # โหมดพรีวิว UI เดี่ยว
│   ├── server/                        # ส่วนเซิร์ฟเวอร์
│   │   ├── core/                      # ระบบกติกาเกม (Game Logic)
│   │   ├── data/                      # เก็บไฟล์ข้อมูล (Generated, Runtime)
│   │   ├── domain/                    # โมเดลหลัก, Service, Errors
│   │   ├── network/                   # จัดการ WebSocket ฝั่ง Server (Handler, AccessPolicy)
│   │   ├── index.ts                   # Entry point เซิร์ฟเวอร์ Local
│   │   └── online.ts                  # Entry point เซิร์ฟเวอร์ Online (Ngrok)
│   └── shared/                        # สิ่งที่แชร์ให้ทั้ง Client และ Server (Types, Constants)
├── 02-Tests/                          # โฟลเดอร์รวม Unit และ Integration Tests
├── 03-Documentation/                  # โฟลเดอร์รวมเอกสาร
│   └── docs/                          # เอกสารคู่มืออธิบายระบบ (ที่คุณกำลังอ่านอยู่)
├── 04-Demo/                           # ไฟล์ Demo ของโปรเจกต์
├── README.md                          # เอกสารแนะนำโปรเจกต์ (หน้าหลัก)
├── bun.lock                           # Lockfile ของแพ็กเกจ
├── eslint.config.mjs                  # ตั้งค่า ESLint
├── package.json                       # สคริปต์รันโปรเจกต์และ Dependency
└── tsconfig.json                      # การตั้งค่า TypeScript
```

## คำแนะนำการค้นหาไฟล์

- **ถ้าจะแก้หน้าตา UI, ปุ่ม, สีสัน:** ไปที่ `01-Source-code/client/ui/`
- **ถ้าจะแก้กติกาเกม หรือวิธีคำนวณเงิน:** ไปที่ `01-Source-code/server/core/`
- **ถ้าจะแก้ระบบส่งข้อมูลผ่านเน็ต:** ไปที่ `01-Source-code/server/network/` และ `01-Source-code/client/network/`
- **ถ้าเพิ่ม Type ตัวแปรใหม่ที่ใช้ร่วมกัน:** ไปที่ `01-Source-code/shared/`
