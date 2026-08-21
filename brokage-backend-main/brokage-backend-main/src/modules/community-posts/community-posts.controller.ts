import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';

import {
  CommunityPostsService,
} from './community-posts.service';

import {
  CreateCommunityPostDto,
} from './dto/create-community-post.dto';

import type {
  AuthenticatedRequest,
} from '../../common/middleware/jwt-auth.middleware';

@Controller('community/posts')
export class CommunityPostsController {
  constructor(
    private readonly communityPostsService: CommunityPostsService,
  ) {}

  @Get()
  async findAll() {
    return this.communityPostsService.findAll();
  }

  /** Ads belonging to the current user, any status — "My Ads" screen. */
  @Get('mine')
  async findMine(@Req() req: AuthenticatedRequest) {
    return this.communityPostsService.findMine(req.user.sub);
  }

  /** Price preview while the user is still picking a duration, before posting. */
  @Get('quote')
  async quote(@Query('durationHours') durationHours: string) {
    return this.communityPostsService.quotePrice(Number(durationHours) || 24);
  }

  /** Live pricing + image limits + any admin-added custom fields, used to
   *  build the "post an ad" form and its price preview on the client. */
  @Get('config')
  async config() {
    return this.communityPostsService.getPostConfig();
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.communityPostsService.findOne(id);
  }

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateCommunityPostDto,
  ) {
    const userId = req.user.sub;

    return this.communityPostsService.create(
      userId,
      dto,
    );
  }
}
