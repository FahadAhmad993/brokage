import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDisplayPostDto {
  // 1–7 per the product spec ("6 to 7 pictures"); loose ceiling here, the
  // real min/max is re-checked in the service against the live setting.
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsString({ each: true })
  images!: string[];

  @ApiProperty({
    example: 5,
    description: 'Plot/house size in Marla — the one required spec.',
  })
  @IsNumber()
  @Min(0.5)
  @Max(10000)
  marlaSize!: number;

  @ApiPropertyOptional({ example: '5 Marla corner plot, near park' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 'Lahore' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'DHA Phase 6' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  area?: string;

  @ApiPropertyOptional({
    description:
      'Optional spec answers — bedrooms, bathrooms, kitchen, carporch, tv lounge, etc. Anything left out is simply not shown.',
    example: { bedrooms: '3', bathrooms: '2', carporch: 'yes' },
  })
  @IsOptional()
  @IsObject()
  extraFields?: Record<string, string>;

  @ApiProperty({
    example: 24,
    description:
      'How many hours the post should run once verified. Price is computed server-side from this.',
  })
  @IsInt()
  @Min(1)
  @Max(720)
  durationHours!: number;
}
