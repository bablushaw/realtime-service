import { userRooms } from './job-status.message';
import { JobFanoutService } from './job-fanout.service';
import { JobStatusMessage } from './job-status.message';

describe('job fan-out', () => {
  it('targets one user room per recipient', () => {
    expect(userRooms(['a', 'b', 'a', ''])).toEqual(['user:a', 'user:b']);
  });

  it('emits sockets and does not send FCM', async () => {
    const emitToUser = jest.fn();
    const fanout = new JobFanoutService({ emitToUser } as never);
    const message: JobStatusMessage = {
      jobId: 'job-1',
      status: 'BROADCASTING',
      event: 'BROADCAST',
      tenantId: 'IND',
      customerId: 'cust',
      helperId: null,
      recipientUserRoleIds: ['cust', 'helper'],
      chrome: { title: 'New job nearby', body: 'A new request is in your inbox' },
      data: { jobId: 'job-1', status: 'BROADCASTING', event: 'BROADCAST' },
      sound: true,
    };
    const result = await fanout.deliver(message);
    expect(result.rooms).toEqual(['user:cust', 'user:helper']);
    expect(emitToUser.mock.calls.map((call) => call[0])).toEqual(['cust', 'helper']);
    expect(emitToUser.mock.calls[0][1]).toMatchObject({
      jobId: 'job-1',
      title: 'New job nearby',
      status: 'BROADCASTING',
    });
  });
});
