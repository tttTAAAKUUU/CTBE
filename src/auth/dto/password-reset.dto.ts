import { IsEmail, IsString, Length } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;
}

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @IsString()
  @Length(6, 6, { message: 'Code must be 6 digits' })
  code: string;

  @IsString()
  @Length(8, 128, { message: 'Password must be at least 8 characters' })
  newPassword: string;
}
