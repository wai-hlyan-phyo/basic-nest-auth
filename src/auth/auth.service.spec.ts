import type { TestingModule } from '@nestjs/testing';
import { PrismaService } from '@app/prisma';
import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { AuthService } from './auth.service';
import type { RegisterDto } from './dto/register.dto';
import { TokenService } from './token.service';

const scrypt = promisify(scryptCallback);

interface CountUserArgs {
  where: {
    email: string;
  };
}

interface CreateUserArgs {
  data: {
    name: string;
    email: string;
    password: string;
    role: {
      connectOrCreate: {
        where: {
          name: string;
        };
        create: {
          displayName: string;
          name: string;
        };
      };
    };
  };
  select: {
    id: boolean;
    name: boolean;
    email: boolean;
    status: boolean;
    role: {
      select: {
        name: boolean;
      };
    };
  };
}

interface FindUniqueUserArgs {
  where: {
    email: string;
  };
  select: {
    id: boolean;
    name: boolean;
    email: boolean;
    password: boolean;
    status: boolean;
    role: {
      select: {
        name: boolean;
      };
    };
  };
}

interface LoginUser {
  id: string;
  name: string;
  email: string;
  password: string;
  status: string;
  role: {
    name: string;
  };
}

const createdUser = {
  id: 'user-id',
  name: 'User',
  email: 'user@example.com',
  status: 'PENDING',
  role: {
    name: 'user',
  },
};

type CountUser = (args: CountUserArgs) => Promise<number>;
type CreateUser = (args: CreateUserArgs) => Promise<unknown>;
type FindUniqueUser = (args: FindUniqueUserArgs) => Promise<LoginUser | null>;

interface MockTransaction {
  user: {
    count: jest.MockedFunction<CountUser>;
    create: jest.MockedFunction<CreateUser>;
  };
}

type TransactionCallback = (tx: MockTransaction) => Promise<unknown>;
type PrismaTransaction = (callback: TransactionCallback) => Promise<unknown>;
type SignToken = (payload: {
  sub: string;
  name: string;
  email: string;
  role: string;
}) => string;

const createPasswordHash = async (password: string): Promise<string> => {
  const salt = 'test-salt';
  const key = (await scrypt(password, salt, 64)) as Buffer;

  return `scrypt:${salt}:${key.toString('hex')}`;
};

