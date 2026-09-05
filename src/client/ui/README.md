# React + Ink UI

โครงสร้างเริ่มต้นสำหรับทีม UI ของโปรเจกต์ ที่ใช้ React + Ink

## โครงสร้างที่เตรียมไว้

```text
src/client/
├── index.ts
├── network/
│   └── socketClient.ts
├── state/
│   └── ClientState.ts
└── ui/
    ├── components/
    ├── screens/
    ├── hooks/
    ├── theme/
    ├── GameUI.ts
    ├── LobbyUI.ts
    └── README.md
```

ไฟล์ `.gitkeep` ทำให้ Git เก็บโฟลเดอร์ว่างเหล่านี้ได้ ลบได้เมื่อเพิ่มไฟล์จริงในโฟลเดอร์นั้น

## หน้าที่ของแต่ละโฟลเดอร์

| โฟลเดอร์ | หน้าที่ | ตัวอย่างไฟล์ที่จะเพิ่มเมื่อเริ่ม implement |
| --- | --- | --- |
| `components/` | ชิ้นส่วนแสดงผลที่รับข้อมูลและ callback ผ่าน props และนำกลับมาใช้ได้ | `CardView.tsx`, `PlayerList.tsx`, `ActionMenu.tsx` |
| `screens/` | หน้าจอหลักที่ประกอบ components และเชื่อมกับ hooks | `LobbyScreen.tsx`, `GameScreen.tsx`, `ResultScreen.tsx` |
| `hooks/` | Custom hooks สำหรับเชื่อม state, subscription และ input เข้ากับ React | `useGameState.ts`, `useSocket.ts`, `useGameInput.ts` |
| `theme/` | ค่าร่วมสำหรับสี ระยะห่าง และรูปแบบแสดงผลใน terminal | `colors.ts`, `spacing.ts` |

เมื่อเริ่ม implement ให้เพิ่ม `ui/App.tsx` เป็น root component สำหรับเลือกหน้าจอ และให้ `src/client/index.ts` รับผิดชอบการเริ่ม client และ mount Ink

ชื่อไฟล์ตัวอย่างข้างต้นเป็นแนวทางแบ่งงาน ยังไม่ได้สร้าง component หรือ hook เปล่าเพื่อบังคับ API ล่วงหน้า

## แนวทางตั้งชื่อ

- โฟลเดอร์ใช้ตัวเล็ก: `components`, `screens`, `hooks`, `theme`
- React component และไฟล์ component ใช้ PascalCase เช่น `PlayerList.tsx`
- Custom hook ใช้ชื่อขึ้นต้นด้วย `use` ตามด้วย camelCase เช่น `useGameState.ts`
- ใช้ `.tsx` เมื่อมี JSX และ `.ts` สำหรับโค้ดที่ไม่มี JSX
- ตั้งชื่อ props ตาม component เช่น `PlayerListProps`
- ยังไม่ต้องเพิ่ม barrel files หรือโฟลเดอร์ย่อยจนกว่าจะมีเหตุผลจากการใช้งานจริง

## ขอบเขตการทำงาน

- Components แสดงข้อมูลผ่าน Ink และแจ้งการกระทำกลับด้วย callback
- Screens ประกอบหน้าจอและส่ง props ให้ components
- Hooks เชื่อม React กับ `ClientState` และ `SocketClient`; ให้ cleanup subscription และ input handler เมื่อเลิกใช้งาน
- `network/` รับผิดชอบ WebSocket ส่วน `state/` รับผิดชอบข้อมูลฝั่ง client
- ใช้ชนิดข้อมูลและ events จาก `src/shared/types.ts` เพื่อให้ UI และ server ใช้ contract เดียวกัน
- ฝั่ง UI ส่งคำสั่งไปยัง server และแสดง state ที่ได้รับ การตัดสินผู้ชนะและการเปลี่ยนยอดชิปเป็นหน้าที่ของ server
- `GameUI.ts` และ `LobbyUI.ts` เป็น class contracts เดิม ไม่ใช่ React components ให้ตรวจผู้เรียกใช้และตกลงการเชื่อมต่อก่อนเปลี่ยน contract เหล่านี้
- React function components ใช้ร่วมกับ OOP ใน domain, `ClientState` และ `SocketClient` ได้ ไม่จำเป็นต้องเปลี่ยน UI เป็น React class components เพื่อให้มี OOP
- เมื่อเพิ่ม UI tests ให้จัดภายใต้ `Test/client/ui/` ตามโครงสร้าง Test เดิมของ repository

## ก่อนเริ่มรัน UI

รอบนี้เตรียมโฟลเดอร์และแนวทางแบ่งงาน ยังไม่ได้เพิ่ม dependencies หรือ entry point ของ React + Ink

งานเริ่มต้นของทีม UI:
1. ติดตั้ง React, Ink และ React type definitions ที่เข้ากันได้
2. ตั้งค่า TypeScript ให้รองรับ JSX และตรวจ module configuration ให้เข้ากับแพ็กเกจที่เลือก
3. เพิ่ม `App.tsx`, เชื่อม Ink กับ `startClient()` และเพิ่มคำสั่งรัน client ใน `package.json`
4. เริ่มจาก LobbyScreen ที่แสดงข้อมูลจำลอง แล้วค่อยเชื่อม state และ network
5. ตรวจ TypeScript และชุดทดสอบเดิมเมื่อเปลี่ยน contracts ที่ใช้ร่วมกัน
