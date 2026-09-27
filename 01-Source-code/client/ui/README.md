# React + Ink UI Architecture

โครงสร้างส่วนติดต่อผู้ใช้ (Console UI) พัฒนาด้วย React และ Ink โดยใช้สถาปัตยกรรม Feature-First Colocation เพื่อรวมคอมโพเนนต์ ฮุก และตัวช่วยที่เกี่ยวข้องกับแต่ละฟีเจอร์ไว้ด้วยกัน

## คำสั่งการทำงาน (Scripts)

### การรันแอปพลิเคชัน

- `bun run dev`: เริ่มต้นรันไคลเอนต์เกมตามขั้นตอนปกติ (เริ่มตั้งแต่หน้า Intro Splash, การตั้งชื่อ, เมนูหลัก และการเข้าห้อง)
- `bun run dev:game`: รันโหมดดูตัวอย่างและทดสอบโต๊ะเกม (`GamePreview`) แบบโลคัลได้ทันทีโดยไม่ต้องเปิดเซิร์ฟเวอร์ (รองรับ `bun run dev:game:2`, `:3`, `:4` ตามจำนวนผู้เล่น)

### การทดสอบ (Testing)

- `bun test ./02-Tests/client/ui`: รันชุดการทดสอบเฉพาะส่วนติดต่อผู้ใช้ (UI) ทั้งหมด (ตำแหน่งไฟล์ทดสอบอยู่ที่ `02-Tests/client/ui/`)
- `bun test ./02-Tests`: รันชุดการทดสอบทั้งหมดของทั้งโปรเจกต์

---

## โครงสร้างไดเรกทอรี UI

```text
01-Source-code/client/ui/
├── App.tsx                     # Root Ink component จัดการ route และ render หน้าจอตามสถานะ
├── navigation/                 # ระบบ Navigation (useAppNavigation, useNavigationHandlers, navigationActions)
├── screens/                    # หน้าจอเกมแยกตามฟีเจอร์ (Feature Folders)
│   ├── intro/                  # หน้าเปิดตัวและการต่อกลับ (GameIntroSplash.tsx, ReconnectPromptScreen.tsx)
│   ├── mainMenu/               # หน้าเมนูหลัก (MainMenuScreen, MainMenuCards, useMainMenuInput)
│   ├── createRoom/             # หน้าสร้างห้อง (CreateRoomScreen.tsx, useCreateRoomController)
│   ├── joinRoom/               # หน้าเข้าร่วมห้อง (JoinRoomScreen.tsx)
│   ├── username/               # หน้าตั้งชื่อผู้ใช้ (EnterUsernameScreen, useUsernameInput)
│   ├── server/                 # หน้าเชื่อมต่อเซิร์ฟเวอร์แบบกำหนดเอง (ServerConnectionScreen.tsx)
│   ├── onlineConnection/       # หน้าเชื่อมต่อเซิร์ฟเวอร์ออนไลน์ (OnlineConnectionScreen, useOnlineConnection)
│   ├── roomBrowser/            # หน้ารายการห้อง (RoomBrowserScreen, RoomBrowserTable)
│   ├── waitingRoom/            # หน้าห้องพักรอ (WaitingRoomScreen, WaitingRoomPlayerList, ...)
│   ├── game/                   # หน้าเล่นเกมหลักและโหมดดูตัวอย่าง (GameScreen, GameTableLayout, GameActionsPanel,
│   │                           #   GameRoundResultDialog, GamePreview, gamePreviewFixture, ...)
│   └── RoundResultScreen.tsx   # หน้าสรุปผลรูปแบบเดิม เก็บไว้ดูแนวทางก่อนเปลี่ยนมาใช้ไดอะล็อก
├── shared/                     # ทรัพยากรส่วนกลางของ UI
│   ├── components/             # คอมโพเนนต์ที่ใช้ร่วมกัน (ScreenSizeGuard, ShimmeringHeader)
│   ├── hooks/                  # Custom hooks ส่วนกลาง (useTerminalSize, useClientState)
│   ├── layout/                 # โครงสร้าง Layout กลาง (gameContainerLayout.ts, terminalRequirements.ts)
│   ├── theme/                  # ค่ารูปแบบ สี และตัววัด (colors.ts)
│   └── windows/                # ตัวควบคุมหน้าต่าง Windows FFI (windowsTerminalWindow.ts)
├── GameUI.ts                   # โครงคลาส UI เกมยุคเริ่มต้น ยังไม่ได้พัฒนาเป็นหน้าจอใช้งาน
└── LobbyUI.ts                  # โครงคลาส UI ห้องพักยุคเริ่มต้น ยังไม่ได้พัฒนาเป็นหน้าจอใช้งาน
```

