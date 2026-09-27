# React + Ink UI Architecture

โครงสร้างส่วนติดต่อผู้ใช้ (Console UI) พัฒนาด้วย React และ Ink โดยใช้สถาปัตยกรรม Feature-First Colocation เพื่อรวมคอมโพเนนต์ ฮุก และตัวช่วยที่เกี่ยวข้องกับแต่ละฟีเจอร์ไว้ด้วยกัน

## โครงสร้างไดเรกทอรี UI

```text
src/client/ui/
├── App.tsx                    # Root Ink component จัดการ route และ render หน้าจอตามสถานะ
├── navigation/                # ระบบ Navigation (useAppNavigation, useNavigationHandlers, navigationActions)
├── screens/                   # หน้าจอเกมแยกตามฟีเจอร์ (Feature Folders)
│   ├── intro/                 # หน้า Intro Splash (GameIntroSplash.tsx)
│   ├── mainMenu/              # หน้าเมนูหลัก (MainMenuScreen, MainMenuCards, useMainMenuInput)
│   ├── createRoom/            # หน้าสร้างห้อง (CreateRoomScreen.tsx)
│   ├── joinRoom/              # หน้าเข้าร่วมห้อง (JoinRoomScreen.tsx)
│   ├── username/              # หน้าตั้งชื่อผู้ใช้ (EnterUsernameScreen, useUsernameInput)
│   ├── server/                # หน้าเชื่อมต่อเซิร์ฟเวอร์แบบกำหนดเอง (ServerConnectionScreen.tsx)
│   ├── onlineConnection/      # หน้าเชื่อมต่อเซิร์ฟเวอร์ออนไลน์ (OnlineConnectionScreen, useOnlineConnection)
│   ├── roomBrowser/           # หน้ารายการห้อง (RoomBrowserScreen, RoomBrowserTable)
│   ├── waitingRoom/           # หน้าห้องพักคอย (WaitingRoomScreen, WaitingRoomPlayerList, WaitingRoomSeatRow, ...)
│   ├── game/                  # หน้าเล่นเกมหลัก (GameScreen, GameTableLayout, GameActionsPanel, ...)
│   └── RoundResultScreen.tsx  # [deferred to dead-code audit]
├── shared/                    # ทรัพยากรส่วนกลางของ UI
│   ├── components/            # คอมโพเนนต์ที่ใช้ร่วมกัน (ScreenSizeGuard, ShimmeringHeader)
│   ├── hooks/                 # Custom hooks ส่วนกลาง (useTerminalSize, useClientState)
│   ├── layout/                # โครงสร้าง Layout กลาง (gameContainerLayout.ts)
│   └── theme/                 # ค่ารูปแบบ สี และตัววัด (colors.ts)
├── GameUI.ts                  # [deferred to dead-code audit]
└── LobbyUI.ts                 # [deferred to dead-code audit]
```

## หลักการออกแบบสถาปัตยกรรม (Design Principles)

1. **Feature-First Colocation:** แต่ละฟีเจอร์ (เช่น `game`, `waitingRoom`, `mainMenu`) รวบรวม Components, Hooks, Helpers และ Types เฉพาะของตัวเองไว้ในโฟลเดอร์เดียวกัน ทำให้อ่าน เข้าใจ และแก้ไขได้ง่าย
2. **Shared UI Layer:** ทรัพยากรที่ใช้ร่วมกันระหว่างหลายหน้าจอ เช่น Layout ขนาดคอนเทนเนอร์ (`gameContainerLayout.ts`), สีของธีม (`colors.ts`), และ Guard ตรวจสอบขนาดหน้าจอ (`ScreenSizeGuard.tsx`) จะถูกจัดเก็บไว้ใน `shared/`
3. **Decoupled Navigation:** การเปลี่ยนหน้าจอถูกควบคุมผ่าน Navigation State (`navigation/useAppNavigation.ts`) และ Actions (`navigation/navigationActions.ts`) โดยไม่ผูกติดกับคอมโพเนนต์ใดคอมโพเนนต์หนึ่งโดยเฉพาะ
4. **State Separation:** หน้าจอ UI รับข้อมูลจาก `ClientState` และส่งการกระทำผ่าน `SocketClient` โดยการประมวลผลลอจิกของเกมและการตัดสินผลเป็นหน้าที่ของเซิร์ฟเวอร์
