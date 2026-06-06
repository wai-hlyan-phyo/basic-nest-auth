import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Alice Doe' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ example: 'alice@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123', writeOnly: true })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'password123', writeOnly: true })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  passwordConfirmation!: string;

  @ApiProperty({ enum: ['admin', 'user'], example: 'user' })
  @IsIn(['admin', 'user'])
  @IsNotEmpty()
  @IsString()
  role!: string;
}
