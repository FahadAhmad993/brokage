import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PropertyCategory } from '../../../common/enums/property-category.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PropertiesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: PropertyCategory,
    example: PropertyCategory.VILLAS,
  })
  @IsOptional()
  @IsEnum(PropertyCategory)
  category?: PropertyCategory;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  hostId?: string;
}
