# กฎการทำงานร่วมกันของทีม (Git Workflow)

โปรเจกต์นี้เปิดระบบ **Branch Protection** เอาไว้ เพื่อความปลอดภัยและการ Review โค้ดที่ได้มาตรฐาน

⚠️ **ข้อควรระวัง: ห้ามใคร Push หรือแก้โค้ดที่สาขา `main` หรือ `demo` ตรงๆ เด็ดขาด!**

## ขั้นตอนการทำงาน (Workflow)

1. **อัปเดตโค้ดล่าสุดเสมอ:**
   ```bash
   git checkout demo
   git pull
   ```
2. **สร้าง Branch ใหม่สำหรับฟีเจอร์ที่จะทำ:**

   ```bash
   git checkout -b feature/ชื่อฟีเจอร์
   ```

   _(หรือ `bugfix/ชื่อบั๊ก` หากเป็นการแก้บั๊ก)_

3. **เขียนโค้ดและ Commit:**

   ```bash
   git add .
   git commit -m "อธิบายสิ่งที่แก้ไขหรือเพิ่มเข้าไป"
   ```

   _หมายเหตุ: ก่อน Commit ระบบ Husky จะรัน Prettier และ Linter ให้โดยอัตโนมัติ_

4. **ส่งโค้ดขึ้น GitHub:**

   ```bash
   git push -u origin feature/ชื่อฟีเจอร์
   ```

5. **เปิด Pull Request (PR):**
   ไปที่หน้าเว็บ GitHub แล้วเปิด Pull Request เพื่อขอรวมโค้ดของคุณเข้าสู่ `demo` (หรือ `main`)

6. **การอนุมัติ (Code Review):**
   PR จะต้องได้รับการ **Approve** จากสมาชิกหลักอย่างน้อย 1 คน (เช่น `@PhaBie` หรือ `@thanathonSO`) จึงจะสามารถกดปุ่ม Merge ได้

## มาตรฐานโค้ดก่อน Commit

โปรดตรวจสอบให้แน่ใจว่าโค้ดของคุณผ่านเกณฑ์เหล่านี้:

- `bunx tsc --noEmit` (ไม่มี Error ของ TypeScript)
- `bun run test` (ไม่มี Error ของ Test)
- `bun run lint` (ไม่มี Error ของ ESLint)
- `bun run format` (จัดรูปหน้าตาโค้ดเรียบร้อย)
