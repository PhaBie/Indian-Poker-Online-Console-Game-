import WebSocket from 'ws';

export function startClient(): void {
  // เชื่อมต่อไปที่ Server ของเราที่พอร์ต 8080
  const ws = new WebSocket('ws://localhost:8080');
  const name = prompt('โปรดระบุชื่อผู้เล่น: ');
  // เมื่อ Client เชื่อมต่อกับ Server สำเร็จ
  ws.on('open', () => {
    console.log(`✅ ${name} เชื่อมต่อกับ Server สำเร็จแล้ว!`);
    // สร้าง Object ระบุคำสั่งและข้อมูลที่ต้องการส่ง
    const request = {
      type: 'JOIN_ROOM',
      payload: { playerName: name },
    };

    // ต้องแปลง Object เป็น JSON String เสมอก่อนส่ง
    ws.send(JSON.stringify(request));
  });
  // ดักรับข้อความที่ Server ส่งกลับมา
  ws.on('message', (data) => {
    // แปลง JSON String ที่ได้จาก Server กลับเป็น Object
    const response = JSON.parse(data.toString());

    // ดึงเฉพาะ message ออกมาโชว์
    console.log(`📩 [Status] : ${response.message}`);
  });
}

// สั่งรันฟังก์ชันทันทีเมื่อรันไฟล์นี้
startClient();
