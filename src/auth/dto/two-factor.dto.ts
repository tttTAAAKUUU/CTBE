import { IsString, IsEmail, Length, IsOptional } from 'class-validator';

export class Verify2faLoginDto {
  @IsString()
  tempToken: string;

  @IsString()
  @Length(6, 6)
  code: string;

  @IsOptional()
  @IsString()
  deviceToken?: string; // existing trusted-device token from cookie, if any
}

export class RequestActionCodeDto {
  @IsString()
  action: 'change-password' | 'change-email';
}

export class ChangePasswordWith2faDto {
  @IsString()
  oldPassword: string;

  @IsString()
  @Length(8)
  newPassword: string;

  @IsString()
  @Length(6, 6)
  code: string;
}

export class ChangeEmailWith2faDto {
  @IsEmail()
  newEmail: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
