import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createSocketAuth, SocketAuthUser } from './socket-auth';
import { JobStatusSocketEvent } from './job-status.message';

type Verified = SocketAuthUser & { role?: string };

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.server = server;
    server.use(
      createSocketAuth((token) => this.verify(token)) as (
        socket: Socket,
        next: (err?: Error) => void,
      ) => void,
    );
  }

  async handleConnection(client: Socket) {
    const user = client.data.user as Verified | undefined;
    const verified = user?.sub ? user : this.userFromHandshake(client);
    if (!verified?.sub) {
      client.disconnect(true);
      return;
    }
    client.data.user = verified;
    await client.join(`user:${verified.sub}`);
    if (verified.role === 'CUSTOMER' || verified.role === 'HELPER') {
      await client.join(`role:${verified.role}`);
    }
  }

  emitToUser(userRoleId: string, body: JobStatusSocketEvent) {
    this.server?.to(`user:${userRoleId}`).emit('job.status', body);
  }

  async isUserConnected(userRoleId: string): Promise<boolean> {
    if (!this.server) return false;
    const sockets = await this.server.in(`user:${userRoleId}`).fetchSockets();
    return sockets.length > 0;
  }

  private userFromHandshake(client: Socket): Verified | null {
    try {
      const raw = client.handshake.auth?.token ?? client.handshake.headers?.authorization;
      const token = typeof raw === 'string' ? raw.replace(/^Bearer\s+/i, '').trim() : '';
      if (!token) return null;
      return this.verify(token);
    } catch (err) {
      this.logger.warn(
        `socket auth failed: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  private verify(token: string): Verified {
    const payload = this.jwt.verify<Verified>(token, {
      secret: this.config.getOrThrow<string>('jwt.secret'),
      issuer: this.config.get<string>('jwt.issuer'),
      audience: this.config.get<string>('jwt.audience'),
    });
    if (!payload?.sub) {
      throw new Error('unauthorized');
    }
    return { sub: payload.sub, role: payload.role };
  }
}
