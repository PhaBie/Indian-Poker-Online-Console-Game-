# Indian Poker Online (Console Game) 🃏

โปรเจกต์เกมไพ่ Indian Poker (Teen Patti) แบบ Multiplayer พัฒนาด้วย TypeScript (ทำงานผ่าน Console / WebSocket)

## 🛠️ เครื่องมือที่ต้องมี (Prerequisites)

ก่อนที่จะเริ่มทำงานกับโปรเจกต์นี้ ทุกคนในทีมต้องติดตั้งโปรแกรมเหล่านี้ในเครื่องก่อน:

1. **Bun**: เครื่องมือรันและจัดการแพ็กเกจที่เร็วมาก (ติดตั้งผ่านคำสั่ง `bun install`) หรือมาดูวิธีติดตั้งได้จากนี้ https://bun.com/
2. **Git**: สำหรับดึงและส่งโค้ด

---

## 🚀 วิธีติดตั้งและรันโปรเจกต์ (Setup Instructions)

**1. โหลดโค้ดลงเครื่อง (ทำแค่ครั้งแรกครั้งเดียว):**

```bash
git clone https://github.com/PhaBie/Indian-Poker-Online-Console-Game-.git
cd Indian-Poker-Online-Console-Game-
```

**2. ติดตั้ง Library ต่างๆ:**
เนื่องจากโปรเจกต์เราใช้ `bun` ให้พิมพ์คำสั่งนี้:

```bash
bun install
```

_(คำสั่งนี้จะไปโหลด `ws`, `@types/ws` และเครื่องมืออื่นๆ ที่จำเป็นมาให้ครบเลยครับ)_

### ดูหน้าเกมเพื่อปรับ UI โดยไม่ต้องเปิดห้อง

```bash
bun run dev:game
```

โหมดนี้ใช้ข้อมูลเกม 2 คนจำลองในเครื่อง ไม่เปิด WebSocket และไม่ต้องสร้างหรือ join ห้อง ต้องใช้ terminal อย่างน้อย 128 x 39

ใช้ `bun run dev:game:2`, `bun run dev:game:3`, หรือ `bun run dev:game:4` เพื่อดู layout ตามจำนวนผู้เล่น

### เพลงประกอบระหว่างเล่น

เมื่อเปิดเกมจริงหรือพรีวิว ไคลเอนต์จะเล่น `Music/Illslick_M_Leg_Indian.mp3` วนที่ระดับเสียงเริ่มต้น 20% และหยุดเมื่อปิดเกม ตัวเล่นเสียงและตัวถอดรหัส MP3 ติดตั้งพร้อม `bun install` โดยไม่ต้องลง `ffplay` เอง มี binary สำเร็จรูปสำหรับ Windows x64, macOS x64/arm64 และ Linux x64/arm64 ที่มีอุปกรณ์เสียง หากเปิดเสียงไม่ได้ เกมยังเล่นได้และจะแสดงข้อผิดพลาด `[Music]`

ปรับเสียงด้วยตัวแปร `POKER_MUSIC_VOLUME` ค่า 0–100 โดย `0` คือปิดเพลง เช่นใน PowerShell:

```powershell
$env:POKER_MUSIC_VOLUME = 8
bun run dev
```

ใช้ `bun run music:check` เพื่อทดลองฟังเพลง 5 วินาทีก่อนเปิดเกม หากคำสั่งนี้ไม่มีเสียง ให้ตรวจอุปกรณ์เสียงและระดับเสียงของระบบ

### run server local / Ngrok (Onlie)

`bun run dev` : รัน server local

## ใช้สำหรับตั้ง powershellโดยไปเอา Key ใน Ngrok มาก่อน

`[Environment]::SetEnvironmentVariable(
  "NGROK_AUTHTOKEN",
  "TOKEN จากหน้า ngrok dashboard",
  "User"
)`

`bun run server:online` : เมื่อตั้งค่าเสร็จแล้ว ก็พิมพ์นี้เพื่อรันเซิฟเวอรื Onlie

มันจะพิมพ์ URL ประมาณนี้: `wss://xxxxx.ngrok-free.app` ให้ส่ง URL นี้ให้เพื่อน แล้วก็รัน `bun run dev` เพื่อเปิดเกมปกติเลย

---

## 🛡️ กฎการทำงานร่วมกันของทีม (Git Workflow)

โปรเจกต์นี้เปิดระบบ **Branch Protection** เอาไว้ เพื่อความปลอดภัย ห้ามใครแก้โค้ดที่สาขา `main` หรือ `demo` ตรงๆ เด็ดขาด!

**ขั้นตอนการทำงาน:**

