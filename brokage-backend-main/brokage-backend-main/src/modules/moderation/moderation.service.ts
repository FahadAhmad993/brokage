import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserBlockEntity } from './entities/user-block.entity';
import { ContentReportEntity } from './entities/content-report.entity';
import { UserEntity } from '../users/entities/user.entity';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(UserBlockEntity)
    private readonly blockRepository: Repository<UserBlockEntity>,
    @InjectRepository(ContentReportEntity)
    private readonly reportRepository: Repository<ContentReportEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new BadRequestException('You cannot block yourself');
    }
    const target = await this.usersRepository.findOne({
      where: { id: blockedId },
      select: { id: true },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }
    const existing = await this.blockRepository.findOne({
      where: { blockerId, blockedId },
    });
    if (!existing) {
      await this.blockRepository.save(
        this.blockRepository.create({ blockerId, blockedId }),
      );
    }
    return { success: true };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    await this.blockRepository.delete({ blockerId, blockedId });
    return { success: true };
  }

  /** Users that `blockerId` has blocked, with display info for the UI. */
  async listBlocked(blockerId: string) {
    const blocks = await this.blockRepository.find({
      where: { blockerId },
      order: { createdAt: 'DESC' },
    });
    const ids = blocks.map((b) => b.blockedId);
    if (ids.length === 0) {
      return { items: [] };
    }
    const users = await this.usersRepository.find({
      where: { id: In(ids) },
      select: { id: true, displayName: true, avatarUrl: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return {
      items: blocks
        .map((b) => byId.get(b.blockedId))
        .filter((u): u is UserEntity => !!u)
        .map((u) => ({
          id: u.id,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
        })),
    };
  }

  /** Ids of users `userId` has blocked — used to filter out their content. */
  async getBlockedUserIds(userId: string): Promise<string[]> {
    const blocks = await this.blockRepository.find({
      where: { blockerId: userId },
      select: { blockedId: true },
    });
    return blocks.map((b) => b.blockedId);
  }

  /** True if either user has blocked the other (symmetric gate for DMs). */
  async isBlockedEitherWay(a: string, b: string): Promise<boolean> {
    const count = await this.blockRepository.count({
      where: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    });
    return count > 0;
  }

  async createReport(reporterId: string, dto: CreateReportDto) {
    if (dto.reason === 'other' && !dto.details?.trim()) {
      throw new BadRequestException('Please describe the issue when picking "Other"');
    }
    const report = await this.reportRepository.save(
      this.reportRepository.create({
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        details: dto.details ?? null,
        status: 'open',
      }),
    );
    return { id: report.id, status: report.status };
  }

  // ---- Admin panel --------------------------------------------------------

  /**
   * Every submitted report, newest first, with the reporter and (when the
   * report is about a user) the reported user's display info resolved so
   * the admin table can show both people and block/disable either one.
   */
  async listReportsForAdmin() {
    const reports = await this.reportRepository.find({
      order: { createdAt: 'DESC' },
      relations: { reporter: true },
    });

    const userTargetIds = reports
      .filter((r) => r.targetType === 'user')
      .map((r) => r.targetId);
    const targetUsers = userTargetIds.length
      ? await this.usersRepository.find({
          where: { id: In(userTargetIds) },
          select: { id: true, displayName: true, avatarUrl: true, email: true, isBlocked: true, isDisabled: true },
        })
      : [];
    const targetById = new Map(targetUsers.map((u) => [u.id, u]));

    return reports.map((r) => ({
      id: r.id,
      status: r.status,
      reason: r.reason,
      details: r.details,
      createdAt: r.createdAt,
      targetType: r.targetType,
      targetId: r.targetId,
      reporter: {
        id: r.reporter?.id ?? r.reporterId,
        displayName: r.reporter?.displayName ?? 'User',
        avatarUrl: r.reporter?.avatarUrl ?? null,
      },
      reportedUser: targetById.has(r.targetId)
        ? {
            id: targetById.get(r.targetId)!.id,
            displayName: targetById.get(r.targetId)!.displayName,
            avatarUrl: targetById.get(r.targetId)!.avatarUrl ?? null,
            email: targetById.get(r.targetId)!.email,
            isBlocked: targetById.get(r.targetId)!.isBlocked,
            isDisabled: targetById.get(r.targetId)!.isDisabled,
          }
        : null,
    }));
  }

  async setReportStatus(id: string, status: 'reviewed' | 'actioned' | 'dismissed') {
    const result = await this.reportRepository.update({ id }, { status });
    if (!result.affected) {
      throw new NotFoundException('Report not found');
    }
    return { success: true, id, status };
  }
}
