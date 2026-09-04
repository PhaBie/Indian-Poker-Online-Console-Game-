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
*(คำสั่งนี้จะไปโหลด `ws`, `@types/ws` และเครื่องมืออื่นๆ ที่จำเป็นมาให้ครบเลยครับ)*

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
- `src/shared/` - เก็บ Type และกติกาที่ต้องรู้ตรงกันทั้ง Server และ Client (เช่น ข้อมูลไพ่)
- `src/server/core/` - ระบบกติกาเกม (Game Logic) เหมาะสำหรับเขียน Unit Test (TDD)
- `src/server/room/` - ระบบจัดการห้องเกม
- `src/server/game/` - ระบบจัดการเทิร์นและการวางเดิมพัน
- `src/server/network/` - ระบบ WebSocket รับส่งข้อมูล
- `Documentation/` - เอกสารการออกแบบและ TDD
