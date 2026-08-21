import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CustomPostFieldDto {
  @ApiPropertyOptional({ example: 'bedrooms' })
  @IsString()
  @MinLength(1)
  key!: string;

  @ApiPropertyOptional({ example: 'Bedrooms' })
  @IsString()
  @MinLength(1)
  label!: string;

  @ApiPropertyOptional({ enum: ['text', 'number'] })
  @IsIn(['text', 'number'])
  type!: 'text' | 'number';

  @ApiPropertyOptional()
  @IsBoolean()
  required!: boolean;
}

export class UpdateAppSettingsDto {
  @ApiPropertyOptional({ example: 1, description: 'PKR charged per hour an ad runs' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  pricePerHourPkr?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  minImages?: number;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxImages?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  cityRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  areaRequired?: boolean;

  @ApiPropertyOptional({ type: [CustomPostFieldDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CustomPostFieldDto)
  customFields?: CustomPostFieldDto[];
}
