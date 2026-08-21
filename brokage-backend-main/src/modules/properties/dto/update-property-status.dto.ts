import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePropertyStatusDto {
  @ApiProperty({ enum: ['live', 'paused'], example: 'paused' })
  @IsIn(['live', 'paused'])
  status!: 'live' | 'paused';
}
