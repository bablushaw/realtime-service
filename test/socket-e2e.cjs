/**
 * Health + socket handshake against a running realtime-service.
 * Usage: node test/socket-e2e.cjs
 */
const http = require('http');
const jwt = require('jsonwebtoken');
const { io } = require('socket.io-client');

const BASE = process.env.REALTIME_URL || 'http://127.0.0.1:3004';
const SECRET =
  process.env.JWT_SECRET || 'nearo_dev_jwt_secret_change_in_prod_32chars_min_ok';
const HELPER_SUB = '22222222-2222-4222-8222-222222222222';

function get(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }),
        );
      })
      .on('error', reject);
  });
}

function connect(token) {
  return new Promise((resolve) => {
    const socket = io(BASE, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      timeout: 4000,
      reconnection: false,
    });
    const timer = setTimeout(() => {
      socket.close();
      resolve({ ok: false, reason: 'timeout' });
    }, 5000);
    socket.on('connect', () => {
      clearTimeout(timer);
      socket.close();
      resolve({ ok: true });
    });
    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      socket.close();
      resolve({ ok: false, reason: err.message });
    });
  });
}

async function main() {
  const health = await get(`${BASE}/api/v1/health`);
  console.log('GET /api/v1/health', health.status, health.body);
  if (health.status !== 200) process.exit(1);

  const rejected = await connect(null);
  console.log('socket without JWT', rejected);
  if (rejected.ok) {
    console.error('expected handshake rejection');
    process.exit(1);
  }

  const token = jwt.sign(
    {
      sub: HELPER_SUB,
      accountId: 'acc',
      sessionId: 'sess',
      role: 'HELPER',
      countryCode: 'IN',
      mobileNumber: '9000000001',
      tenantId: 'IND',
    },
    SECRET,
    { issuer: 'nearo-auth', audience: 'nearo-apps', expiresIn: '1h' },
  );
  const accepted = await connect(token);
  console.log(`socket user:${HELPER_SUB}`, accepted);
  if (!accepted.ok) process.exit(1);
  console.log('e2e ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
