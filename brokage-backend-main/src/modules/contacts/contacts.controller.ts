import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { ContactsService } from './contacts.service';
import { AddContactDto, UpdateContactDto } from './dto/contact.dto';

@UseGuards(JwtAuthGuard)
@ApiTags('Contacts')
@ApiBearerAuth('bearer')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @ApiOperation({ summary: 'My saved contacts' })
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.contactsService.list(user.sub);
  }

  @ApiOperation({ summary: 'Add a contact by their account email' })
  @HttpCode(200)
  @Post()
  add(@CurrentUser() user: JwtPayload, @Body() dto: AddContactDto) {
    return this.contactsService.add(user.sub, dto);
  }

  @ApiOperation({ summary: 'Rename a contact / change its phone note' })
  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.update(user.sub, id, dto);
  }

  @ApiOperation({ summary: 'Remove a contact' })
  @Delete(':id')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.contactsService.remove(user.sub, id);
  }
}
