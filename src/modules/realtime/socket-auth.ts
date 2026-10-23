export type HandshakeLike = {
  auth?: { token?: unknown };
  headers?: { authorization?: unknown };
};

export function bearerFromHandshake(
  authToken: unknown,
  authorization?: unknown,
): string | null {
  const raw =
    typeof authToken === 'string' && authToken.trim()
      ? authToken
      : typeof authorization === 'string'
        ? authorization
        : '';
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^Bearer\s+/i, '');
}

export type SocketAuthUser = { sub: string; role?: string };

export function createSocketAuth(
  verify: (token: string) => SocketAuthUser,
) {
  return (
    socket: { handshake: HandshakeLike; data: Record<string, unknown> },
    next: (err?: Error) => void,
  ) => {
    try {
      const token = bearerFromHandshake(
        socket.handshake.auth?.token,
        socket.handshake.headers?.authorization,
      );
      if (!token) {
        next(new Error('unauthorized'));
        return;
      }
      const user = verify(token);
      if (!user?.sub) {
        next(new Error('unauthorized'));
        return;
      }
      socket.data.user = user;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  };
}
