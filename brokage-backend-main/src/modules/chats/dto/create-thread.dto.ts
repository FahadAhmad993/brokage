import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Frozen copy of a community ad's listing info. Sent when opening a chat
 * from an ad's advertiser icon/name — NOT a Property lookup, so no
 * relatedPropertyId/UUID validation here; the client sends whatever it
 * already has displayed on the ad card.
 */
export class RelatedListingSnapshotDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ example: '2-bed flat near DHA' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/.../photo.jpg' })
  @IsString()
  imageUrl!: string;

  @ApiProperty({ example: 'Lahore' })
  @IsString()
  location!: string;

  @ApiProperty({ example: 0 })
  @IsNumber()
  priceMonthly!: number;
}

export class CreateThreadDto {
  @ApiProperty({ enum: ['direct', 'group'], example: 'direct' })
  @IsIn(['direct', 'group'])
  type!: 'direct' | 'group';

  @ApiProperty({ example: 'Alex Rivera' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  relatedPropertyId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  peerUserId?: string;

  @ApiPropertyOptional({ type: RelatedListingSnapshotDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RelatedListingSnapshotDto)
  relatedListingSnapshot?: RelatedListingSnapshotDto;
}

//comment data 1

// import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
// import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// export class CreateThreadDto {
//   @ApiProperty({ enum: ['direct', 'group'], example: 'direct' })
//   @IsIn(['direct', 'group'])
//   type!: 'direct' | 'group';

//   @ApiProperty({ example: 'Alex Rivera' })
//   @IsString()
//   title!: string;

//   @ApiPropertyOptional({ format: 'uuid' })
//   @IsOptional()
//   @IsUUID()
//   relatedPropertyId?: string;

//   @ApiPropertyOptional({ format: 'uuid' })
//   @IsOptional()
//   @IsUUID()
//   peerUserId?: string;
// }
