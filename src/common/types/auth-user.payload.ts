import { Role } from '../enums/role.enum';

export class AuthUserPayload {
  sub!: string;
  accountId!: string;
  sessionId!: string;
  role!: Role;
  countryCode!: string;
  mobileNumber!: string;
  tenantId!: string;
}
