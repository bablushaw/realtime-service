import { PushService } from './push.service';

describe('PushService', () => {
  it('does not send FCM or Expo push', async () => {
    const push = new PushService();
    const original = global.fetch;
    global.fetch = jest.fn() as never;
    try {
      await expect(
        push.send({
          tokens: [
            { fcmToken: 'native-device-token-value', platform: 'android' },
            { fcmToken: 'ExponentPushToken[abc]', platform: 'android' },
          ],
          title: 'New job nearby',
          body: 'A new request is in your inbox',
          data: { jobId: 'job-1', status: 'BROADCASTING', event: 'BROADCAST' },
        }),
      ).resolves.toEqual({ sent: 0, logged: 0 });
      expect(global.fetch).not.toHaveBeenCalled();
    } finally {
      global.fetch = original;
    }
  });
});
