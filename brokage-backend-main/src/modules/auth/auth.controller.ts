import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiCommonErrorResponses,
  ApiEnvelopeResponse,
} from '../../common/swagger/api-envelope.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new user account' })
  @ApiBody({ type: RegisterDto })
  @ApiEnvelopeResponse({
    status: 201,
    description: 'User registered successfully',
    messageExample: 'Resource created successfully',
  })
  @ApiCommonErrorResponses()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Login and receive JWT access token' })
  @ApiBody({ type: LoginDto })
  @ApiEnvelopeResponse({
    description: 'Login successful',
    messageExample: 'Request successful',
  })
  @ApiCommonErrorResponses()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
