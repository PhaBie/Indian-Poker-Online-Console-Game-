# คู่มือแบ่งงานและเชื่อมต่อระบบ

## สถานะและขอบเขต

โปรเจกต์ใช้ TypeScript และ Bun โดยแยกตรรกะคำนวณใน Core ออกจากคลาสที่จัดการสถานะใน Domain ส่วนหน้าจอใช้ React + Ink ชุดทดสอบเป็นข้อกำหนดตั้งต้นสำหรับพัฒนาตามรอบ Red → Green → Refactor

ตารางด้านล่างเป็นข้อเสนอแบ่งงานตามหน้าที่ ยังไม่ได้มอบหมายชื่อบุคคล ผู้ดูแลโครงการและทีมควรตกลงเจ้าของงานก่อนเริ่ม ส่วนรายละเอียดภายในฟังก์ชันเป็นหน้าที่ของผู้พัฒนาร่วมกับผู้รีวิว

## การไหลของข้อมูลที่ต้องเชื่อมให้ครบ

```text
ผู้เล่น → หน้าจอ Ink → SocketClient → WebSocket
       → Validator / socketHandler → RoomManager → Room → GameState
       → Player และฟังก์ชัน Core
       → socketHandler สร้างข้อมูลสำหรับแต่ละ session
       → SocketClient → ClientState → หน้าจอ Ink

StorageManager ↔ ข้อมูลบันทึกห้องและสถานะเกม
```

ภาพนี้แสดงการเชื่อมต่อที่ต้องพัฒนา ไม่ได้หมายความว่าเส้นทางทั้งหมดมี implementation แล้ว Server เป็นผู้ตัดสินการเดิมพัน เทิร์น ผู้ชนะ และยอดชิป Client ส่งคำขอและแสดงผลที่ Server ตอบกลับ

## 1. Core: สำรับไพ่ การประเมินมือ และการแบ่งเงิน

**ไฟล์:** `src/server/core/gameLogic.ts`

**Test:** `Test/core/gameLogic.test.ts`

| ฟังก์ชัน | งานที่ต้องพัฒนา |
| --- | --- |
| `createDeck` | สร้างไพ่ครบ 52 ใบโดยไม่มีใบซ้ำ |
| `shuffleDeck` | รับ RNG เพื่อควบคุมการสุ่มใน Test และไม่แก้ input |
| `dealCards` | แจกแบบวนทีละใบ คืนมือผู้เล่นและไพ่ที่เหลือ โดยไม่มีไพ่ซ้ำหรือหาย |
| `evaluateHand` | คืนประเภทมือ ค่าเปรียบเทียบ และ kickers ตามกติกาใน Test |
| `compareHands` | เปรียบเทียบมือ รวมลำดับไพ่เรียงและกรณีแต้มเท่ากัน |
| `getWinners` | คืน ID ผู้ชนะหนึ่งคนหรือหลายคนจากชุดผู้เล่นที่ส่งเข้ามา |
| `calculateSplitPot` | แบ่งเงินจำนวนเต็ม แจกเศษตามลำดับ winnerIds และรักษายอดรวม |

ใช้ `Card`, `HandRank` จาก shared types หลีกเลี่ยงการอ่านไฟล์ ส่งข้อความ หรือแก้สถานะ Room ใน Core ผู้รับงานต่อคือทีม GameState ซึ่งเลือกผู้เล่นที่มีสิทธิ์ชนะก่อนส่งข้อมูลให้ Core

## 2. Player: สถานะและการเดิมพันของผู้เล่นรายคน

**ไฟล์:** `src/server/domain/models/Player.ts`

**Test:** `Test/domain/player.test.ts`

พัฒนา `receiveCards`, `placeBet`, `call`, `raiseTo`, `fold`, `showCards`, `seeCards`, `addChips` และ `resetForNewRound` ให้ตรงกับ Test

- `call` และ `raiseTo` หักชิปตามส่วนต่างจนถึงยอดเป้าหมาย
- ปฏิเสธการกระทำที่ไม่ถูกต้องโดยไม่เปลี่ยนยอดเงินหรือสถานะไปบางส่วน
- reset ล้างไพ่และยอดเดิมพัน เปลี่ยนสถานะสำหรับรอบใหม่ และรักษาชิปที่เหลือ
- `toJSON` และ `fromJSON` ต้องตกลงขอบเขตกับทีม Storage: Test ของ Player กำหนดให้ข้อมูลที่เปิดเผยไม่มี privateCards ขณะที่ข้อมูลบันทึกเกมต้องมีไพ่เพื่อกู้คืนได้ จึงไม่ควรใช้ข้อมูลสาธารณะเป็น save format โดยตรง

