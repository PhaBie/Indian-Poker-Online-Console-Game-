# Demo & UI Presentation

โฟลเดอร์นี้รวบรวมภาพหน้าจอการทำงาน (Screenshots) และคำแนะนำสำหรับการสาธิต (Demo) เกม **Indian Poker Online (Console Game)**

---

## ภาพหน้าจอการทำงาน (UI Screenshots)

สามารถรับชมภาพหน้าจอการทำงานจริงในแต่ละขั้นตอนได้ที่โฟลเดอร์ `UI-DEMO/`:

| หน้าจอ (Screen)      | ภาพประกอบ                               | คำอธิบาย                                                                     |
| :------------------- | :-------------------------------------- | :--------------------------------------------------------------------------- |
| **1. Main Menu**     | `UI-DEMO/MAIN_MENU.png`                 | เมนูหลักของเกม รองรับการเลือกโหมด LAN, Internet หรือเข้าห้อง                 |
| **2. Create Room**   | `UI-DEMO/CreateRoom_SelectPlayer.png`   | หน้าจอตั้งค่าสร้างห้อง เลือกจำนวนผู้เล่น (2-4 คน) และกำหนด Boot Amount       |
| **3. LAN Mode**      | `UI-DEMO/Room_Create(LanMode).png`      | การสร้างห้องเชื่อมต่อผ่านเครือข่ายวงแลน (Local Area Network)                 |
| **4. Internet Mode** | `UI-DEMO/Room_Create(InternetMode).png` | การสร้างห้องออนไลน์ผ่าน Tunnel (Ngrok) สำหรับเล่นข้ามเครือข่าย               |
| **5. Waiting Room**  | `UI-DEMO/Waiting_Room.png`              | ห้องพักรอ แสดงรายชื่อผู้เล่น สถานะความพร้อม (Ready/Unready) และ Host Control |
| **6. Game Result**   | `UI-DEMO/Result_Screen.png`             | สรุปผลการแข่งขันเมื่อจบรอบ แสดงผู้ชนะ ไพ่ และเงินรางวัล Pot ที่ได้รับ        |

---

## คำสั่งรันโหมดพรีวิวหน้าจอ (Preview / Demo Mode)

สามารถทดสอบรันหน้าจอเกมแบบ Standalone Preview ได้โดยไม่ต้องเปิดเซิร์ฟเวอร์ ผ่านคำสั่งต่อไปนี้:

```bash
# พรีวิวหน้าจอเกม (ค่าเริ่มต้น 2 คน)
bun run dev:game

# พรีวิวหน้าจอเกมแบบ 2 คน
bun run dev:game:2

# พรีวิวหน้าจอเกมแบบ 3 คน
bun run dev:game:3

# พรีวิวหน้าจอเกมแบบ 4 คน
bun run dev:game:4
```
