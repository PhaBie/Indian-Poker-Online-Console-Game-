# ฟังก์ชันหลักสำหรับการพัฒนาด้วยการทดสอบ (Core Functions for TDD)

เอกสารฉบับนี้กำหนดรายการฟังก์ชันหลัก (Function Signatures & Specifications) สำหรับการพัฒนาเกม **Indian Poker Online (Teen Patti)** โดยมุ่งเน้นการออกแบบเพื่อรองรับกระบวนการพัฒนาที่ขับเคลื่อนด้วยชุดทดสอบ (Test-Driven Development - TDD)

---

## 1. ตรรกะกติกาของเกม (Core Game Logic)

ฟังก์ชันทั้งหมดในส่วนนี้ถูกออกแบบเป็น **ฟังก์ชันบริสุทธิ์ (Pure Functions)** ที่ไม่เปลี่ยนแปลงข้อมูลนำเข้าและปราศจากผลข้างเคียง (Side Effects):

- `createDeck(): Card[]`  
  สร้างสำรับไพ่มาตรฐานจำนวน 52 ใบ (ไม่รวม Joker) โดยคืนค่าเป็นอาร์เรย์ของออบเจกต์ไพ่
- `shuffleDeck(deck: Card[], rng?: () => number): Card[]`  
  สับเปลี่ยนตำแหน่งไพ่ในสำรับ รองรับการกำหนดฟังก์ชันสุ่ม (Custom RNG / Seed) เพื่อให้สามารถควบคุมผลลัพธ์ในการทดสอบระบบได้
- `dealCards(deck: Card[], playerCount: number, cardsPerPlayer: number): { hands: Card[][], remainingDeck: Card[] }`  
  แจกไพ่ออกจากสำรับตามจำนวนผู้เล่น (คนละ 3 ใบ) และคืนค่าชุดไพ่ของผู้เล่นแต่ละคนพร้อมไพ่ที่เหลืออยู่ในสำรับ
- `evaluateHand(cards: Card[]): { rank: HandRank, rankValue: number, kickers: number[] }`  
  ประเมินชุดไพ่ 3 ใบตามลำดับกติกา Teen Patti (Trail, Pure Sequence, Sequence, Color, Pair, High Card) พร้อมคำนวณคะแนนแต้มสำหรับใช้เปรียบเทียบ
- `compareHands(handA: Card[], handB: Card[]): number`  
  เปรียบเทียบแต้มระหว่างชุดไพ่สองชุด โดยคืนค่า `1` เมื่อชุด A ชนะ, `-1` เมื่อชุด B ชนะ และ `0` เมื่อแต้มเสมอกัน
- `determineWinners(players: Player[]): Player[]`  
  ประเมินหาผู้ชนะจากกลุ่มผู้เล่นที่ยังคงอยู่ในเกม (ยกเว้นผู้เล่นที่มีสถานะ `FOLDED` หรือ `DISCONNECTED`)
- `calculateSplitPot(pot: number, winnerCount: number): { share: number, remainder: number }`  
  คำนวณส่วนแบ่งเงินรางวัล Pot ในกรณีที่มีผู้ชนะหลายคน พร้อมทั้งจัดการเศษชิปตามข้อกำหนด

---

## 2. การจัดการห้องแข่งขัน (Room & Session Management)

- `createRoom(host: Player, maxPlayers: number, bootAmount: number): Room`  
  สร้างห้องแข่งขันใหม่ กำหนดรหัสห้อง เพิ่มหัวหน้าห้องเข้าสู่ระบบ และกำหนดสถานะเริ่มต้นของห้องเป็น `LOBBY`
- `joinRoom(roomId: string, player: Player): boolean`  
  ตรวจสอบความมีอยู่ของห้อง จำนวนผู้เล่นปัจจุบัน และสถานะความพร้อม ก่อนเพิ่มผู้เล่นเข้าสู่ห้องแข่งขัน (รองรับ 2–4 คน)