Player จัดการข้อมูลรายคน ส่วน GameState จัดการกองกลาง เทิร์น และการตัดสินทั้งโต๊ะ ต้องตกลงให้ชัดว่าจุดใดหักชิป เพื่อไม่หักซ้ำ

## 3. GameState: การเล่นหนึ่งรอบ

**ไฟล์:** `src/server/domain/models/GameState.ts`

**Test:** `Test/domain/gameState.test.ts`

พัฒนาเริ่มรอบ เก็บ Boot แจกไพ่ ประมวลผล action และเปลี่ยนเทิร์น จากนั้นทำเงื่อนไขจบรอบ การจ่ายกองกลาง กรณีเสมอ Sideshow และการหลุดจากเกมตาม Test ที่เกี่ยวข้อง

- ใช้ Core สำหรับการคำนวณ และใช้ Player สำหรับการเปลี่ยนข้อมูลรายคน
- รับ Boot จากการตั้งค่าห้อง ไม่ยึด 50 ตายตัว
- ตรวจสิทธิ์ตามเทิร์นและสถานะก่อนเปลี่ยนข้อมูล
- จ่ายเงินและล้างกองกลางให้ครบ โดยไม่จ่ายซ้ำ
- ประสาน Room เรื่องการเปลี่ยน phase และ Network เรื่องการส่งผลลัพธ์
- แยกการตัดสินเมื่อ timeout ออกจากการตั้ง timer จริง ซึ่งต้องมีผู้รับผิดชอบในชั้นเชื่อมต่อระบบ

## 4. Room และ RoomManager: วงจรห้องและทะเบียนห้อง

| ไฟล์ | งานที่ต้องพัฒนา | Test |
| --- | --- | --- |
| `src/server/domain/models/Room.ts` | สมาชิกห้อง Host การเริ่ม/จบเกม reconnect การออกห้อง resetToLobby และข้อมูลสาธารณะ | `Test/domain/room.test.ts` |
| `src/server/domain/models/RoomManager.ts` | สร้าง ค้นหา ลบ และแสดงรายการห้อง ป้องกัน ID ซ้ำ | `Test/domain/roomManager.test.ts` |

ห้องรองรับสูงสุด 4 คน และเริ่มเกมเมื่อมีอย่างน้อย 2 คนตามข้อกำหนดปัจจุบัน `resetToLobby` ต้องรักษาชิปหลังจบรอบและล้าง gameState ตาม Test การลบห้องต้องกระทบเฉพาะห้องเป้าหมาย

`Room.reconnect(playerId)` รับ ID ที่ยืนยันสิทธิ์มาแล้ว การตรวจ token เป็นหน้าที่ Network/SessionStore ไม่ใช่ Room

**จุดเชื่อมต่อที่ต้องตกลง:** CREATE_ROOM มี bootAmount แต่ `RoomManager.createRoom(roomId, host)` ยังไม่มีพารามิเตอร์นี้ ให้ทีม Room และ Network ตกลงวิธีส่งค่าก่อนเชื่อม flow และปรับ Test/contract ร่วมกันหากจำเป็น

## 5. Storage: บันทึกและกู้คืนเกม

**ไฟล์:** `src/server/infrastructure/StorageManager.ts`

**Test:** `Test/infrastructure/storageManager.test.ts`

พัฒนา `saveRoomState`, `loadRoomState`, `checkSaveExists` และ `deleteSavedRoom` โดยใช้ basePath ที่ส่งเข้ามา Test ตรวจไฟล์จริงและโหลดผ่าน instance ใหม่ จึงต้องบันทึกลงไฟล์ ไม่ใช้เพียง Map ในหน่วยความจำ

ตกลงโครงสร้างบันทึกกับ Room/GameState/Player ให้เก็บข้อมูลที่จำเป็นต่อการเล่นต่อ รวมถึงไพ่ กองกลาง และสถานะห้อง การโหลดต้องตรวจข้อมูล JSON และคืน object ที่ใช้งานเมธอดต่อได้ ข้อมูลบันทึกภายในต้องแยกจาก Public DTO

