/**
 * @file types.ts
 * @description โครงสร้างข้อมูลกลางสำหรับเชื่อมต่อระหว่าง Client และ Server (Shared Types)
 */

// ==========================================
// 1. Domain Primitives (โครงสร้างพื้นฐาน)
// ==========================================

export type Suit = 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';

/**
 * ลำดับแต้มของไพ่ (2-14)
 * หมายเหตุ: 11=J, 12=Q, 13=K, 14=A
 */
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export type HandRank =
    | 'TRAIL'
    | 'PURE_SEQUENCE'
    | 'SEQUENCE'
    | 'COLOR'
    | 'PAIR'
    | 'HIGH_CARD';

export type PlayerStatus = 'WAITING' | 'ACTIVE' | 'FOLDED' | 'DISCONNECTED';
export type GameActionType = 'BET' | 'CALL' | 'RAISE' | 'FOLD' | 'SHOW';

/** สถานะของห้อง เพื่อให้ Client สลับหน้าจอระหว่าง Lobby กับโต๊ะเกมได้ถูก */
export type RoomPhase = 'LOBBY' | 'PLAYING' | 'ENDED';

// ==========================================
// 2. Entities & DTOs
// ==========================================

export interface Card {
    readonly suit: Suit;
    readonly rank: Rank;
}

/**
 * ข้อมูล State ผู้เล่นภายในระบบ Server (Domain Entity)
 * คำเตือน: ห้ามส่งโครงสร้างนี้ผ่าน WebSocket โดยตรง เพื่อป้องกันการรั่วไหลของข้อมูล privateCards
 */
export interface ServerPlayer {
    id: string;
    name: string;
    chips: number;
    bet: number;
    status: PlayerStatus;
    privateCards: Card[];
}

/**
 * Data Transfer Object (DTO) สำหรับแสดงผลฝั่ง Client
 * ใช้สำหรับ Broadcast ข้อมูลผู้เล่นโดยผ่านการ Filter ข้อมูลที่ละเอียดอ่อนออกแล้ว
 */
export interface PublicPlayerDTO {
    id: string;
    name: string;
    chips: number;
    bet: number;
    status: PlayerStatus;
}

/**
 * โครงสร้างสำหรับบันทึกลง JSON File (Persistence)
 */
export interface RoomSaveData {
    roomId: string;
    history: any[]; // ทีม Server สามารถกำหนดโครงสร้างการเก็บประวัติเพิ่มเติมได้
}

// ==========================================
// 3. Network Contracts (WebSocket Payload)
// ==========================================

/**
 * โครงสร้างข้อมูลขาเข้า (Client -> Server)
 */
export type ClientEvent =
    | { type: 'CREATE_ROOM'; payload: { playerName: string } }
    | { type: 'JOIN_ROOM'; payload: { playerName: string; roomId: string } }
    | { type: 'LEAVE_ROOM' }
    | { type: 'START_GAME' } // Host กดเริ่มเกม
    | {
        type: 'PLAYER_ACTION';
        payload: {
            action: GameActionType;
            /** จำเป็นต้องระบุค่าเมื่อ action เป็น BET หรือ RAISE */
            amount?: number;
        };
    };

/**
 * โครงสร้างข้อมูลขาออก (Server -> Client)
 */
export type ServerEvent =
    | { type: 'ERROR'; message: string }
    | {
        type: 'ROOM_CREATED'; // Server ตอบกลับเมื่อสร้างห้องสำเร็จ
        payload: { roomId: string };
    }
    | {
        type: 'GAME_STATE_UPDATE';
        payload: {
            roomId: string;
            phase: RoomPhase;
            hostId: string; // ใช้บอกว่าใครคือเจ้าของห้อง
            pot: number;
            currentTurnPlayerId: string | null;
            players: PublicPlayerDTO[];
            /** ไพ่ส่วนตัว จะถูกส่งให้ตรงกับ session ของ Client เท่านั้น (ถ้าอยู่ใน Lobby จะเป็น array ว่าง) */
            myCards: Card[];
        };
    }
    | {
        type: 'GAME_RESULT';
        payload: {
            winnerId: string;
            winningHand: HandRank;
            /** ข้อมูลไพ่ที่ถูกเปิดเผยเมื่อจบเกม Key คือ Player ID */
            exposedCards: Record<string, Card[]>;
        };
    };