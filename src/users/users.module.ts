// users.module.ts
import { MailModule } from '../mail/mail.module';
import { AuthModule } from '../auth/auth.module';
import { forwardRef } from '@nestjs/common';
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user/user.entity';
import { WalletModule } from '../wallet/wallet.module';
import { AuthModule } from '../auth/auth.module';
import { KycModule } from '../kyc/kyc.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => WalletModule),
    forwardRef(() => AuthModule),
    forwardRef(() => KycModule),
    MailModule,  
    forwardRef(() => AuthModule),   
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
