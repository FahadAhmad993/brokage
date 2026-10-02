import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserContactEntity } from './entities/user-contact.entity';
import { UserEntity } from '../users/entities/user.entity';
import { AddContactDto, UpdateContactDto } from './dto/contact.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(UserContactEntity)
    private readonly contactRepository: Repository<UserContactEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async list(ownerId: string) {
    const rows = await this.contactRepository.find({
      where: { ownerId },
      relations: { contactUser: true },
    });
    return rows
      .map((row) => this.toDto(row))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }

  async add(ownerId: string, dto: AddContactDto) {
    const email = dto.email.trim().toLowerCase();
    const target = await this.userRepository
      .createQueryBuilder('u')
      .where('LOWER(u.email) = :email', { email })
      .getOne();
    // Same answer for "no such user" and "account blocked/disabled" so this
    // can't be used to probe which accounts an admin has suspended.
    if (!target || target.isBlocked || target.isDisabled) {
      throw new NotFoundException(
        'No Brokage account uses this email yet. Invite them to join!',
      );
    }
    if (target.id === ownerId) {
      throw new BadRequestException("That's your own email address");
    }

    let row = await this.contactRepository.findOne({
      where: { ownerId, contactUserId: target.id },
    });
    if (!row) {
      row = this.contactRepository.create({
        ownerId,
        contactUserId: target.id,
      });
    }
    if (dto.name !== undefined) row.name = dto.name || null;
    if (dto.phone !== undefined) row.phone = dto.phone || null;
    row = await this.contactRepository.save(row);
    row.contactUser = target;
    return this.toDto(row);
  }

  async update(ownerId: string, id: string, dto: UpdateContactDto) {
    const row = await this.contactRepository.findOne({
      where: { id, ownerId },
      relations: { contactUser: true },
    });
    if (!row) {
      throw new NotFoundException('Contact not found');
    }
    if (dto.name !== undefined) row.name = dto.name || null;
    if (dto.phone !== undefined) row.phone = dto.phone || null;
    await this.contactRepository.save(row);
    return this.toDto(row);
  }

  async remove(ownerId: string, id: string) {
    const result = await this.contactRepository.delete({ id, ownerId });
    if (!result.affected) {
      throw new NotFoundException('Contact not found');
    }
    return { success: true };
  }

  private toDto(row: UserContactEntity) {
    const u = row.contactUser;
    return {
      id: row.id,
      userId: row.contactUserId,
      name: row.name?.trim() || u?.displayName || 'User',
      displayName: u?.displayName ?? 'User',
      email: u?.email ?? '',
      phone: row.phone ?? null,
      avatarUrl: u?.avatarUrl ?? null,
    };
  }
}
