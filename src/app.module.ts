import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CompetitionsModule } from './competitions/competitions.module';
import { PositionsModule } from './positions/position.module';
import { MarketsModule } from './markets/market.module';
import { WalletModule } from './wallet/wallet.module';
import { AdminModule } from './admin/admin.module'; // 👈 Make sure this file exists!

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DATABASE_HOST') || 'localhost',
        port: config.get<number>('DATABASE_PORT') || 5432,
        username: config.get('DATABASE_USER'),
        password: config.get('DATABASE_PASS'),
        database: config.get('DATABASE_NAME'),
        autoLoadEntities: true,
        synchronize: true, // Be careful with this in production!
      }),
    }),

    UsersModule,
    AuthModule,
    ScheduleModule.forRoot(),
    MarketsModule,
    WalletModule,
    PositionsModule,
    CompetitionsModule,
    AdminModule, // 👈 Added to resolve /admin/stats 404
  ],
})
export class AppModule {}