// src/wallet/wallet.service.ts
import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { User } from '../users/entities/user/user.entity';
import { randomUUID } from 'crypto';
import { WalletTransactionStatus,WalletTransactionType } from './wallet.constants';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,

    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,

    private readonly dataSource: DataSource,
  ) {}

  async getWallet(userId: number): Promise<Wallet> {
    let wallet = await this.walletRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  async createWalletForUser(user: User): Promise<Wallet> {
    const wallet = this.walletRepo.create({
      user,
      currency: 'ZAR',
    });

    return this.walletRepo.save(wallet);
  }

  async initiateDeposit(user: User, amount: number) {
    if (user.kycStatus !== 'approved') {
      throw new ForbiddenException('KYC not approved');
    }

    if (amount <= 0) {
      throw new BadRequestException('Invalid amount');
    }

    const wallet = await this.getWallet(user.id);

    const tx = this.txRepo.create({
      wallet,
      type: WalletTransactionType.DEPOSIT,
      amount,
      status: WalletTransactionStatus.PENDING,
      reference: randomUUID(),
    });

    await this.txRepo.save(tx);

    return {
      reference: tx.reference,
      amount,
      currency: wallet.currency,
    };
  }

  async completeDeposit(reference: string, providerAmount: number) {
    await this.dataSource.transaction(async (manager) => {
      const tx = await manager.findOne(WalletTransaction, {
        where: { reference },
        relations: ['wallet'],
      });

      if (!tx) throw new NotFoundException('Transaction not found');
      if (tx.status === WalletTransactionStatus.COMPLETED) return;

      if (tx.amount !== providerAmount) {
        throw new BadRequestException('Deposit amount mismatch');
      }

      tx.status = WalletTransactionStatus.COMPLETED;
      tx.wallet.availableBalance += tx.amount;

      await manager.save(tx.wallet);
      await manager.save(tx);
    });
  }

  async lockFunds(userId: number, amount: number) {
    await this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, {
        where: { user: { id: userId } },
      });

      if (!wallet) throw new NotFoundException('Wallet not found');
      if (wallet.availableBalance < amount) {
        throw new BadRequestException('Insufficient funds');
      }

      wallet.availableBalance -= amount;
      wallet.lockedBalance += amount;

      await manager.save(wallet);
    });
  }

  async unlockAndSettle(userId: number, lockedAmount: number, payout: number) {
    await this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, {
        where: { user: { id: userId } },
      });

      if (!wallet) throw new NotFoundException('Wallet not found');

      wallet.lockedBalance -= lockedAmount;
      wallet.availableBalance += payout;

      await manager.save(wallet);

      await manager.save(
        manager.create(WalletTransaction, {
          wallet,
          type: WalletTransactionType.BET_SETTLEMENT,
          amount: payout - lockedAmount,
          status: WalletTransactionStatus.COMPLETED,
          reference: randomUUID(),
        }),
      );
    });
  }

  async withdraw(user: User, amount: number) {
    if (user.kycStatus !== 'approved') {
      throw new ForbiddenException('KYC not approved');
    }

    if (amount <= 0) {
      throw new BadRequestException('Invalid amount');
    }

    await this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, {
        where: { user: { id: user.id } },
      });

      if (!wallet) throw new NotFoundException('Wallet not found');
      if (wallet.availableBalance < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      wallet.availableBalance -= amount;

      await manager.save(wallet);

      await manager.save(
        manager.create(WalletTransaction, {
          wallet,
          type: WalletTransactionType.WITHDRAWAL,
          amount,
          status: WalletTransactionStatus.COMPLETED,
          reference: randomUUID(),
        }),
      );
    });

    return { success: true };
  }

  // src/wallet/wallet.service.ts

async deductForEntryFee(userId: number, amount: number) {
  await this.dataSource.transaction(async (manager) => {
    const wallet = await manager.findOne(Wallet, {
      where: { user: { id: userId } },
    });

    if (!wallet) throw new NotFoundException('Wallet not found');
    if (wallet.availableBalance < amount) {
      throw new BadRequestException('Insufficient balance for entry fee');
    }

    wallet.availableBalance -= amount;
    await manager.save(wallet);

    // Record the transaction
    await manager.save(
      manager.create(WalletTransaction, {
        wallet,
        type: 'BET_LOCK' as any, // Or add ENTRY_FEE to your constants
        amount: amount,
        status: WalletTransactionStatus.COMPLETED,
        reference: `JOIN-${randomUUID()}`,
      }),
    );
  });
}

async getTransactionHistory(userId: number) {
  const wallet = await this.getWallet(userId);
  return this.txRepo.find({
    where: { wallet: { id: wallet.id } },
    order: { createdAt: 'DESC' },
    take: 10,
  });
}

// TEMPORARY: Use this to give yourself test money
async addTestFunds(userId: number, amount: number) {
  const wallet = await this.getWallet(userId);
  wallet.availableBalance += amount;
  await this.walletRepo.save(wallet);
  
  await this.txRepo.save(
    this.txRepo.create({
      wallet,
      amount,
      type: WalletTransactionType.DEPOSIT,
      status: WalletTransactionStatus.COMPLETED,
      reference: `TEST-${randomUUID()}`,
    })
  );
  return wallet;
}
}
