import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class AddContactDto {
  @ApiProperty({ example: 'ali@example.com' })
  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiPropertyOptional({ example: 'Ali Property Dealer' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: '+92 300 1234567' })
  @IsOptional()
  @Transform(trim)
  @Matches(/^[0-9+()\-\s]{5,32}$/, { message: 'Enter a valid phone number' })
  phone?: string;
}

export class UpdateContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  name?: string;

  /** Empty string clears the phone number. */
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @Matches(/^([0-9+()\-\s]{5,32})?$/, { message: 'Enter a valid phone number' })
  phone?: string;
}
