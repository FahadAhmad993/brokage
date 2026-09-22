import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional } from 'class-validator';

export class ResendOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    enum: ['signup', 'login'],
    description:
      "Omit to let the server infer it from the account's verification state.",
  })
  @IsOptional()
  @IsIn(['signup', 'login'])
  purpose?: 'signup' | 'login';
}
