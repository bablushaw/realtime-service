import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { JobFanoutService } from './job-fanout.service';
import { parseJobStatus } from './job-status.message';

@Controller()
export class JobStatusHandler {
  private readonly logger = new Logger(JobStatusHandler.name);

  constructor(private readonly fanout: JobFanoutService) {}

  @EventPattern('job.status')
  async onJobStatus(@Payload() raw: unknown) {
    const message = parseJobStatus(raw);
    if (!message) {
      this.logger.warn('job.status ignored: invalid payload');
      return;
    }
    try {
      await this.fanout.deliver(message);
    } catch (err) {
      this.logger.error(
        `job.status fan-out failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
