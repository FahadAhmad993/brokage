import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateDisplayPostDto } from './create-display-post.dto';

/**
 * Editing an existing post can change its photos/specs, but not the paid
 * duration — that was already charged and verified; a duration change
 * would need to go through the same pay-and-verify flow as a new post.
 */
export class UpdateDisplayPostDto extends PartialType(
  OmitType(CreateDisplayPostDto, ['durationHours'] as const),
) {}