1. อัปเดตโค้ดล่าสุดเสมอ: `git checkout demo` -> `git pull`
2. สร้างห้องส่วนตัว (Branch) สำหรับฟีเจอร์ที่จะทำ: `git checkout -b feature/ชื่อฟีเจอร์`
3. เขียนโค้ด -> `git add .` -> `git commit -m "ทำอะไรไป"`
4. ส่งขึ้น GitHub: `git push -u origin feature/ชื่อฟีเจอร์`
5. **เปิด Pull Request (PR)** บนเว็บ GitHub เพื่อขอรวมโค้ดเข้า `demo`
6. **ต้องได้รับการอนุมัติ (Approve)** จาก `@PhaBie` หรือ `@thanathonSO` อย่างน้อย 1 เสียง ถึงจะกด Merge ได้!

---

## 📂 โครงสร้างโฟลเดอร์หลัก (Project Structure)

```text
├── .github/                           # CI/CD Workflows และ GitHub Configurations
├── .husky/                            # Git Hooks สำหรับตรวจสอบโค้ดก่อน Commit
├── .prettierignore                    # รายการยกเว้นการจัดรูปแบบของ Prettier
├── .prettierrc                        # การตั้งค่า Prettier Code Formatter
├── Documentation/
│   ├── archive/                       # เอกสารบันทึกประวัติการพัฒนาเดิม
│   ├── contracts/                     # ข้อตกลงสถานะและกติกาเกม (GameState Contract)
│   └── guides/                        # คู่มือการพัฒนาและแบ่งงาน
├── Demo/                              # [deferred to dead-code audit]
├── Music/                             # เพลงประกอบฝั่งไคลเอนต์
├── data/
│   ├── generated/                     # ข้อมูลจำลองที่สร้างโดย GameLogic (simulation.json, gitignored)
│   └── runtime/                       # ประวัติเกมขณะรันระบบ (History.json, gitignored)
├── src/
│   ├── client/
│   │   ├── index.ts                   # Entry point ฝั่งไคลเอนต์
│   │   ├── previewGame.tsx            # โหมดพรีวิว UI เดี่ยว
│   │   ├── config.ts                  # กำหนดค่าการเชื่อมต่อเริ่มต้นของไคลเอนต์
│   │   ├── network/                   # SocketClient จัดการ WebSocket
│   │   ├── state/                     # ClientState จัดการสถานะในไคลเอนต์
│   │   └── ui/
│   │       ├── App.tsx                # Ink Root Component
│   │       ├── GameUI.ts              # [deferred to dead-code audit]
│   │       ├── LobbyUI.ts             # [deferred to dead-code audit]
│   │       ├── navigation/            # ระบบสลับหน้าจอ (useAppNavigation, actions)
│   │       ├── screens/               # หน้าจอเกมแยกตามฟีเจอร์ (Colocated Screens)
│   │       │   ├── intro/
│   │       │   ├── mainMenu/
│   │       │   ├── createRoom/
│   │       │   ├── joinRoom/
│   │       │   ├── username/
│   │       │   ├── server/
│   │       │   ├── onlineConnection/
│   │       │   ├── roomBrowser/
│   │       │   ├── waitingRoom/
│   │       │   ├── game/
│   │       │   └── RoundResultScreen.tsx  # [deferred to dead-code audit]
│   │       └── shared/                # Layout, components, hooks และ theme ส่วนกลางของ UI
│   ├── server/
│   │   ├── index.ts                   # Entry point เซิร์ฟเวอร์ Local
│   │   ├── online.ts                  # Entry point เซิร์ฟเวอร์ Online (Ngrok)
│   │   ├── core/                      # ระบบกติกาเกม (Game Logic) และ Zod Validation
│   │   ├── domain/                    # โดเมนหลัก (Models, Errors, Services: RoomManager)
│   │   ├── network/                   # WebSocket Handlers, Validator, Helpers, AccessPolicy
│   │   ├── infrastructure/            # ระบบบันทึกข้อมูล (StorageManager)
│   │   └── utils/
│   │       └── logger.ts              # [deferred to dead-code audit]
│   └── shared/                        # ค่าคงที่, Types และโมดูลที่ใช้ร่วมกัน (networkMode)
├── Test/                              # ชุดทดสอบครอบคลุมการทำงาน (Unit & Integration Tests)
│   ├── client/                        # ทดสอบฝั่ง Client (network, state, ui)
│   ├── server/                        # ทดสอบฝั่ง Server (core, domain, infrastructure, network)
│   └── shared/                        # ทดสอบโมดูลส่วนกลาง (networkMode)
├── .gitignore                         # รายการไฟล์และโฟลเดอร์ที่ละเว้นจาก Git
├── bun.lock                           # Lockfile สำหรับการติดตั้ง Dependencies ด้วย Bun
├── eslint.config.mjs                  # การตั้งค่า ESLint (Flat Config)
├── package.json                       # รายการ dependencies และ scripts ของโครงการ
├── server.ts                          # [deferred to dead-code audit]
└── tsconfig.json                      # การตั้งค่า TypeScript Compiler
```
