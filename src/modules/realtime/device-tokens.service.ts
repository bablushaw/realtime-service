import { Inject, Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../database/pg.module';

export type DeviceTokenRow = {
  fcmToken: string;
  platform: string | null;
};

@Injectable()
export class DeviceTokensService {
  private readonly logger = new Logger(DeviceTokensService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Read-only. Auth owns writes. user_roles.id is the JWT sub.
   */
  async tokensForUserRoleIds(ids: string[]): Promise<DeviceTokenRow[]> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return [];
    try {
      const result = await this.pool.query<{ fcm_token: string; platform: string | null }>(
        `SELECT d.fcm_token, d.platform
         FROM devices d
         WHERE d.account_id IN (
           SELECT account_id FROM user_roles WHERE id = ANY($1::uuid[])
         )
           AND d.fcm_token IS NOT NULL`,
        [unique],
      );
      return result.rows
        .filter((row) => row.fcm_token)
        .map((row) => ({ fcmToken: row.fcm_token, platform: row.platform }));
    } catch (err) {
      this.logger.warn(
        `device token lookup skipped: ${err instanceof Error ? err.message : err}`,
      );
      return [];
    }
  }
}
