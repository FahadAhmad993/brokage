import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { PropertyEntity } from './entities/property.entity';
import { PropertyImageEntity } from './entities/property-image.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PropertyEntity, PropertyImageEntity])],
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
