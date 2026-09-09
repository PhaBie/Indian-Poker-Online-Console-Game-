import { PokerServer } from './src/server/index';

const server = new PokerServer();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;

server.start(PORT);

// จัดการกรณีผู้ใช้กด Ctrl+C เพื่อปิด Server ให้เรียบร้อย
process.on('SIGINT', () => {
  server.stop();
  process.exit(0);
});
