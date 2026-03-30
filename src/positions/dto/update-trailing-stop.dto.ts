import { IsNumber, Min } from 'class-validator';

export class UpdateTrailingStopDto {
  @IsNumber()
  @Min(0.1)
  trailingPercent: number;
}
