import { Injectable, Logger } from '@nestjs/common';
import { JobStatusMessage, JobStatusSocketEvent, userRooms } from './job-status.message';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class JobFanoutService {
  private readonly logger = new Logger(JobFanoutService.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  async deliver(message: JobStatusMessage): Promise<{ rooms: string[] }> {
    const rooms = userRooms(message.recipientUserRoleIds);
    const event: JobStatusSocketEvent = {
      jobId: message.jobId,
      status: message.status,
      event: message.event,
      title: message.chrome.title,
      body: message.chrome.body,
      at: new Date().toISOString(),
    };
    for (const room of rooms) {
      this.gateway.emitToUser(room.slice('user:'.length), event);
    }
    this.logger.log(
      `socket fan-out job=${message.jobId} rooms=${rooms.join(',') || 'none'}`,
    );
    return { rooms };
  }
}
