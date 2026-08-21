import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PropertyEntity } from './entities/property.entity';
import { PropertiesQueryDto } from './dto/properties-query.dto';
import { CreatePropertyDto } from './dto/create-property.dto';
import { PropertyImageEntity } from './entities/property-image.entity';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(PropertyEntity)
    private readonly propertiesRepository: Repository<PropertyEntity>,
    @InjectRepository(PropertyImageEntity)
    private readonly imagesRepository: Repository<PropertyImageEntity>,
  ) {}

  async list(query: PropertiesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.propertiesRepository
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.host', 'host')
      .leftJoinAndSelect('property.images', 'images')
      .where('property.isPublished = :isPublished', { isPublished: true });

    if (query.category) {
      qb.andWhere('property.category = :category', {
        category: query.category,
      });
    }
    if (query.hostId) {
      qb.andWhere('property.hostId = :hostId', { hostId: query.hostId });
    }
    if (query.minPrice !== undefined) {
      qb.andWhere('property.priceMonthly >= :minPrice', {
        minPrice: query.minPrice,
      });
    }
    if (query.maxPrice !== undefined) {
      qb.andWhere('property.priceMonthly <= :maxPrice', {
        maxPrice: query.maxPrice,
      });
    }
    if (query.search) {
      qb.andWhere(
        '(property.title ILIKE :search OR property.location ILIKE :search)',
        {
          search: `%${query.search}%`,
        },
      );
    }

    qb.orderBy('property.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      items: items.map((property) => this.toResponse(property)),
      pagination: {
        page,
        limit,
        total,
        hasNext: page * limit < total,
      },
    };
  }

  async detail(id: string) {
    const property = await this.propertiesRepository.findOne({
      where: { id, isPublished: true },
      relations: { host: true, images: true },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return this.toResponse(property);
  }

  async create(hostId: string, dto: CreatePropertyDto) {
    const property = this.propertiesRepository.create({
      hostId,
      title: dto.title,
      location: dto.location,
      priceMonthly: dto.priceMonthly,
      category: dto.category,
      isPremium: dto.isPremium ?? false,
      description: dto.description,
      features: dto.features ?? [],
      isPublished: true,
    });

    const saved = await this.propertiesRepository.save(property);
    const images = dto.imageUrls.map((url, index) =>
      this.imagesRepository.create({
        propertyId: saved.id,
        url,
        sortOrder: index,
      }),
    );
    await this.imagesRepository.save(images);
    return this.detail(saved.id);
  }

  async listMine(hostId: string) {
    const rows = await this.propertiesRepository.find({
      where: { hostId },
      relations: { host: true, images: true },
      order: { updatedAt: 'DESC' },
    });
    return rows.map((row) => ({
      ...this.toResponse(row),
      ownerId: row.hostId,
      status: row.isPublished ? 'live' : 'paused',
    }));
  }

  async updateStatus(
    hostId: string,
    propertyId: string,
    status: 'live' | 'paused',
  ) {
    const property = await this.propertiesRepository.findOne({
      where: { id: propertyId },
      relations: { host: true, images: true },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (property.hostId !== hostId) {
      throw new ForbiddenException('You can only manage your own listings');
    }
    property.isPublished = status === 'live';
    const saved = await this.propertiesRepository.save(property);
    return {
      ...this.toResponse(saved),
      ownerId: saved.hostId,
      status,
    };
  }

  async remove(hostId: string, propertyId: string) {
    const property = await this.propertiesRepository.findOne({
      where: { id: propertyId },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (property.hostId !== hostId) {
      throw new ForbiddenException('You can only remove your own listings');
    }
    await this.propertiesRepository.delete({ id: propertyId });
    return { success: true };
  }

  private toResponse(property: PropertyEntity) {
    const orderedImages = [...(property.images ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const imageUrls = orderedImages.map((image) => image.url);
    return {
      id: property.id,
      title: property.title,
      location: property.location,
      priceMonthly: Number(property.priceMonthly),
      imageUrl: imageUrls[0] ?? '',
      imageUrls,
      category: property.category,
      isPremium: property.isPremium,
      features: (property.features ?? []).map((feature) => ({
        label: feature,
      })),
      description: property.description,
      lister: {
        id: property.host.id,
        displayName: property.host.displayName,
        avatarUrl: property.host.avatarUrl,
        bio: property.host.bio,
      },
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
    };
  }
}
