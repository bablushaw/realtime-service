import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '../../common/enums/role.enum';
import { AuthUserPayload } from '../../common/types/auth-user.payload';

type JwtPayload = Partial<AuthUserPayload> & { sub: string; sid?: string };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
      issuer: config.get<string>('jwt.issuer'),
      audience: config.get<string>('jwt.audience'),
    });
  }

  validate(payload: JwtPayload): AuthUserPayload {
    return {
      sub: payload.sub,
      accountId: payload.accountId ?? '',
      sessionId: payload.sessionId ?? '',
      role: (payload.role as Role) ?? Role.CUSTOMER,
      countryCode: payload.countryCode ?? '',
      mobileNumber: payload.mobileNumber ?? '',
      tenantId: payload.tenantId ?? '',
    };
  }
}
