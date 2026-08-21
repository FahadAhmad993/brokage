import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { ReportTargetType } from '../entities/content-report.entity';

const TARGET_TYPES: ReportTargetType[] = ['user', 'message', 'listing'];

/** Fixed reason codes shown as checkboxes in the report sheet, plus a free-text fallback. */
export const REPORT_REASONS = ['spam', 'suspicious_activity', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export class CreateReportDto {
  @ApiProperty({ enum: TARGET_TYPES, description: 'What is being reported.' })
  @IsIn(TARGET_TYPES)
  targetType!: ReportTargetType;

  @ApiProperty({
    description:
      'Id of the reported entity (user id, message id, or property id).',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  targetId!: string;

  @ApiProperty({
    enum: REPORT_REASONS,
    description: 'Reason picked from the checkboxes: "spam", "suspicious_activity", or "other" (pair with `details`).',
  })
  @IsIn(REPORT_REASONS)
  reason!: ReportReason;

  @ApiProperty({
    required: false,
    description: 'Free-text details from the reporter. Required when reason is "other".',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  details?: string;
}
