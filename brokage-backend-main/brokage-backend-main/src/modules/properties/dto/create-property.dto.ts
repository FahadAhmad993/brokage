import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PropertyCategory } from '../../../common/enums/property-category.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePropertyDto {
  @ApiProperty({ example: 'The Ethereal Loft' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'Downtown, San Francisco' })
  @IsString()
  location!: string;

  @ApiProperty({ example: 2500, minimum: 0 })
  @IsNumber()
  @Min(0)
  priceMonthly!: number;

  @ApiProperty({
    enum: PropertyCategory,
    example: PropertyCategory.URBAN_LOFTS,
  })
  @IsEnum(PropertyCategory)
  category!: PropertyCategory;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @ApiPropertyOptional({ example: 'Beautiful loft with natural light.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String], example: ['2 beds', '1 bath'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiProperty({
    type: [String],
    example: ['https://picsum.photos/1200/800'],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  imageUrls!: string[];
}
