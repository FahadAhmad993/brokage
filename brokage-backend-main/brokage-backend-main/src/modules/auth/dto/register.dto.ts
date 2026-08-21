import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'alex@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password@123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'Alex Rivera', minLength: 2 })
  @IsString()
  @MinLength(2)
  displayName!: string;

  @ApiPropertyOptional({ example: 'https://i.pravatar.cc/256?img=12' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
