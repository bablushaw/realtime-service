import { Injectable, Logger } from '@nestjs/common';
import { DeviceTokenRow } from './device-tokens.service';

export type PushRequest = {
  tokens: DeviceTokenRow[];
  title: string;
  body: string;
  data: Record<string, string>;
};

export type PushResult = { sent: number; logged: number };

/**
 * Sockets stay here. FCM and Expo push are owned by notification-service
 * so a job event is not delivered twice.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  async send(_request: PushRequest): Promise<PushResult> {
    this.logger.log('push skipped: notification-service owns FCM');
    return { sent: 0, logged: 0 };
  }
}
