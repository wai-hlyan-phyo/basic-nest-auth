import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { JwtAuthGuard } from '../common/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles/roles.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import { TokenService } from './token.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    authenticateUser: jest.Mock;
    registerUser: jest.Mock;
    streamCpuUsage: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      authenticateUser: jest.fn(),
      registerUser: jest.fn(),
      streamCpuUsage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: TokenService, useValue: { verify: jest.fn() } },
        JwtAuthGuard,
        RolesGuard,
        Reflector,
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call AuthService.authenticateUser on login', () => {
    const dto: LoginDto = {
      email: 'user@example.com',
      password: 'password',
    };
    const response = { message: 'ok' };
    authService.authenticateUser.mockReturnValue(response);

    expect(controller.login(dto)).toBe(response);
    expect(authService.authenticateUser).toHaveBeenCalledWith(dto);
  });

  it('should call AuthService.registerUser on register', async () => {
    const dto: RegisterDto = {
      name: 'User',
      email: 'user@example.com',
      password: 'password',
      passwordConfirmation: 'password',
      role: 'owner',
    };
    const response = { id: 'user-id' };
    authService.registerUser.mockResolvedValue(response);

    await expect(controller.register(dto)).resolves.toBe(response);
    expect(authService.registerUser).toHaveBeenCalledWith(dto);
  });

  it('should return an admin-only route response', () => {
    expect(controller.adminOnly()).toEqual({
      message: 'Admin route access granted.',
    });
  });

  it('should stream CPU usage from AuthService', () => {
    const stream = of({
      type: 'cpu.usage',
      data: {
        usagePercent: 10,
        cores: 8,
        loadAverage: [0.1, 0.2, 0.3],
        timestamp: '2026-06-06T07:30:00.000Z',
      },
    });
    authService.streamCpuUsage.mockReturnValue(stream);

    expect(controller.streamCpuUsage()).toBe(stream);
    expect(authService.streamCpuUsage).toHaveBeenCalledTimes(1);
  });
});
