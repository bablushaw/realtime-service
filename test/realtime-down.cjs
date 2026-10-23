const payload = {
  countryCode: '+91',
  mobileNumber: '9000000003',
  role: 'CUSTOMER',
  deviceId: 'e2e-customer-down',
  otp: '123456',
};
async function http(method, url, body, token) {
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}
(async () => {
  try {
    const health = await http('GET', 'http://127.0.0.1:3004/api/v1/health');
    console.log('realtime health while down', health.status);
  } catch (err) {
    console.log('realtime health while down', err.cause?.code || err.message);
  }
  await http('POST', 'http://127.0.0.1:3001/api/v1/auth/otp/verify', payload);
  const verified = await http('POST', 'http://127.0.0.1:3001/api/v1/auth/otp/verify', payload);
  const token = verified.json.accessToken;
  const estimation = await http(
    'POST',
    'http://127.0.0.1:3003/api/v1/job-estimations',
    {
      categoryId: 'AC_REPAIR',
      catalogCategoryId: 'AC_CLEANING',
      subCategoryId: 'ac_filter',
      questionnaire: [
        { questionId: 'acType', answer: 'SPLIT' },
        { questionId: 'unitCount', answer: 1 },
      ],
    },
    token,
  );
  console.log('estimation', estimation.status);
  const created = await http(
    'POST',
    'http://127.0.0.1:3003/api/v1/jobs',
    {
      estimationId: estimation.json.id,
      requestMode: 'BROADCAST_ACCEPT',
      paymentMode: 'CASH',
      scope: { description: 'Realtime down' },
      schedule: { type: 'ASAP', timezone: 'Asia/Kolkata' },
      location: { lat: 28.6139, lng: 77.209, addressLine1: 'Connaught Place' },
      matching: { radiusM: 5000 },
    },
    token,
  );
  console.log('POST /jobs while realtime down', created.status, created.json?.id || created.json?.error?.code);
  if (created.json?.id) {
    const cancelled = await http(
      'PATCH',
      `http://127.0.0.1:3003/api/v1/jobs/${created.json.id}/cancel`,
      undefined,
      token,
    );
    console.log('PATCH cancel while realtime down', cancelled.status);
  }
})();
