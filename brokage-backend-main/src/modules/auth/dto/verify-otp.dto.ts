import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit code emailed to the user',
  })
  @IsString()
  @Length(6, 6)
  code!: string;

  @ApiProperty({ enum: ['signup', 'login'] })
  @IsIn(['signup', 'login'])
  purpose!: 'signup' | 'login';
}