`RoomSaveData` ใน shared types ยังไม่ใช่ schema สำหรับกู้คืนทั้งเกม ต้องพัฒนาเพิ่มเติมในงานนี้ เคสไฟล์เสียและข้อมูลไม่ครบให้เพิ่มเมื่อทำพฤติกรรมดังกล่าว

## 6. Network และ Server: รับคำสั่งและเชื่อมระบบ

| ไฟล์ | งานที่ต้องพัฒนา | Test ที่มีอยู่ |
| --- | --- | --- |
| `src/server/network/socketHandler.ts` | จัดการ ClientEvent, session, reconnect, disconnect และ broadcast | `Test/network/socketHandler.test.ts` |
| `src/server/index.ts` | เปิด/ปิด Server สร้าง dependencies และผูกเหตุการณ์ WebSocket | `Test/server/index.test.ts` |
| `src/server/utils/validator.ts` | ตรวจข้อมูลภายนอกก่อนแปลงเป็น ClientEvent และตรวจ input | ยังไม่มี Test เฉพาะไฟล์ |
| `src/server/utils/logger.ts` | บันทึกเหตุการณ์และข้อผิดพลาดตามรูปแบบที่ทีมตกลง | ยังไม่มี Test เฉพาะไฟล์ |

`NetworkContext` ประกอบด้วย RoomManager, sessionStore และ Map ของ socket/session ปัจจุบัน sessionStore มีเพียง interface ที่ฝังใน context และ mock ใน Test ต้องสร้างการทำงานจริงและเชื่อมที่ Server

- รับตัวตนจาก session ที่ตรวจแล้ว ไม่เชื่อ playerId ที่ผู้ใช้ส่งมาเอง
- ส่ง `SESSION_CREATED` และใช้ token สำหรับ `JOIN_ROOM` เพื่อ reconnect
- สร้าง `GAME_STATE_UPDATE` แยกตามผู้รับ: players เป็น Public DTO และ myCards ต้องตรงกับเจ้าของ session
- แปลงข้อผิดพลาดเป็น `ERROR` ตาม contract โดย code อยู่ระดับเดียวกับ message
- เชื่อม SAVE_GAME/LOAD_GAME กับ Storage: context ปัจจุบันยังไม่มี storage dependency ต้องตกลงวิธีส่งเข้าก่อน implement
- จัดการการยกเลิก timer และการปิด connection เมื่อหยุด Server

Test handler ใช้ mock จึงยังไม่พิสูจน์การรับส่งผ่าน WebSocket จริง ให้เพิ่มการตรวจเชื่อมระบบเมื่อแต่ละส่วนพร้อม

## 7. Client และ React + Ink

| ไฟล์หรือโฟลเดอร์ | งานที่ต้องพัฒนา | เชื่อมกับ |
| --- | --- | --- |
| `src/client/network/socketClient.ts` | connect/send/receive/disconnect และสัญญา transport ที่ชัดเจน | ServerEvent, ClientEvent, `Test/client/socketClient.test.ts` |
| `src/client/state/ClientState.ts` | เก็บตัวตน ห้อง สถานะล่าสุด และ error จาก Server | SocketClient และ UI hooks |
| `src/client/index.ts` | สร้าง client dependencies และ mount แอป Ink | App ที่ทีม UI จะสร้าง |
| `src/client/ui/components/` | ชิ้นส่วนแสดงผลที่ใช้ซ้ำและรับ props/callback | screens |
| `src/client/ui/screens/` | หน้าห้องรอ โต๊ะเกม และผลการแข่งขัน | components และ hooks |
| `src/client/ui/hooks/` | subscription, state และ input ของ React พร้อม cleanup | ClientState และ SocketClient |
| `src/client/ui/theme/` | สีและค่ารูปแบบที่ใช้ร่วมกัน | components/screens |
| `src/client/ui/LobbyUI.ts`, `GameUI.ts` | ตรวจบทบาทของ class contracts เดิมก่อนเชื่อมกับหน้าจอ React | ทีม UI และ Client |

React/Ink และ JSX configuration ถูกเพิ่มแล้ว แต่ยังไม่มี App และเส้นทางรัน UI ครบวงจร คลาส LobbyUI/GameUI ปัจจุบันคืน string และยังไม่ใช่ React components ทีม UI ควรตกลงว่าจะปรับหรือคงเป็นตัวช่วยก่อนเขียนหน้าจอจริง ไม่ควรสร้างระบบแสดงผลซ้ำสองชุดโดยไม่กำหนดหน้าที่

