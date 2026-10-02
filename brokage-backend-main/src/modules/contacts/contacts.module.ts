import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { UserContactEntity } from './entities/user-contact.entity';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserContactEntity, UserEntity])],
  controllers: [ContactsController],
  providers: [ContactsService],
})
export class ContactsModule {}