- `leaveRoom(roomId: string, playerId: string): void`  
  นำผู้เล่นออกจากห้องแข่งขัน หากผู้เล่นที่ออกเป็นหัวหน้าห้อง ระบบจะทำการโอนสิทธิ์หัวหน้าห้องให้ผู้เล่นคนถัดไป หรือทำลายห้องหากไม่มีผู้เล่นเหลืออยู่
- `startGame(roomId: string): void`  
  ตรวจสอบเงื่อนไขก่อนเริ่มเกม (ผู้เล่นอย่างน้อย 2 คนขึ้นไปและทุกคนพร้อม) จากนั้นเปลี่ยนสถานะห้องเป็น `PLAYING` และเริ่มรอบการแจกไพ่

---

## 3. การจัดการสถานะและวงรอบเทิร์น (Game State & Turn Management)

- `processPlayerAction(roomId: string, playerId: string, action: PlayerAction): ActionResult`  
  รับคำสั่งการกระทำจากผู้เล่น (`BET`, `CALL`, `RAISE`, `FOLD`, `SEEN`, `SHOW`) ตรวจสอบความถูกต้องของสิทธิ์ และประมวลผลการเปลี่ยนแปลงสถานะ
- `processBet(player: Player, amount: number): void`  
  ตรวจสอบยอดชิปคงเหลือของผู้เล่น หักเงินเดิมพันเข้าสู่ยอดรวมของ Pot และบันทึกยอดเงินเดิมพันสะสมในรอบปัจจุบัน
- `moveToNextTurn(roomId: string): void`  
  สลับเทิร์นไปยังผู้เล่นคนถัดไปตามลำดับ โดยข้ามผู้เล่นที่มีสถานะ `FOLDED` หรือ `DISCONNECTED`
- `checkEndCondition(roomId: string): boolean`  
  ตรวจสอบเงื่อนไขการสิ้นสุดรอบ เช่น เหลือผู้เล่นที่ยังไม่หมอบเพียง 1 คน หรือมีการดำเนินการ `SHOW` เมื่อเหลือผู้เล่น 2 คน
- `endGame(roomId: string): void`  
  ประมวลผลเมื่อสิ้นสุดรอบการแข่งขัน ค้นหาผู้ชนะ โอนเงิน Pot สรุปผลการเปิดไพ่ และเปลี่ยนสถานะห้องเป็น `ENDED`

---

## 4. การแปลงข้อมูลและสัญญาข้อมูลร่วม (Data Transformers & DTOs)

- `toPublicPlayerDTO(player: Player): PublicPlayerDTO`  
  แปลงออบเจกต์ผู้เล่นฝั่งเซิร์ฟเวอร์เป็นข้อมูลสาธารณะ โดยตัดข้อมูลไพ่ส่วนบุคคล (`cards`) ออกเพื่อความปลอดภัยและป้องกันการทุจริต
- `generateRoomId(): string`  
  สร้างรหัสห้องแข่งขันแบบสุ่มที่ไม่ซ้ำซ้อน
- `generateSessionToken(): string`  
  สร้างโทเค็นประจำตัวผู้เล่นเพื่อสนับสนุนการกู้คืนการเชื่อมต่อ (Reconnection)

---

## 5. การสื่อสารผ่านระบบเครือข่าย (Network Socket Handlers)

- `handleClientMessage(ws: WebSocket, message: ClientEvent): void`  
  รับข้อความคำสั่งจากไคลเอนต์ ดำเนินการตรวจสอบความถูกต้องของ Schema ผ่าน `validator` และส่งต่อการทำงานไปยังโมดูลที่เกี่ยวข้อง
- `broadcastGameStateUpdate(roomId: string): void`  
  ส่งกระจายสถานะล่าสุดของเกมให้แก่ผู้เล่นทุกคนในห้อง โดยจะส่งข้อมูลไพ่ส่วนตัวเฉพาะผู้เล่นที่เป็นเจ้าของเท่านั้น
