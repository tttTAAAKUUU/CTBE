// kyc.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { KycService } from './kyc.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    forwardRef(() => UsersModule),
  ],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
