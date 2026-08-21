import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetUserFlagDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  value!: boolean;

  @ApiProperty({
    required: false,
    description:
      'Shown to the user on their forced-logout screen when disabling/blocking (e.g. reason picked while actioning a report).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
