import {
  Injectable,
  UnauthorizedException,
  type OnModuleInit,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: string;
  name: string;
  iat: number;
  exp: number;
}

interface SignPayload {
  sub: string;
  email: string;
  role: string;
  name: string;
}

@Injectable()
export class TokenService implements OnModuleInit {
  readonly expiresInSeconds = 60 * 60;

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required in production');
    }
  }

  sign(payload: SignPayload): string {
    const now = Math.floor(Date.now() / 1000);
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };
    const body: AuthTokenPayload = {
      ...payload,
      role: payload.role.toLowerCase(),
      iat: now,
      exp: now + this.expiresInSeconds,
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedBody = this.base64UrlEncode(JSON.stringify(body));
    const data = `${encodedHeader}.${encodedBody}`;
    const signature = this.signData(data);

    return `${data}.${signature}`;
  }

  verify(token: string): AuthTokenPayload {
    const [encodedHeader, encodedBody, signature] = token.split('.');

    if (!encodedHeader || !encodedBody || !signature) {
      throw new UnauthorizedException('Invalid token.');
    }

    const expectedSignature = this.signData(`${encodedHeader}.${encodedBody}`);

    if (!this.isEqual(signature, expectedSignature)) {
      throw new UnauthorizedException('Invalid token.');
    }

    const payload = this.parsePayload(encodedBody);
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp <= now) {
      throw new UnauthorizedException('Token has expired.');
    }

    return payload;
  }

  private get secret(): string {
    return process.env.JWT_SECRET ?? 'dev-secret-change-me';
  }

  private signData(data: string): string {
    return createHmac('sha256', this.secret).update(data).digest('base64url');
  }

  private base64UrlEncode(value: string): string {
    return Buffer.from(value, 'utf8').toString('base64url');
  }

  private isEqual(value: string, expected: string): boolean {
    const valueBuffer = Buffer.from(value);
    const expectedBuffer = Buffer.from(expected);

    return (
      valueBuffer.length === expectedBuffer.length &&
      timingSafeEqual(valueBuffer, expectedBuffer)
    );
  }

  private parsePayload(encodedPayload: string): AuthTokenPayload {
    const decoded = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const payload = JSON.parse(decoded) as Partial<AuthTokenPayload>;

    if (
      !payload.sub ||
      !payload.email ||
      !payload.role ||
      !payload.name ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number'
    ) {
      throw new UnauthorizedException('Invalid token.');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role.toLowerCase(),
      name: payload.name,
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}
