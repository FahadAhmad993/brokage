import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommunityPostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  // City/area required-ness is admin-configurable (see AppSettingEntity),
  // so this DTO only checks type/length — required-or-not is enforced in
  // CommunityPostsService.create() against the live settings row.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'DHA Phase 6', description: 'Neighbourhood/area within the city' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  area?: string;

  // Loose bounds here (1–20) purely as a sanity ceiling against abuse — the
  // real min/max the user must satisfy comes from admin-configured
  // settings and is checked in the service, since it can change at runtime.
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  images!: string[];

  @ApiProperty({
    example: 24,
    description:
      'How many hours the ad should run once verified. Pick a preset (24/48/72...) or type any value between 1 and 720 hours (30 days). Price is computed server-side from this.',
  })
  @IsInt()
  @Min(1)
  @Max(720)
  durationHours!: number;

  @ApiPropertyOptional({
    description: 'Answers to any admin-added custom fields, keyed by field key.',
    example: { bedrooms: '3' },
  })
  @IsOptional()
  @IsObject()
  extraFields?: Record<string, string>;
}

