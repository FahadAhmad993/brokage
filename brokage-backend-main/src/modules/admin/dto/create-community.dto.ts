import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommunityDto {
  @ApiProperty({ example: 'Home Renovation Tips' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  title!: string;
}