const createMockTransaction = (
  countResult: number,
  createResult: unknown = createdUser,
): MockTransaction => ({
  user: {
    count: jest
      .fn<ReturnType<CountUser>, Parameters<CountUser>>()
      .mockResolvedValue(countResult),
    create: jest
      .fn<ReturnType<CreateUser>, Parameters<CreateUser>>()
      .mockResolvedValue(createResult),
  },
});

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    $transaction: jest.MockedFunction<PrismaTransaction>;
    user: {
      findUnique: jest.MockedFunction<FindUniqueUser>;
    };
  };
  let tokenService: {
    expiresInSeconds: number;
    sign: jest.MockedFunction<SignToken>;
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn<
        ReturnType<PrismaTransaction>,
        Parameters<PrismaTransaction>
      >(),
      user: {
        findUnique: jest.fn<
          ReturnType<FindUniqueUser>,
          Parameters<FindUniqueUser>
        >(),
      },
    };
    tokenService = {
      expiresInSeconds: 3600,
      sign: jest.fn<ReturnType<SignToken>, Parameters<SignToken>>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: TokenService,
          useValue: tokenService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should register a new user with a normalized email', async () => {
    const dto: RegisterDto = {
      name: 'User',
      email: ' USER@example.com ',
      password: 'password',
      passwordConfirmation: 'password',
      role: 'user',
    };
    const tx = createMockTransaction(0, createdUser);

    prisma.$transaction.mockImplementation((callback) => callback(tx));

    await expect(service.registerUser(dto)).resolves.toEqual({
      message: 'Registration successful.',
      user: {
        id: 'user-id',
        name: 'User',
        email: 'user@example.com',
        status: 'PENDING',
        role: 'user',
      },
    });
    expect(tx.user.count).toHaveBeenCalledWith({
      where: { email: 'user@example.com' },
    });
    expect(tx.user.create).toHaveBeenCalledTimes(1);
    expect(tx.user.create.mock.calls[0]?.[0].data.name).toBe('User');
    expect(tx.user.create.mock.calls[0]?.[0].data.email).toBe(
      'user@example.com',
    );
    expect(tx.user.create.mock.calls[0]?.[0].data.password).not.toBe(
      'password',
    );
    expect(tx.user.create.mock.calls[0]?.[0].data.password).toMatch(
      /^scrypt:[a-f0-9]+:[a-f0-9]+$/,
    );
    expect(tx.user.create.mock.calls[0]?.[0].data.role.connectOrCreate).toEqual(
      {
        where: { name: 'user' },
        create: {
          displayName: 'USER',
          name: 'user',
        },
      },
    );
    expect(tx.user.create.mock.calls[0]?.[0].select).toEqual({
      id: true,
      name: true,
      email: true,
      status: true,
      role: {
        select: {
          name: true,
        },
      },
    });
  });

  it('should reject mismatched password confirmation', async () => {
    const dto: RegisterDto = {
      name: 'User',
      email: 'user@example.com',
      password: 'password',
      passwordConfirmation: 'different',
      role: 'user',
    };

    await expect(service.registerUser(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('should normalize role names before creating a user', async () => {
    const dto: RegisterDto = {
      name: 'User',
      email: 'user@example.com',
      password: 'password',
      passwordConfirmation: 'password',
      role: ' ADMIN ',
    };
    const tx = createMockTransaction(0);

    prisma.$transaction.mockImplementation((callback) => callback(tx));

    await service.registerUser(dto);
    expect(tx.user.create.mock.calls[0]?.[0].data.role.connectOrCreate).toEqual(
      {
        where: { name: 'admin' },
        create: {
          displayName: 'ADMIN',
          name: 'admin',
        },
      },
    );
  });

  it('should reject duplicate emails', async () => {
    const dto: RegisterDto = {
      name: 'User',
      email: 'user@example.com',
      password: 'password',
      passwordConfirmation: 'password',
      role: 'user',
    };
    const tx = createMockTransaction(1);

    prisma.$transaction.mockImplementation((callback) => callback(tx));

    await expect(service.registerUser(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.user.create).not.toHaveBeenCalled();
  });

  it('should authenticate a user and return a bearer token', async () => {
    const password = await createPasswordHash('password');
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-id',
      name: 'User',
      email: 'user@example.com',
      password,
      status: 'ACTIVE',
      role: {
        name: 'ADMIN',
      },
    });
    tokenService.sign.mockReturnValue('access-token');

    await expect(
      service.authenticateUser({
        email: ' USER@example.com ',
        password: 'password',
      }),
    ).resolves.toEqual({
      message: 'Authentication successful.',
      accessToken: 'access-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: {
        id: 'user-id',
        name: 'User',
        email: 'user@example.com',
        status: 'ACTIVE',
        role: 'admin',
      },
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'user@example.com' },
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
    expect(tokenService.sign).toHaveBeenCalledWith({
      sub: 'user-id',
      name: 'User',
      email: 'user@example.com',
      role: 'admin',
    });
  });

  it('should reject login with an invalid password', async () => {
    const password = await createPasswordHash('password');
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-id',
      name: 'User',
      email: 'user@example.com',
      password,
      status: 'ACTIVE',
      role: {
        name: 'user',
      },
    });

    await expect(
      service.authenticateUser({
        email: 'user@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toThrow('Invalid email or password.');
    expect(tokenService.sign).not.toHaveBeenCalled();
  });

  it('should reject suspended users on login', async () => {
    const password = await createPasswordHash('password');
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-id',
      name: 'User',
      email: 'user@example.com',
      password,
      status: 'SUSPENDED',
      role: {
        name: 'user',
      },
    });

    await expect(
      service.authenticateUser({
        email: 'user@example.com',
        password: 'password',
      }),
    ).rejects.toThrow('User is not allowed to login.');
    expect(tokenService.sign).not.toHaveBeenCalled();
  });
});