งาน Client ที่ต้องตกลงร่วมกันคือ interface ของ transport, การแจ้งเตือนเมื่อ state เปลี่ยน และการเก็บ reconnect token ปัจจุบัน ClientState ยังไม่มีที่เก็บ token โดยตรง

หากทำหน้ารายการห้อง ต้องตกลง event กับทีม Network เพิ่ม เพราะ ClientEvent/ServerEvent ปัจจุบันยังไม่มี event รายการห้องโดยเฉพาะ เริ่มพัฒนาหน้าจอด้วย mock ตามข้อมูลที่ตกลงได้ก่อน

Test ของ ClientState และ UI ยังต้องเพิ่มตามพฤติกรรมที่พัฒนา โดยเสนอให้วาง UI tests ใน `Test/client/ui/`

## 8. ไฟล์ที่ใช้ร่วมกันและเจ้าของมาตรฐาน

| ไฟล์ | หน้าที่ |
| --- | --- |
| `src/shared/types.ts` | รูปแบบไพ่ ผู้เล่น DTO และ events ที่ Client/Server ใช้ร่วมกัน |
| `src/shared/constants.ts` | ค่าตั้งต้น เช่น Boot จำนวนผู้เล่น และ timeout |
| `src/server/domain/errors/GameError.ts` | ประเภทข้อผิดพลาดที่ Domain และ Network ใช้ร่วมกัน |
| `src/server/utils/helpers.ts` | สร้าง ID และแปลง Public DTO; ดู `Test/utils/helpers.test.ts` |
| `eslint.config.mjs`, `tsconfig.json` | กฎตรวจโค้ดและการตั้งค่า compiler |
| `package.json`, `bun.lock`, `.husky/pre-commit` | dependencies คำสั่ง และ Hook ก่อน commit |

ให้ผู้รับผิดชอบต้นทางและปลายทางรีวิวการแก้ shared contract ร่วมกัน ไฟล์เหล่านี้ไม่ควรถูกเปลี่ยนเพียงเพื่อให้ Test ของคนหนึ่งผ่านโดยไม่ตรวจผู้ใช้ส่วนอื่น

## ลำดับและเงื่อนไขส่งงาน

เริ่ม Core และ Player ก่อน แล้วเชื่อม GameState/Room ตามด้วย Storage และ Network ทีม UI สามารถทำ components และ screens ด้วย mock คู่ขนานได้ ทีม Network สามารถเตรียม transport/session ด้วย mock ได้เช่นกัน

ก่อนเปิด PR ให้ตรวจ:

```sh
bun run lint
bunx tsc --noEmit
bun test Test/core/gameLogic.test.ts
```

เปลี่ยนพาธ Test ให้ตรงกับงานที่รับผิดชอบ และรันชุดที่เกี่ยวข้องเมื่อเชื่อมหลายส่วน ไม่ใช่ใช้ Core Test เป็นเกณฑ์ของทุกงาน

- ระบุพฤติกรรมที่ทำเสร็จ Test ที่ผ่าน และส่วนที่ยังรอ dependency
- ตรวจว่า Test เป็น Red เพราะพฤติกรรมยังไม่มี แล้วทำให้ Green ก่อน refactor
- ไม่เปลี่ยน expected เพียงเพื่อให้เข้ากับ implementation หากข้อกำหนดผิดให้ตกลงและแก้พร้อมเหตุผล
- เคสพื้นฐาน เช่น ผิดเทิร์น ชิปไม่พอ และ token ไม่ถูกต้อง ให้ทำพร้อมฟีเจอร์นั้น
- ไม่เพิ่มคอมเมนต์ใน Test ตามข้อตกลงทีม ใช้ชื่อกรณีทดสอบภาษาไทยที่ระบุพฤติกรรม
- เมื่อเริ่มใช้พารามิเตอร์ Stub แล้ว ให้เอา underscore ที่ใช้ระบุ unused ออก
- Husky ช่วยตรวจบนเครื่องผู้พัฒนา แต่ไม่แทนการรีวิวและ CI ก่อน merge

ติดตั้ง dependencies ด้วย `bun install --frozen-lockfile` และตรวจว่า prepare ติดตั้ง Husky สำเร็จ หากยังไม่ตั้ง Hook ให้รัน `bun run prepare` เครื่องมือ lint-staged ที่ติดตั้งในรอบตรวจนี้กำหนด Node >=22.22.1 จึงควรใช้ Node/Bun รุ่นเดียวกันในทีมตาม lockfile และข้อกำหนด dependencies
