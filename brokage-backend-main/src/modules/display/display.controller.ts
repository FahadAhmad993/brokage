import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DisplayService } from './display.service';
import { CreateDisplayPostDto } from './dto/create-display-post.dto';
import { UpdateDisplayPostDto } from './dto/update-display-post.dto';
import type { AuthenticatedRequest } from '../../common/middleware/jwt-auth.middleware';

@ApiTags('Display')
@ApiBearerAuth('bearer')
@Controller('display')
export class DisplayController {
  constructor(private readonly displayService: DisplayService) {}

  // ---- Config / pricing -----------------------------------------------

  @ApiOperation({
    summary: 'Live pricing + image bounds for the "Add Post" form.',
  })
  @Get('config')
  async config() {
    return this.displayService.getPostConfig();
  }

  @ApiOperation({
    summary: 'Price preview while picking a duration, before posting.',
  })
  @Get('quote')
  async quote(@Query('durationHours') durationHours: string) {
    return this.displayService.quotePrice(Number(durationHours) || 24);
  }

  // ---- Community search → broker cards ----------------------------------

  @ApiOperation({
    summary:
      'Search live Display posts (e.g. "5 marla") and return one card per matching broker, for the Community search results grid.',
  })
  @Get('search')
  async search(@Query('q') q: string) {
    return this.displayService.searchBrokers(q ?? '');
  }

  // ---- My Display (owner) -----------------------------------------------

  @ApiOperation({
    summary: 'My own Display — every post regardless of status.',
  })
  @Get('mine')
  async findMine(@Req() req: AuthenticatedRequest) {
    return this.displayService.findMine(req.user.sub);
  }

  @ApiOperation({ summary: 'My Display cover photo.' })
  @Get('mine/profile')
  async myProfile(@Req() req: AuthenticatedRequest) {
    return this.displayService.getProfile(req.user.sub);
  }

  @ApiOperation({ summary: 'Set/replace my Display cover photo.' })
  @Patch('mine/profile')
  async setMyCover(
    @Req() req: AuthenticatedRequest,
    @Body('coverImageUrl') coverImageUrl: string | null,
  ) {
    return this.displayService.setCover(req.user.sub, coverImageUrl ?? null);
  }

  @ApiOperation({ summary: 'Create a new Display post.' })
  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateDisplayPostDto,
  ) {
    return this.displayService.create(req.user.sub, dto);
  }

  @ApiOperation({ summary: 'Edit one of my own Display posts.' })
  @Patch(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDisplayPostDto,
  ) {
    return this.displayService.update(req.user.sub, id, dto);
  }

  @ApiOperation({ summary: 'Delete one of my own Display posts.' })
  @Delete(':id')
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.displayService.remove(req.user.sub, id);
  }

  @ApiOperation({ summary: 'Mark one of my own Display posts as Sold.' })
  @Patch(':id/sold')
  async markSold(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.displayService.markSold(req.user.sub, id);
  }

  // ---- Viewing someone else's Display -------------------------------------

  @ApiOperation({ summary: "Another user's Display cover photo." })
  @Get('user/:userId/profile')
  async userProfile(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.displayService.getProfile(userId);
  }

  @ApiOperation({
    summary: "Another user's Display — only their live (active/sold) posts.",
  })
  @Get('user/:userId')
  async findForUser(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.displayService.findForUser(userId);
  }

  // ---- Single post (must come after the more specific routes above) -------

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.displayService.findOne(id);
  }
}
