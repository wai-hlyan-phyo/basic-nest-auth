import { PrismaService } from '@app/prisma';
import {
  BadRequestException,
  Injectable,
  Logger,
  type MessageEvent,
  UnauthorizedException,
} from '@nestjs/common';
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { cpus, loadavg } from 'node:os';
import { promisify } from 'node:util';
import { interval, map, type Observable } from 'rxjs';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import { UserStatus } from '../../prisma/generated/prisma/client';
import { TokenService } from './token.service';

const scrypt = promisify(scryptCallback);

interface CpuSnapshot {
  idle: number;
  total: number;
  cores: number;
}

@Injectable()
export class AuthService {
  logger: Logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async registerUser(registerDto: RegisterDto) {
    this.logger.log(`Registration request for ${registerDto.email}.`);

    const email = this.normalizeEmail(registerDto.email);
    const role = registerDto.role.trim().toLowerCase();

    if (!this.isSupportedRole(role)) {
      throw new BadRequestException('Role must be admin or user.');
    }

    if (registerDto.password !== registerDto.passwordConfirmation) {
      throw new BadRequestException('Passwords do not match.');
    }

    const password = await this.hashPassword(registerDto.password);

    return this.prisma.$transaction(async (tx) => {
      const isExist = await tx.user.count({
        where: { email },
      });
      if (isExist) {
        throw new BadRequestException('Please use different email.');
      }

      const newUser = await tx.user.create({
        data: {
          name: registerDto.name.trim(),
          email,
          password,
          status: UserStatus.PENDING,
          role: {
            connectOrCreate: {
              where: { name: role },
              create: {
                displayName: role.toUpperCase(),
                name: role,
              },
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          role: {
            select: {
              name: true,
            },
          },
        },
      });

      return {
        message: 'Registration successful.',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          status: newUser.status,
          role: newUser.role.name,
        },
      };
    });
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private isSupportedRole(role: string): boolean {
    return role === 'admin' || role === 'user';
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const key = (await scrypt(password, salt, 64)) as Buffer;

    return `scrypt:${salt}:${key.toString('hex')}`;
  }

  private async verifyPassword(
    password: string,
    storedPassword: string,
  ): Promise<boolean> {
    const [scheme, salt, key] = storedPassword.split(':');

    if (scheme !== 'scrypt' || !salt || !key) {
      return false;
    }

    const storedKey = Buffer.from(key, 'hex');
    const keyToVerify = (await scrypt(
      password,
      salt,
      storedKey.length,
    )) as Buffer;

    return (
      storedKey.length === keyToVerify.length &&
      timingSafeEqual(storedKey, keyToVerify)
    );
  }

  async authenticateUser(loginDto: LoginDto) {
    this.logger.log(`Authentication request for ${loginDto.email}.`);
    const email = this.normalizeEmail(loginDto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        status: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await this.verifyPassword(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (
      user.status === UserStatus.INACTIVE ||
      user.status === UserStatus.SUSPENDED
    ) {
      throw new UnauthorizedException('User is not allowed to login.');
    }

    const role = user.role.name.toLowerCase();
    const accessToken = this.tokenService.sign({
      sub: user.id,
      name: user.name,
      email: user.email,
      role,
    });

    return {
      message: 'Authentication successful.',
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.tokenService.expiresInSeconds,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        role,
      },
    };
  }

  streamCpuUsage(): Observable<MessageEvent> {
    let previousSnapshot = this.getCpuSnapshot();

    return interval(1000).pipe(
      map(() => {
        const currentSnapshot = this.getCpuSnapshot();
        const usagePercent = this.calculateCpuUsage(
          previousSnapshot,
          currentSnapshot,
        );
        previousSnapshot = currentSnapshot;

        return {
          type: 'cpu.usage',
          data: {
            usagePercent,
            cores: currentSnapshot.cores,
            loadAverage: loadavg(),
            timestamp: new Date().toISOString(),
          },
        };
      }),
    );
  }

  private getCpuSnapshot(): CpuSnapshot {
    const cpuInfo = cpus();
    const snapshot = cpuInfo.reduce(
      (totalSnapshot, cpu) => {
        const total = Object.values(cpu.times).reduce(
          (sum, time) => sum + time,
          0,
        );

        return {
          idle: totalSnapshot.idle + cpu.times.idle,
          total: totalSnapshot.total + total,
          cores: totalSnapshot.cores,
        };
      },
      {
        idle: 0,
        total: 0,
        cores: cpuInfo.length,
      },
    );

    return snapshot;
  }

  private calculateCpuUsage(
    previousSnapshot: CpuSnapshot,
    currentSnapshot: CpuSnapshot,
  ): number {
    const idleDelta = currentSnapshot.idle - previousSnapshot.idle;
    const totalDelta = currentSnapshot.total - previousSnapshot.total;

    if (totalDelta <= 0) {
      return 0;
    }

    const usagePercent = (1 - idleDelta / totalDelta) * 100;

    return Math.round(usagePercent * 100) / 100;
  }
}
