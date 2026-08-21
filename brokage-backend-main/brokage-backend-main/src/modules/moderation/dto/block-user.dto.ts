import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class BlockUserDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Id of the user to block.',
  })
  @IsUUID()
  userId!: string;
}
