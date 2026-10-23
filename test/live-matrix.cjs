/**
 * Live matrix against running auth :3001, location :3002, request :3003, realtime :3004.
 * node test/live-matrix.cjs
 */
const jwt = require('jsonwebtoken');
const { io } = require('socket.io-client');
const { ClientProxyFactory, Transport } = require('@nestjs/microservices');

const SECRET =
  process.env.JWT_SECRET || 'nearo_dev_jwt_secret_change_in_prod_32chars_min_ok';

async function http(method, url, { token, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

function login(role, mobileNumber) {
  const base = {
    countryCode: '+91',
    mobileNumber,
    role,
    deviceId: `e2e-${role.toLowerCase()}-device`,
  };
  return http('POST', 'http://127.0.0.1:3001/api/v1/auth/otp/request', { body: base }).then(
    async (requested) => {
      const verified = await http('POST', 'http://127.0.0.1:3001/api/v1/auth/otp/verify', {
        body: { ...base, otp: '123456' },
      });
      return { requested, verified };
    },
  );
}

function connectSocket(token) {
  return new Promise((resolve, reject) => {
    const events = [];
    const socket = io('http://127.0.0.1:3004', {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
    });
    const timer = setTimeout(() => reject(new Error('socket timeout')), 8000);
    socket.on('connect', () => {
      clearTimeout(timer);
      resolve({
        socket,
        events,
        waitFor(predicate, ms = 8000) {
          const existing = events.find(predicate);
          if (existing) return Promise.resolve(existing);
          return new Promise((ok, no) => {
            const t = setTimeout(() => no(new Error('event timeout')), ms);
            const onEvent = (msg) => {
              if (predicate(msg)) {
                clearTimeout(t);
                socket.off('job.status', onEvent);
                ok(msg);
              }
            };
            socket.on('job.status', onEvent);
          });
        },
      });
    });
    socket.on('job.status', (msg) => events.push(msg));
    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function main() {
  for (const port of [3001, 3002, 3003, 3004]) {
    const health = await http('GET', `http://127.0.0.1:${port}/api/v1/health`);
    console.log(`GET :${port}/api/v1/health`, health.status, health.json?.service || health.json);
  }

  const bare = await new Promise((resolve) => {
    const socket = io('http://127.0.0.1:3004', {
      auth: {},
      transports: ['websocket'],
      reconnection: false,
    });
    const timer = setTimeout(() => resolve('timeout'), 4000);
    socket.on('connect', () => {
      clearTimeout(timer);
      socket.close();
      resolve('connected');
    });
    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      socket.close();
      resolve(err.message);
    });
  });
  console.log('socket without JWT', bare);

  const customerLogin = await login('CUSTOMER', '9000000003');
  const helperLogin = await login('HELPER', '9000000001');
  console.log('customer otp request', customerLogin.requested.status);
  console.log('customer otp verify', customerLogin.verified.status);
  console.log('helper otp request', helperLogin.requested.status);
  console.log('helper otp verify', helperLogin.verified.status);
  const customerToken = customerLogin.verified.json?.accessToken;
  const helperToken = helperLogin.verified.json?.accessToken;
  if (!customerToken || !helperToken) {
    console.log('customer body', JSON.stringify(customerLogin.verified.json));
    console.log('helper body', JSON.stringify(helperLogin.verified.json));
    process.exit(1);
  }
  const helperSub = jwt.decode(helperToken).sub;
  console.log('helper sub', helperSub);

  const helperSock = await connectSocket(helperToken);
  const customerSock = await connectSocket(customerToken);
  console.log('helper socket connected', helperSock.socket.connected);
  console.log('customer socket connected', customerSock.socket.connected);

  const client = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: { host: '127.0.0.1', port: 4004 },
  });
  const direct = helperSock.waitFor((msg) => msg.title === 'New job nearby');
  client.emit('job.status', {
    jobId: '00000000-0000-4000-8000-000000000001',
    status: 'BROADCASTING',
    event: 'BROADCAST',
    tenantId: 'IND',
    customerId: 'cust',
    helperId: null,
    recipientUserRoleIds: [helperSub],
    chrome: { title: 'New job nearby', body: 'A new request is in your inbox' },
    data: {
      jobId: '00000000-0000-4000-8000-000000000001',
      status: 'BROADCASTING',
      event: 'BROADCAST',
    },
    sound: true,
  }).subscribe({ error: (err) => console.log('tcp emit error', err.message) });
  const directMsg = await direct;
  console.log('tcp fan-out received', directMsg.title, directMsg.status);

  const presence = await http('POST', 'http://127.0.0.1:3002/api/v1/location/assets/presence', {
    token: helperToken,
    body: {
      status: 'ONLINE',
      categoryId: 'AC_REPAIR',
      latitude: 28.6139,
      longitude: 77.209,
    },
  });
  console.log('helper presence', presence.status, JSON.stringify(presence.json)?.slice(0, 240));

  const cleared = await http(
    'PATCH',
    'http://127.0.0.1:3003/api/v1/jobs/aaaaaaaa-0001-4000-8000-000000000004/cancel',
    { token: customerToken },
  );
  console.log('clear helper active seed job', cleared.status);

  const estimation = await http('POST', 'http://127.0.0.1:3003/api/v1/job-estimations', {
    token: customerToken,
    body: {
      categoryId: 'AC_REPAIR',
      catalogCategoryId: 'AC_CLEANING',
      subCategoryId: 'ac_filter',
      questionnaire: [
        { questionId: 'acType', answer: 'SPLIT' },
        { questionId: 'unitCount', answer: 1 },
      ],
    },
  });
  console.log('POST /job-estimations', estimation.status);
  const estimationId = estimation.json?.id || estimation.json?.data?.id;
  if (!estimationId) {
    console.log(JSON.stringify(estimation.json)?.slice(0, 500));
    process.exit(0);
  }

  const offered = helperSock.waitFor(
    (msg) => msg.title === 'New job nearby' && msg.jobId !== directMsg.jobId,
  );
  const created = await http('POST', 'http://127.0.0.1:3003/api/v1/jobs', {
    token: customerToken,
    body: {
      estimationId,
      requestMode: 'BROADCAST_ACCEPT',
      paymentMode: 'CASH',
      scope: { description: 'Filter clean' },
      schedule: { type: 'ASAP', timezone: 'Asia/Kolkata' },
      location: { lat: 28.6139, lng: 77.209, addressLine1: 'Connaught Place' },
      matching: { radiusM: 5000 },
    },
  });
  console.log('POST /jobs', created.status);
  if (created.status >= 400) {
    console.log(JSON.stringify(created.json)?.slice(0, 500));
    process.exit(0);
  }
  const jobId = created.json.id;
  const offer = await offered;
  console.log('helper socket offer', offer.title, offer.event);

  const paid = await http('POST', 'http://127.0.0.1:3003/api/v1/jobs/profession-fee/pay', {
    token: helperToken,
  });
  console.log('POST profession-fee/pay', paid.status);
  const accepted = await http('POST', `http://127.0.0.1:3003/api/v1/jobs/${jobId}/accept`, {
    token: helperToken,
  });
  console.log('POST accept', accepted.status);
  if (accepted.status < 400) {
    const assigned = await customerSock.waitFor(
      (msg) => msg.jobId === jobId && msg.status === 'ASSIGNED',
    );
    console.log('customer socket assigned', assigned.title);
    const progress = await http('PATCH', `http://127.0.0.1:3003/api/v1/jobs/${jobId}/progress`, {
      token: helperToken,
      body: { status: 'EN_ROUTE', lat: 28.6139, lng: 77.209 },
    });
    console.log('PATCH progress EN_ROUTE', progress.status, JSON.stringify(progress.json)?.slice(0, 240));
    if (progress.status < 400) {
      const enRoute = await customerSock.waitFor(
        (msg) => msg.jobId === jobId && msg.title === 'Helper is on the way',
      );
      console.log('customer socket en route', enRoute.title);
    }
    helperSock.socket.disconnect();
    const cancelled = await http('PATCH', `http://127.0.0.1:3003/api/v1/jobs/${jobId}/cancel`, {
      token: customerToken,
    });
    console.log('PATCH cancel with helper socket down', cancelled.status);
  } else {
    console.log(JSON.stringify(accepted.json)?.slice(0, 400));
    const cancelled = await http('PATCH', `http://127.0.0.1:3003/api/v1/jobs/${jobId}/cancel`, {
      token: customerToken,
    });
    console.log('PATCH cancel broadcasting job', cancelled.status);
  }

  helperSock.socket.close();
  customerSock.socket.close();
  await client.close();
  console.log('matrix done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
