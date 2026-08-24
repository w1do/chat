// Smoke-клиент WebSocket: подписка на канал Reverb и ожидание события.
// Использование: node tools/smoke-websocket.mjs <host> <port> [app-key]
import { createRequire } from 'node:module';

// pusher-js установлен в workspace chat-web (pnpm isolation).
const require = createRequire(new URL('../apps/chat-web/package.json', import.meta.url));
const Pusher = require('pusher-js');

const [host = '127.0.0.1', port = '8080', appKey = 'devkey'] = process.argv.slice(2);

const client = new Pusher(appKey, {
  wsHost: host,
  wsPort: Number(port),
  forceTLS: false,
  enabledTransports: ['ws'],
  cluster: 'mt1',
  disableStats: true,
});

const timeout = setTimeout(() => {
  console.error('smoke websocket: FAIL (event not received in 15s)');
  process.exit(1);
}, 15000);

client.connection.bind('state_change', ({ current }) => console.log(`ws state: ${current}`));

const channel = client.subscribe('smoke-channel');
channel.bind('smoke.event.v1', (payload) => {
  console.log(`event received: ${JSON.stringify(payload)}`);
  console.log('smoke websocket: OK (real event delivered through Reverb)');
  clearTimeout(timeout);
  client.disconnect();
  process.exit(0);
});
