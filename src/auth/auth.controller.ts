import { Controller, Post,Get, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req) {
  return req.user;
}


  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
  ) {
    const user = await this.authService.validateUser(
      body.email,
      body.password,
    );

    return this.authService.login(user);
  }

  @Post('verify-email')
async verifyEmail(
  @Body() body: { email: string; code: string },
) {
  return this.authService.verifyEmail(body.email, body.code);
}



}
