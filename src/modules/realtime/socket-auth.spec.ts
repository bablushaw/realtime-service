import { createSocketAuth } from './socket-auth';

describe('socket auth', () => {
  const verify = (token: string) => {
    if (token !== 'good') throw new Error('bad');
    return { sub: 'user-1', role: 'HELPER' };
  };

  it('rejects a handshake with no JWT', () => {
    const next = jest.fn();
    const socket = { handshake: { auth: {}, headers: {} }, data: {} };
    createSocketAuth(verify)(socket, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(socket.data.user).toBeUndefined();
  });

  it('rejects an invalid JWT', () => {
    const next = jest.fn();
    const socket = {
      handshake: { auth: { token: 'nope' }, headers: {} },
      data: {},
    };
    createSocketAuth(verify)(socket, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('accepts a bearer token and stores the user', () => {
    const next = jest.fn();
    const socket = {
      handshake: { auth: { token: 'Bearer good' }, headers: {} },
      data: {} as Record<string, unknown>,
    };
    createSocketAuth(verify)(socket, next);
    expect(next).toHaveBeenCalledWith();
    expect(socket.data.user).toEqual({ sub: 'user-1', role: 'HELPER' });
  });
});
