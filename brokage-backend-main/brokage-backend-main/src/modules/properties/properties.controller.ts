import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PropertiesQueryDto } from './dto/properties-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyStatusDto } from './dto/update-property-status.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiCommonErrorResponses,
  ApiEnvelopeResponse,
} from '../../common/swagger/api-envelope.decorator';

@ApiTags('Properties')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @ApiOperation({ summary: 'List properties with filtering and pagination' })
  @ApiEnvelopeResponse({ description: 'Properties fetched successfully' })
  @ApiCommonErrorResponses()
  @Get()
  list(@Query() query: PropertiesQueryDto) {
    return this.propertiesService.list(query);
  }

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List properties created by the current user' })
  @ApiEnvelopeResponse({ description: 'My listings fetched successfully' })
  @ApiCommonErrorResponses()
  @UseGuards(JwtAuthGuard)
  @Get('me/listings')
  myListings(@CurrentUser() user: JwtPayload) {
    return this.propertiesService.listMine(user.sub);
  }

  @ApiOperation({ summary: 'Get property details by ID' })
  @ApiParam({ name: 'propertyId', format: 'uuid' })
  @ApiEnvelopeResponse({ description: 'Property details fetched successfully' })
  @ApiCommonErrorResponses()
  @Get(':propertyId')
  detail(@Param('propertyId', new ParseUUIDPipe()) propertyId: string) {
    return this.propertiesService.detail(propertyId);
  }

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Create a new property listing' })
  @ApiBody({ type: CreatePropertyDto })
  @ApiEnvelopeResponse({
    status: 201,
    description: 'Property created successfully',
    messageExample: 'Resource created successfully',
  })
  @ApiCommonErrorResponses()
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePropertyDto) {
    return this.propertiesService.create(user.sub, dto);
  }

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update listing live/paused status' })
  @ApiParam({ name: 'propertyId', format: 'uuid' })
  @ApiBody({ type: UpdatePropertyStatusDto })
  @ApiEnvelopeResponse({ description: 'Listing status updated successfully' })
  @ApiCommonErrorResponses()
  @UseGuards(JwtAuthGuard)
  @Patch(':propertyId/status')
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('propertyId', new ParseUUIDPipe()) propertyId: string,
    @Body() dto: UpdatePropertyStatusDto,
  ) {
    return this.propertiesService.updateStatus(
      user.sub,
      propertyId,
      dto.status,
    );
  }

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Delete a listing owned by current user' })
  @ApiParam({ name: 'propertyId', format: 'uuid' })
  @ApiEnvelopeResponse({ description: 'Listing removed successfully' })
  @ApiCommonErrorResponses()
  @UseGuards(JwtAuthGuard)
  @Delete(':propertyId')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('propertyId', new ParseUUIDPipe()) propertyId: string,
  ) {
    return this.propertiesService.remove(user.sub, propertyId);
  }
}
