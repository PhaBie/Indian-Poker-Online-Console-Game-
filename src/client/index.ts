import { SocketClient } from './network/socketClient';
import { ClientState } from './state/ClientState';

export function startClient(customUrl?: string): void {
    // 1. รับ URL จาก Parameter หรือ argument ตอนรัน (ถ้าไม่ใส่ให้เป็น localhost:8080)
    const serverUrl = customUrl || process.argv[2] || 'ws://localhost:8080';

    console.log(`[Client] กำลังเชื่อมต่อไปยัง Server: ${serverUrl}`);

    // 2. สร้างตัวจัดการ Network และ State
    const socketClient = new SocketClient();
    const clientState = new ClientState();

    // 3. สั่งเชื่อมต่อ
    socketClient.connect(serverUrl);


}