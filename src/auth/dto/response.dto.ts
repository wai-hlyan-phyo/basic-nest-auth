import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({ example: 'Admin route access granted.' })
  message!: string;
}

export class UserResponseDto {
  @ApiProperty({ example: '018f2db4-544a-7f21-91b5-4ad5aef4f5c8' })
  id!: string;

  @ApiProperty({ example: 'Alice Doe' })
  name!: string;

  @ApiProperty({ example: 'alice@example.com' })
  email!: string;

  @ApiProperty({ example: 'PENDING' })
  status!: string;

  @ApiProperty({ example: 'admin' })
  role!: string;
}

export class RegisterResponseDto {
  @ApiProperty({ example: 'Registration successful.' })
  message!: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}

export class LoginResponseDto {
  @ApiProperty({ example: 'Authentication successful.' })
  message!: string;

  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIuLi4ifQ.signature',
  })
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: string;

  @ApiProperty({ example: 3600 })
  expiresIn!: number;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}

export class CpuUsageResponseDto {
  @ApiProperty({ example: 18.42 })
  usagePercent!: number;

  @ApiProperty({ example: 8 })
  cores!: number;

  @ApiProperty({ example: [0.48, 0.36, 0.22] })
  loadAverage!: number[];

  @ApiProperty({ example: '2026-06-06T07:30:00.000Z' })
  timestamp!: string;
}
