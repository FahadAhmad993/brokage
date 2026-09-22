import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiCommonErrorResponses,
  ApiEnvelopeResponse,
} from '../../common/swagger/api-envelope.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary:
      'Register a new account — sends a verification code to the email, does not log in yet',
  })
  @ApiBody({ type: RegisterDto })
  @ApiEnvelopeResponse({
    status: 201,
    description: 'Verification code sent',
    messageExample: 'Resource created successfully',
  })
  @ApiCommonErrorResponses()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({
    summary:
      "Check credentials and send a sign-in code to the account's email — does not return a token yet",
  })
  @ApiBody({ type: LoginDto })
  @ApiEnvelopeResponse({
    description: 'Code sent',
    messageExample: 'Request successful',
  })
  @ApiCommonErrorResponses()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({
    summary:
      'Verify the emailed code — this is what actually returns the JWT access token',
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiEnvelopeResponse({
    description: 'Verified — access token issued',
    messageExample: 'Request successful',
  })
  @ApiCommonErrorResponses()
  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @ApiOperation({
    summary:
      'Resend the code if the user never got it — rate-limited to once per 60 seconds',
  })
  @ApiBody({ type: ResendOtpDto })
  @ApiEnvelopeResponse({
    description: 'Code resent (if eligible)',
    messageExample: 'Request successful',
  })
  @ApiCommonErrorResponses()
  @Post('resend-otp')
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }
}
