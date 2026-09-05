# สรุปการเปลี่ยนแปลงและข้อความสำหรับ commit / PR

## ขอบเขตที่เปรียบเทียบ

ตรวจ [PR #9](https://github.com/PhaBie/Indian-Poker-Online-Console-Game-/pull/9) ซึ่งขณะตรวจยังเปิดอยู่และมี head commit `1881cf0` เทียบกับโค้ดในเครื่องก่อนและหลัง commit `6b1df75`

ก่อนจัดทำเอกสารมี 10 commits จาก head ของ PR ที่ตรวจพบถึง `ca8341a` จากนั้นบันทึกงานปรับ config, types และ Hook เป็น commit `6b1df75` โดยแยกเอกสารชุดนี้เป็น commit ถัดมา Hash เหล่านี้เป็นภาพ ณ เวลาจัดทำเอกสาร ไม่ใช่สถานะสดของ GitHub

## สิ่งที่เปลี่ยนจาก PR #9

| ส่วน | การเปลี่ยนแปลงที่ตรวจพบ | เหตุผล |
| --- | --- | --- |
| Test ของ Player/Room | เตรียมสถานะก่อน reset ตรวจชิปคงเหลือ public state และการกลับ Lobby | ลดกรณี Test ผ่านเพราะค่าเริ่มต้น |
| RoomManager Test | ตรวจการลบเฉพาะห้องเป้าหมายโดยมีอีกห้องอยู่ | ป้องกันการลบทุกห้องแล้ว Test ยังผ่าน |
| Core Test และ contracts | รับ RNG ใน shuffle ตรวจ input และลำดับไพ่ เพิ่มการแบ่งกองกลางตาม winnerIds | ให้ผลทดสอบแน่นอนและตรวจยอดจ่ายชัดเจน |
| GameState/Room | ส่งค่า Boot และทดสอบค่าที่ต่างจากค่าเริ่มต้น ใช้ fixture ตามบริบท | ลดการ hardcode และการเตรียมสถานะไม่ตรงกรณี |
| Network | เพิ่ม NetworkContext, session contract และ JOIN_ROOM พร้อม reconnectToken | แยก dependencies และความรับผิดชอบตรวจตัวตน |
| Network Test | ตรวจ broadcast หลาย socket ไพ่ตามผู้รับ และ token ไม่ถูกต้อง | ตรวจการส่งข้อมูลและความเป็นส่วนตัวตาม contract |
| Storage Test | ตรวจไฟล์จริง โหลดผ่าน instance ใหม่ ใช้ temp directory พร้อม cleanup และเทียบไพ่ | ลดการผ่านด้วยข้อมูลที่อยู่เฉพาะใน memory |
| Client Test | ใช้ fake transport ส่งเหตุการณ์เปิด connection | แยกการทดสอบจากเครือข่ายจริง |
| Type และชื่อ | ใช้ type imports, ลด explicit any, ตั้งชื่อให้ชัด และประกาศ PlayerFixture | ให้ compiler ช่วยตรวจข้อมูลมากขึ้น |
| React + Ink | เพิ่ม dependencies, โฟลเดอร์ components/screens/hooks/theme และ JSX configuration | เตรียมพื้นที่ให้ทีม UI |
| ESLint | แยก Source/UI/Test ใช้ typed linting และปรับกฎที่ชนกับ Component/Stub | ตรวจมาตรฐานโดยลดข้อเตือนที่ไม่เหมาะกับบริบท |
| Git Hook | เพิ่ม prepare และ pre-commit ที่เรียก lint-staged เฉพาะ src/Test | ตรวจ staged TypeScript ก่อน commit |
| งานเก็บรายละเอียด | ลบ testSum.ts ใน commit 6b1df75 | ตัดไฟล์ทดลองที่ไม่อยู่ในงานหลัก |

รายการนี้สรุปการเปลี่ยนแปลงสะสม บางส่วน commit แล้ว จึงไม่ควรใส่ทุกข้อเป็นสิ่งที่เพิ่งเพิ่มใน commit ล่าสุด

## Commit ที่บันทึกแล้วและเอกสารที่แยกตามมา

งานโค้ดและเครื่องมือบันทึกใน commit `6b1df75`:

```text
chore: ปรับกฎ ESLint ชนิดข้อมูล และตั้งค่า Husky

- แยกกฎสำหรับ Source, React/Ink UI และ Test พร้อมเปิด typed linting
- ปรับเวอร์ชัน dependencies และเปิดการรองรับ JSX ใน TypeScript
- ปรับ type imports และ fixture พร้อมระบุพารามิเตอร์ Stub ที่ยังไม่ใช้งาน
- เพิ่มการตรวจ property ไพ่ส่วนตัวใน Network Test
- ตั้งค่า pre-commit ให้ lint-staged ตรวจไฟล์ใน src และ Test
- ลบไฟล์ทดลอง testSum.ts
```

ESLint และ TypeScript compiler ผ่านก่อน commit และ Husky เรียก lint-staged ตรวจไฟล์ TypeScript ที่ stage จำนวน 23 ไฟล์สำเร็จ Source หลักยังคงเป็น Stub สำหรับทีมพัฒนาต่อ

เอกสารชุดนี้แยกออกมาใน commit ชื่อ:

```text
docs: เพิ่มสรุปการเปลี่ยนแปลงและคู่มือแบ่งงานพัฒนา
```

## ข้อเสนอชื่อและคำอธิบาย PR ฉบับปรับปรุง

**ชื่อ:** ปรับข้อกำหนดทดสอบ เตรียม React + Ink และเพิ่มเครื่องมือตรวจมาตรฐานก่อนพัฒนา

**คำอธิบายที่นำไปใช้ได้:**

ปรับชุดทดสอบและสัญญาการเรียกใช้งานให้เหมาะสำหรับส่งต่อทีมพัฒนา โดยแก้การเตรียมสถานะที่ทำให้ Test ผ่านได้จากค่าเริ่มต้น เพิ่มการตรวจข้อมูลที่ส่งผ่านเครือข่ายและไฟล์บันทึกจริง พร้อมเตรียม React + Ink และเครื่องมือตรวจมาตรฐานโค้ด

การเปลี่ยนแปลงหลัก:

- ปรับ Test ของ Player, GameState, Room และ RoomManager ให้ตรวจสถานะก่อนและหลังการทำงานชัดเจน
- ควบคุม RNG ในการสับไพ่ ตรวจว่าไม่แก้ input และตรวจการแบ่งกองกลางรวมถึงเศษชิป
- เพิ่ม NetworkContext และ session contract พร้อม Test ของ reconnect และข้อมูลไพ่แยกตามผู้รับ
- เพิ่ม Test ของ Storage ที่ตรวจไฟล์จริงและกู้คืนข้อมูลผ่าน instance ใหม่
- ปรับชนิดข้อมูลและ fixture ลด explicit any และใช้ type imports
- เตรียมโครง UI สำหรับ React + Ink และตั้งค่า TypeScript ให้รองรับ JSX
- แยกกฎ ESLint ตามขอบเขต Source/UI/Test และเพิ่ม Husky กับ lint-staged
- จัดทำเอกสารหน้าที่ของแต่ละไฟล์ ลำดับการพัฒนา และจุดที่ต้องตกลงระหว่างทีม

สถานะของงาน: Source ส่วนใหญ่ยังเป็น Stub ชุดทดสอบนี้เป็นข้อกำหนดตั้งต้น และจะตรวจความครบถ้วนต่อในรอบ Red → Green → Refactor ไม่ใช่การส่งมอบเกมที่พร้อมเล่น

ผลตรวจ: ให้แนบผล lint, TypeScript และ Test จาก commit ที่ส่งจริง พร้อมแยก Test ที่ยังล้มเหลวเพราะ Stub ออกจากข้อผิดพลาดใหม่ ไม่ใช้จำนวนผ่าน/ล้มเหลวเพียงอย่างเดียวรับรองคุณภาพ

อ่านแนวทางรับงานต่อได้ที่ `Documentation/DEVELOPMENT_HANDOFF.md`

## ข้อจำกัดที่ควรสื่อสาร

- การ reconnect ใน Test เป็นการทดสอบ handler กับ mock session store ยังไม่ใช่การเชื่อม WebSocket จริงครบวงจร
- ข้อมูล JSON จาก Storage ยังต้องมีการตรวจรูปแบบในขั้น implementation
- UI entry point, subscriptions และ session store จริงยังต้องพัฒนา
- คลาส LobbyUI/GameUI เดิมยังไม่ใช่ React components
- ยังไม่พบ workflow CI ใน repository ที่ตรวจ และไม่ได้ตรวจการตั้งค่า branch protection บน GitHub
- เอกสาร PR เดิมกล่าวถึง handRanker.ts แต่ปัจจุบันงานประเมินไพ่อยู่ใน gameLogic.ts ไม่ควรมอบหมายไฟล์ที่ไม่มีอยู่

ผล Test 82 เคส (ผ่าน 3 ล้มเหลว 79) เป็นผลที่ผู้พัฒนารายงานก่อนจัดทำเอกสารนี้ ไม่ได้รันซ้ำในงานเขียนเอกสาร ไม่ได้ทดสอบกรณี Hook บล็อกโค้ดผิดซ้ำ แต่ยืนยันว่า Hook ทำงานผ่านระหว่าง commit 6b1df75 แล้ว
