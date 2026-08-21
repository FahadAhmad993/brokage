import { Transform, Type } from 'class-transformer';
import {
   IsArray,
  IsLatitude,
  IsLongitude,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LocationContextDto {
  @ApiProperty({ example: 6.5244 })
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: 3.3792 })
  @IsLongitude()
  longitude!: number;

  /** Human-readable place name or address; falls back to coordinates on the client. */
  @ApiPropertyOptional({ example: 'Lekki Phase 1, Lagos' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;
}

export class CommunityPostContextDto {
  @ApiProperty({ example: '2f4b7c...' })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: '2 Bed House in Lahore' })
  @IsString()
  @MaxLength(100)
  title!: string;

  @ApiProperty({ example: 'Beautiful 2 bed house...' })
  @IsString()
  @MaxLength(5000)
  description!: string;

  @ApiProperty({ example: 'Lahore' })
  @IsString()
  @MaxLength(100)
  city!: string;

  @ApiProperty({ example: ['https://...', 'https://...'] })
  @IsArray()
  @IsString({ each: true })
  images!: string[];

  @ApiProperty({ example: '2f4b7c...' })
  @IsUUID()
  authorId!: string;

  @ApiPropertyOptional({ example: 'Fahad Ahmad' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  authorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  authorAvatarUrl?: string;
}



export class SendMessageDto {
  @ApiProperty({ example: 'Hi, is this listing still available?' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;

  /**
   * Client-generated idempotency key (UUID-ish, max 64 chars). The backend
   * dedupes per (authorId, clientId), so a retry of the same logical message
   * returns the original row rather than creating a duplicate.
   */
  @ApiPropertyOptional({
    example: '8d3e1c5f-9a8b-4d4e-8f9a-1b2c3d4e5f60',
    description: 'Client-generated idempotency key (1–64 chars).',
  })
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value !== 'string') {
      return value;
    }
    const t = value.trim();
    return t === '' ? undefined : t;
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_-]+$/)
  clientId?: string;

  /**
   * Optional location attachment. When present, the message is rendered as a
   * shared-location bubble with a static map preview.
   */
  @ApiPropertyOptional({ type: () => LocationContextDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LocationContextDto)
  locationContext?: LocationContextDto;

  @ApiPropertyOptional({
  example: 'https://res.cloudinary.com/example/image/upload/chat/image.jpg',
  description: 'Optional image URL attached to the message.',
})
@IsOptional()
@IsString()
@MaxLength(2048)
imageUrl?: string;


@ApiPropertyOptional({
  type: () => CommunityPostContextDto,
  description: 'Community Add attached to this chat message.',
})
@IsOptional()
@IsObject()
@ValidateNested()
@Type(() => CommunityPostContextDto)
communityPostContext?: CommunityPostContextDto;


}
