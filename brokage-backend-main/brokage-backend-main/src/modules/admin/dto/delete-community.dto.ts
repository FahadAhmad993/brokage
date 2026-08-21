import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeleteCommunityDto {
  @ApiPropertyOptional({ example: 'Merged into another community' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
