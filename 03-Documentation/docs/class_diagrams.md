# Class Diagrams & System Relationships (แผนภาพคลาสและความสัมพันธ์ของระบบ)

เอกสารฉบับนี้จัดทำขึ้นเพื่ออธิบายการออกแบบเชิงวัตถุ (Object-Oriented Design) แสดงโครงสร้างคลาส (Classes), อินเทอร์เฟซ (Interfaces) และความสัมพันธ์ระหว่างคอมโพเนนต์ภายในระบบ **Indian Poker Online (Teen Patti)** โดยอ้างอิงตรงตามโครงสร้างซอร์สโค้ดจริงใน `01-Source-code/server/domain/` และ `01-Source-code/shared/`

---

## 1. แผนภาพคลาสระดับโดเมน (Domain Class Diagram)

โครงสร้างคลาสฝั่งเซิร์ฟเวอร์ได้รับการออกแบบตามหลักการห่อหุ้มข้อมูล (Encapsulation) และการแบ่งแยกหน้าที่ความรับผิดชอบ (Single Responsibility Principle):

```mermaid
classDiagram
    direction TB

    class RoomManager {
        -checkRoomId: Map~string, Room~
        +createRoom(roomId: string, host: Player, maxPlayers?: number): Room
        +getRoom(roomId: string): Room | undefined
        +deleteRoom(roomId: string): void
        +getAllRooms(): Room[]
    }

    class Room {
        +roomId: string
        +phase: RoomPhase
        +hostId: string | null
        +players: Map~string, Player~
        +bootAmount: number
        +gameState: GameState | null
        +MAX_PLAYERS: number
        +join(player: Player): void
        +reconnect(playerId: string): void
        +leave(playerId: string): void
        +startGame(requestingPlayerId: string): void
        +endGame(forceShowdown?: boolean): RoundResult | null
        +startNextRound(requestingPlayerId: string): void
        +resetToLobby(): void
    }

    class Player {
        +id: string
        +name: string
        +chips: number
        +bet: number
        +status: PlayerStatus
        +privateCards: Card[]
        +isBlind: boolean
        +receiveCards(cards: Card[]): void
        +payBet(amount: number): void
        +addChips(amount: number): void
        +seeCards(): void
        +fold(): void
        +showCards(): Card[]
        +resetForNewRound(): void
    }

    class GameState {
        +pot: number
        +currentStake: number
        +currentPlayerIndex: number
        +deck: Card[]
        +activePlayers: Player[]
        +bootAmount: number
        +dealerIndex: number
        +lastGameResult: GameResult | null
        +startGame(firstPlayerIndex?: number): void
        +processAction(playerId: string, action: GameActionType, amount?: number): boolean
        +nextTurn(): void
        +endGame(forceShowdown?: boolean): GameResult | null
    }

    class GameError {
        +code: string
        +message: string
    }

    RoomManager "1" *-- "0..*" Room : ประกอบด้วย (Composition)
    Room "1" *-- "0..1" GameState : ถือครองสถานะ (Composition)
    Room "1" o-- "1..4" Player : รวบรวมผู้เล่น (Aggregation)
    GameState --> "1..*" Player : ประเมินและจัดสรรชิป (Association)
    GameState ..> GameError : โยนข้อผิดพลาด (Dependency)
    Player ..> GameError : โยนข้อผิดพลาด (Dependency)
    Room ..> GameError : โยนข้อผิดพลาด (Dependency)
```

### คำอธิบายหน้าที่และความรับผิดชอบของแต่ละคลาส (Class Responsibilities)

| คลาส (Class)      | ตำแหน่งไฟล์ใน Source Code               | หน้าที่ความรับผิดชอบหลักตามโค้ดจริง                                                                                                                                                      |
| :---------------- | :-------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`RoomManager`** | `server/domain/services/roomManager.ts` | บริการจัดการสารบบห้องแข่งขันส่วนกลาง (Lobby Registry) ทำหน้าที่สร้าง ค้นหา ลบ และแสดงรายการห้องแข่งขันทั้งหมดในหน่วยความจำเซิร์ฟเวอร์                                                    |
| **`Room`**        | `server/domain/models/Room.ts`          | บริบทของห้องแข่งขัน (Game Session Context) ควบคุมผู้เข้าร่วมห้อง (`players: Map<string, Player>`), ค่า Boot และถือครองอินสแตนซ์ของ `gameState`                                           |
| **`Player`**      | `server/domain/models/Player.ts`        | เอนทิตีผู้เล่น (Domain Entity) ห่อหุ้มข้อมูลและสถานะ เช่น ชิปคงเหลือ (`chips`), เงินเดิมพันสะสมในรอบ (`bet`), ไพ่ส่วนตัว (`privateCards`), สถานะความพร้อม และสถานะ Blind/Seen            |
| **`GameState`**   | `server/domain/models/GameState.ts`     | ตัวควบคุมวัฏจักรสถานะเกม (Game Lifecycle Controller) จัดการลำดับเทิร์น (`currentPlayerIndex`), อัตราเงินเดิมพันปัจจุบัน (`currentStake`), ตรวจสอบความถูกต้องของการกระทำ และคำนวณเงิน Pot |
| **`GameError`**   | `server/domain/errors/GameError.ts`     | คลาสข้อยกเว้นทางธุรกิจ (Domain Exception) สืบทอดจากคลาส `Error` มาตรฐาน เพื่อระบุรหัสข้อผิดพลาดและบริบทเมื่อเกิดการละเมิดกติกา                                                           |