---

## ส่วนสำคัญของสถาปัตยกรรมและเหตุผล (Key Architecture Components)

| ส่วนสำคัญ                                                                                     | เหตุผลและหน้าที่ในสถาปัตยกรรม                                                                                                                                                                                                       |
| :-------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`App.tsx` และ `navigation/`**                                                               | เป็นศูนย์กลางการเลือกหน้าจอ (Root Router) และเปลี่ยนหน้าตามสถานะเกม ช่วยให้ผู้พัฒนาทราบจุดเริ่มต้นของแอปพลิเคชันและติดตามเส้นทางการทำงาน (Navigation Flow) ได้ถูกต้อง                                                               |
| **ทิศทางข้อมูล (`ClientState` → `useClientState` → หน้าจอ และคำสั่งจาก UI → `SocketClient`)** | กำหนดทิศทางการไหลของข้อมูลแบบทางเดียว (Unidirectional Data Flow) เพื่อป้องกันการใส่ตรรกะเครือข่ายหรือการตัดสินผลเกมผิดชั้น (Separation of Concerns)                                                                                 |
| **การต่อกลับเข้าเกมใน `useAppNavigation`**                                                    | ควบคุมทั้งข้อมูลเซสชันเดิม (`reconnectToken`), การสอบถามผู้เล่นผ่าน `ReconnectPromptScreen`, และการเปลี่ยนหน้าจอตามผลลัพธ์ ซึ่งเป็นลำดับที่มีความละเอียดอ่อนและส่งผลกระทบต่อหลายหน้าจอ                                              |
| **`screens/game/` และ `GameRoundResultDialog`**                                               | เป็นส่วนที่มีความซับซ้อนสูงสุดใน UI รวบรวมการจัดการสถานะเทิร์น, การแสดงไพ่ (คว่ำ/หงาย/แสงกะพริบ), แอนิเมชันเปิดโต๊ะ, พาเนลสั่งการ, และไดอะล็อกสรุปผลลัพธ์รอบเกมแบบโอเวอร์เลย์                                                       |
| **`GamePreview` และ `gamePreviewFixture`**                                                    | เป็นโหมดจำลองเกมแบบโลคัลสมบูรณ์ (Offline Simulation) สำหรับทดสอบ UI โดยไม่ต้องต่อเซิร์ฟเวอร์จริง จึงเป็นข้อยกเว้นที่ต้องระบุให้ชัดเจนจากหลักการทั่วไปที่ระบุว่าตรรกะเกมอยู่ฝั่งเซิร์ฟเวอร์                                          |
| **`shared/components`, `shared/hooks`, `shared/windows`**                                     | กำหนดเกณฑ์ขนาดเทอร์มินัลขั้นต่ำ (`terminalRequirements`), Hook ตรวจวัดขนาดหน้าต่างแบบเรียลไทม์ (`useTerminalSize`), และการขยายหน้าต่าง/ลดขนาดฟอนต์บน Windows ผ่าน FFI (`windowsTerminalWindow`) ซึ่งส่งผลต่อการเรนเดอร์ของทุกหน้าจอ |

---

## ไฟล์ UI รุ่นก่อนที่เก็บไว้เป็นข้อมูลอ้างอิง

`RoundResultScreen.tsx` เป็นหน้าสรุปผลรูปแบบเดิมที่แยกจากโต๊ะเกม ปัจจุบันเส้นทางแสดงผลใช้ `GameScreen.tsx` ร่วมกับ `GameRoundResultDialog.tsx` เพื่อแสดงผลรอบเกมเป็นหน้าต่างซ้อนบนโต๊ะ จึงไม่มีการเรียกใช้ `RoundResultScreen.tsx` ในเส้นทางรันปัจจุบัน

`GameUI.ts` และ `LobbyUI.ts` เป็นโครงคลาสจากช่วงเริ่มต้นของโปรเจกต์ เมธอดแสดงผลและรับคำสั่งยังไม่ได้พัฒนาให้ทำงานจริง และไม่มีการเรียกใช้ในเส้นทางรันปัจจุบัน

ทีมเก็บไฟล์ทั้งสามไว้เพื่อศึกษาแนวทางและลำดับการพัฒนา UI ไม่ใช่ส่วนที่ต้องแก้เมื่อปรับพฤติกรรมหน้าจอปัจจุบัน
