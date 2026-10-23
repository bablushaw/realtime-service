import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUserPayload } from '../../common/types/auth-user.payload';
import { RealtimeGateway } from './realtime.gateway';

@ApiTags('realtime')
@ApiBearerAuth('JWT')
@Controller('realtime')
export class RealtimeController {
  constructor(private readonly gateway: RealtimeGateway) {}

  @Get('me')
  @ApiOperation({ summary: 'Whether this user currently has a socket connected' })
  async me(@CurrentUser() user: AuthUserPayload) {
    return { connected: await this.gateway.isUserConnected(user.sub) };
  }
}
