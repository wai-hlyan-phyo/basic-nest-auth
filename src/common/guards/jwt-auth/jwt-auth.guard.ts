import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from '../../../auth/token.service';
import type { AuthenticatedRequest } from '../../interfaces/authenticated-user.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token =
      this.extractBearerToken(request) ?? this.extractQueryToken(request);

    if (!token) {
      throw new UnauthorizedException('Bearer token is required.');
    }

    const payload = this.tokenService.verify(token);
    request.user = {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };

    return true;
  }

  private extractBearerToken(request: AuthenticatedRequest): string | undefined {
    const authorization = request.headers.authorization;

    if (!authorization) {
      return undefined;
    }

    const [type, token] = authorization.split(' ');

    if (type?.toLowerCase() !== 'bearer' || !token) {
      return undefined;
    }

    return token;
  }

  private extractQueryToken(request: AuthenticatedRequest): string | undefined {
    const accessToken = request.query?.access_token;

    if (typeof accessToken !== 'string' || !accessToken) {
      return undefined;
    }

    return accessToken;
  }
}