### คำอธิบายความสัมพันธ์เชิงสถาปัตยกรรม (Relationship Types)

1. **ความสัมพันธ์แบบประกอบขึ้น (Composition - `*--`):**
   - `RoomManager` กับ `Room`: คลาส `RoomManager` เป็นผู้สร้างและถือครองออบเจกต์ `Room` หากเซิร์ฟเวอร์ถูกรีเซ็ต ห้องแข่งขันทั้งหมดจะสิ้นสุดลง
   - `Room` กับ `GameState`: ในหนึ่งห้องแข่งขันจะมีอินสแตนซ์ของ `GameState` ประจำอยู่เพื่อควบคุมรอบการเล่น
2. **ความสัมพันธ์แบบรวมกลุ่ม (Aggregation - `o--`):**
   - `Room` กับ `Player`: ห้องแข่งขันรวบรวมผู้เล่นจำนวน 1 ถึง 4 คน โดยที่ตัวตนของผู้เล่น (`Player`) ไม่ได้ผูกติดกับห้องอย่างถาวร สามารถออกจากห้องหรือย้ายห้องได้
3. **ความสัมพันธ์แบบเชื่อมโยง (Association - `-->`):**
   - `GameState` กับ `Player`: `GameState` อ้างอิงออบเจกต์ `Player` ใน `activePlayers` เพื่อตรวจสอบสถานะในแต่ละเทิร์น หักเงินเดิมพัน และมอบเงินรางวัลใน Pot เมื่อสิ้นสุดรอบ
4. **ความสัมพันธ์แบบขึ้นต่อกัน (Dependency - `..>`):**
   - เมธอดต่างๆ ใน `GameState`, `Room` และ `Player` มีการพึ่งพาคลาส `GameError` เพื่อโยนข้อผิดพลาดในกรณีที่เกิดข้อมูลผิดรูปแบบหรือการกระทำผิดกติกา

---

## 2. โครงสร้างข้อมูลร่วมและสัญญาการสื่อสาร (Shared Interfaces & Types)

กำหนดไว้ใน `01-Source-code/shared/types.ts` เพื่อเป็นสัญญาข้อมูลกลาง (Single Source of Truth) ระหว่างเซิร์ฟเวอร์และไคลเอนต์:

```mermaid
classDiagram
    direction LR

    class Card {
        +suit: Suit (HEARTS, DIAMONDS, CLUBS, SPADES)
        +rank: Rank (2-10, J, Q, K, A)
        +value: number
    }

    class HandEvaluation {
        +type: HandType (TRAIL, PURE_SEQ, SEQ, COLOR, PAIR, HIGH_CARD)
        +score: number
        +topRanks: number[]
    }

    class PublicPlayerDTO {
        +id: string
        +name: string
        +chips: number
        +currentBet: number
        +isBlind: boolean
        +isFolded: boolean
        +isReady: boolean
        +cardCount: number
    }

    class GameStateSnapshot {
        +roomId: string
        +phase: GamePhase
        +pot: number
        +currentStake: number
        +turnPlayerId: string
        +players: PublicPlayerDTO[]
    }

    GameStateSnapshot o-- PublicPlayerDTO : ประกอบด้วยข้อมูลผู้เล่นสาธารณะ
    HandEvaluation --> Card : ประเมินจากชุดไพ่
```

### สาระสำคัญของสัญญาข้อมูล (Contract Significance):

- **`PublicPlayerDTO`:** โครงสร้างข้อมูลผู้เล่นที่เปิดเผยต่อสาธารณะ โดยจะตัดข้อมูลไพ่ส่วนตัว (`privateCards`) ออกและแสดงเพียงจำนวนใบไพ่ (`cardCount`) เพื่อรักษาความลับและป้องกันการดักจับข้อมูลไพ่ของคู่แข่ง
- **`GameStateSnapshot`:** ชุดข้อมูลสถานะปัจจุบันที่เซิร์ฟเวอร์บรอดแคสต์ส่งให้ไคลเอนต์ทุกคนใช้ในการเรนเดอร์หน้าจอเกม

---

## 3. เอกสารและแผนภาพอ้างอิงความละเอียดสูง (Diagram & UML Assets)

สามารถตรวจสอบแผนภาพต้นฉบับและภาพประกอบความละเอียดสูงได้ที่ไดเรกทอรี `03-Documentation/`:

### 3.1 แผนภาพสถาปัตยกรรมระบบ (System Architecture Diagrams):

- [1. Server Architecture & Game Domain](../Diagram/1.Server%20Architecture%20%26%20Game%20Domain.png)
- [2. Core Game Logic & Schema Engine](../Diagram/2.Core%20Game%20Logic%20%26%20Schema%20Engine.png)
- [3. Client Architecture & UI State](../Diagram/3.Client%20Architecture%20%26%20UI%20State.png)

### 3.2 แผนภาพ UML รายโมเดล (Detailed UML Diagrams):

- [GameState UML Diagram](../UML/GameState_UML.png)
- [Player UML Diagram](../UML/Player_UML.png)
- [RoomManager UML Diagram](../UML/RoomManager_UML.png)
- [GameLogic UML Diagram](../UML/GameLogic_UML.png)
- [SocketHandler UML Diagram](../UML/Soket_Handler_UML.png)
- [Shared Types & Network Contracts](../UML/Shared%20Types%20%26%20Network%20Contracts_UML.png)
