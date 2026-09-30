# เอกสารโครงการ (Project Documentation)

ไดเรกทอรีนี้รวบรวมเอกสารทางเทคนิคและแผนภาพสถาปัตยกรรมทั้งหมดของโครงการ **Indian Poker Online (Teen Patti)** ตามข้อกำหนดการส่งมอบงาน

---

## สารบัญเอกสารหลัก (Mandatory Documentation)

ตามเกณฑ์การประเมินของรายวิชา เอกสารประกอบด้วย 4 ส่วนสำคัญ ดังนี้:

| หัวข้อเอกสาร                         | ไฟล์เอกสาร                                           | คำอธิบาย                                                                             |
| :----------------------------------- | :--------------------------------------------------- | :----------------------------------------------------------------------------------- |
| **1. Architecture Overview**         | [docs/architecture.md](docs/architecture.md)         | อธิบายภาพรวมของระบบ การแบ่ง Client-Server, การแยกส่วนหน้าที่ และหลักการสถาปัตยกรรม   |
| **2. Class Diagram & Relationships** | [docs/class_diagrams.md](docs/class_diagrams.md)     | แผนภาพคลาสระดับโดเมน แสดงคลาส อินเทอร์เฟซ และความสัมพันธ์ระหว่างคอมโพเนนต์           |
| **3. Design Decisions**              | [docs/design_decisions.md](docs/design_decisions.md) | บันทึกเหตุผลการตัดสินใจทางสถาปัตยกรรม (ทำไมถึงเลือกใช้ Bun, TypeScript, Ink, OOP+FP) |
| **4. Test Report**                   | [docs/test_report.md](docs/test_report.md)           | รายงานสรุปผลการทดสอบระบบ ทั้ง 536 Automated Tests และ 11 Manual Test Scenarios       |

---

## เอกสารอ้างอิงเพิ่มเติม (Supporting Documentation)

- **[docs/project_structure.md](docs/project_structure.md):** โครงสร้างและวงจรการทำงานของระบบ (System Lifecycle & Sequence)
- **[docs/core_functions_for_tdd.md](docs/core_functions_for_tdd.md):** ฟังก์ชันหลักสำหรับการพัฒนาด้วยการทดสอบ (Core Functions for TDD)
- **[docs/game_rules.md](docs/game_rules.md):** รายละเอียดกติกาการเล่น ลำดับแต้มไพ่ และการเดิมพันแบบ Teen Patti
- **[docs/requirements.md](docs/requirements.md):** ข้อกำหนดของระบบทั้งด้านฟังก์ชันการทำงานและความปลอดภัย
- **[docs/testing.md](docs/testing.md):** คู่มือและคำสั่งสำหรับการรันชุดทดสอบ
- **[docs/online-play.md](docs/online-play.md):** คำแนะนำสำหรับการเชื่อมต่อเล่นผ่านเครือข่ายวงแลน (LAN) และระบบ Tunnel (Ngrok)
- **[docs/workflow.md](docs/workflow.md):** แนวทางการทำงานร่วมกันผ่าน Git (Branching, Pull Request, Commit Convention)

---

## แผนภาพสถาปัตยกรรมและ UML (Diagrams & Assets)

- **โฟลเดอร์แผนภาพภาพรวมระบบ:** [Diagram/](Diagram/)
  - `1.Server Architecture & Game Domain.png`
  - `2.Core Game Logic & Schema Engine.png`
  - `3.Client Architecture & UI State.png`
- **โฟลเดอร์แผนภาพ UML รายโมเดล:** [UML/](UML/)
  - `GameState_UML.png`
  - `Player_UML.png`
  - `RoomManager_UML.png`
  - `GameLogic_UML.png`
  - `Soket_Handler_UML.png`
  - `Shared Types & Network Contracts_UML.png`
