import { IsString, IsDateString } from 'class-validator';

export class StartKycDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsDateString()
  dateOfBirth: string;

  @IsString()
  addressLine1: string;

  @IsString()
  city: string;

  @IsString()
  country: string;
}
