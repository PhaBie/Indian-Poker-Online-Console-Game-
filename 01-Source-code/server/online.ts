import { once } from 'events';
import { PokerServer } from './index';

export async function startOnlineServer() {
  if (!process.env.NGROK_AUTHTOKEN)
    throw new Error('Set NGROK_AUTHTOKEN on the server before starting Online mode.');
  const port = Number(process.env.ONLINE_PORT || 8081);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('Invalid ONLINE_PORT.');
  const server = new PokerServer('INTERNET');
  server.start(port, '127.0.0.1');
  try {
    await once(server.wss!, 'listening');
    const ngrok = await import('@ngrok/ngrok');
    const listener = await ngrok.forward({
      addr: `127.0.0.1:${port}`,
      authtoken: process.env.NGROK_AUTHTOKEN,
      ...(process.env.NGROK_DOMAIN ? { domain: process.env.NGROK_DOMAIN } : {}),
    });
    const url = listener.url();
    if (!url) {
      await listener.close();
      throw new Error('ngrok did not provide an endpoint.');
    }
    console.log(
      `[Online] Client configuration: POKER_ONLINE_URL=${url.replace(/^https:/, 'wss:')}`,
    );
    return {
      server,
      stop: async () => {
        await listener.close();
        server.stop();
      },
    };
  } catch (error) {
    server.stop();
    throw error;
  }
}

if (import.meta.main) {
  startOnlineServer()
    .then(({ stop }) => {
      const shutdown = () => {
        void stop().finally(() => process.exit(0));
      };
      process.once('SIGINT', shutdown);
      process.once('SIGTERM', shutdown);
    })
    .catch((err) => {
      console.error(
        'Online startup failed. Check NGROK_AUTHTOKEN, NGROK_DOMAIN, port availability and connectivity.',
      );
      console.error(err);
      process.exitCode = 1;
    });
}
