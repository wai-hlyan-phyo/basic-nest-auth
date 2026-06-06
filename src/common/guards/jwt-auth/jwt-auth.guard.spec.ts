import { JwtAuthGuard } from './jwt-auth.guard';
import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import type { AuthTokenPayload } from '../../../auth/token.service';
import type { AuthenticatedRequest } from '../../interfaces/authenticated-user.interface';

describe('JwtAuthGuard', () => {
  const payload: AuthTokenPayload = {
    sub: 'user-id',
    name: 'User',
    email: 'user@example.com',
    role: 'admin',
    iat: 1,
    exp: 2,
  };

  const tokenService = {
    verify: jest.fn<ReturnType<(token: string) => AuthTokenPayload>, [string]>(),
  };

  const createContext = (request: AuthenticatedRequest): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    tokenService.verify.mockReturnValue(payload);
  });

  it('should be defined', () => {
    expect(new JwtAuthGuard(tokenService)).toBeDefined();
  });

  it('should authenticate bearer tokens and attach the user', () => {
    const guard = new JwtAuthGuard(tokenService);
    const request = {
      headers: {
        authorization: 'Bearer access-token',
      },
    } as AuthenticatedRequest;

    expect(guard.canActivate(createContext(request))).toBe(true);
    expect(tokenService.verify).toHaveBeenCalledWith('access-token');
    expect(request.user).toEqual({
      id: 'user-id',
      name: 'User',
      email: 'user@example.com',
      role: 'admin',
    });
  });

  it('should authenticate access_token query params for browser SSE', () => {
    const guard = new JwtAuthGuard(tokenService);
    const request = {
      headers: {},
      query: {
        access_token: 'access-token',
      },
    } as unknown as AuthenticatedRequest;

    expect(guard.canActivate(createContext(request))).toBe(true);
    expect(tokenService.verify).toHaveBeenCalledWith('access-token');
  });

  it('should reject requests without a bearer token', () => {
    const guard = new JwtAuthGuard(tokenService);
    const request = {
      headers: {},
    } as AuthenticatedRequest;

    expect(() => guard.canActivate(createContext(request))).toThrow(
      UnauthorizedException,
    );
  });
});
