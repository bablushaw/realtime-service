import { Inject, Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { DatabaseModule, PG_POOL } from '../../database/pg.module';
import { AuthModule } from '../auth/auth.module';
import { DeviceTokensService } from './device-tokens.service';
import { JobFanoutService } from './job-fanout.service';
import { JobStatusHandler } from './job-status.handler';
import { PushService } from './push.service';
import { RealtimeController } from './realtime.controller';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
class PoolShutdown implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy() {
    await this.pool.end();
  }
}

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [RealtimeController, JobStatusHandler],
  providers: [
    RealtimeGateway,
    DeviceTokensService,
    PushService,
    JobFanoutService,
    PoolShutdown,
  ],
})
export class RealtimeModule {}
