import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

class HealthResponseDto {
  @ApiProperty({ example: 'OK' })
  status!: string;

  @ApiProperty({ example: 'realtime-service' })
  service!: string;

  @ApiProperty()
  timestamp!: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, type: HealthResponseDto })
  check(): HealthResponseDto {
    return {
      status: 'OK',
      service: 'realtime-service',
      timestamp: new Date().toISOString(),
    };
  }
}
