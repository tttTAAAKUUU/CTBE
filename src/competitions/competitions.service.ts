// backend/src/competitions/competitions.service.ts
import { Injectable, NotFoundException, OnModuleInit, Logger, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Competition } from './entities/competition.entity';
import { Market } from '../markets/entities/market.entity';
import { WalletsService } from '../wallet/wallet.service';
import { User } from '../users/entities/user/user.entity';

@Injectable()
export class CompetitionsService implements OnModuleInit {
  private readonly logger = new Logger(CompetitionsService.name);

  constructor(
    @InjectRepository(Competition)
    private readonly repo: Repository<Competition>,

    @InjectRepository(Market)
    private readonly marketRepo: Repository<Market>,

    @Inject(forwardRef(() => WalletsService))
    private readonly walletsService: WalletsService,
  ) {}

  async onModuleInit() {
    await this.seedDummyData();
  }

  // --- EMERGENCY FIX METHOD ---
  async emergencyFixAssets(id: number) {
    const competition = await this.repo.findOne({ 
      where: { id },
      relations: ['allowedAssets'] 
    });
    
    if (!competition) throw new NotFoundException('Competition not found');
    
    // Fetch the first 10 active markets to link them
    const markets = await this.marketRepo.find({ take: 10 });
    
    competition.allowedAssets = markets;
    const saved = await this.repo.save(competition);
    this.logger.log(`🛠️ Emergency Fix: Linked ${markets.length} assets to Competition #${id}`);
    return saved;
  }

  async create(dto: any) {
    const assets = dto.marketIds?.length > 0 
      ? await this.marketRepo.findBy({ id: In(dto.marketIds) }) 
      : [];

    const newComp = this.repo.create({
      name: dto.name,
      description: dto.description || 'Global trading challenge.',
      prizePool: dto.prizePool,
      maxParticipants: dto.maxParticipants || 100,
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      status: 'active',
      allowedAssets: assets,
    });

    const saved = await this.repo.save(newComp);
    this.logger.log(`✨ Competition Created: ${saved.name}`);
    return saved;
  }

  async findOne(id: number) {
    const comp = await this.repo.findOne({ 
      where: { id },
      relations: ['allowedAssets', 'participants'] // ✅ Crucial for frontend
    });
    if (!comp) throw new NotFoundException(`Competition ${id} not found`);
    return comp;
  }

  async findAllActive() {
    return this.repo.find({
      where: { status: 'active' },
      order: { createdAt: 'DESC' },
      relations: ['allowedAssets', 'participants']
    });
  }

  async joinCompetition(compId: number, user: User) {
    const comp = await this.repo.findOne({
      where: { id: compId },
      relations: ['participants', 'allowedAssets'],
    });

    if (!comp) throw new NotFoundException(`Competition with ID ${compId} not found`);

    const isAlreadyJoined = comp.participants?.some((p) => p.id === user.id);
    if (isAlreadyJoined) throw new BadRequestException('You have already joined this competition');

    if (comp.participants && comp.participants.length >= comp.maxParticipants) {
      throw new BadRequestException('This competition has reached maximum capacity');
    }

    await this.walletsService.deductForEntryFee(user.id, 10);

    if (!comp.participants) comp.participants = [];
    comp.participants.push(user);

    await this.repo.save(comp);

    return {
      success: true,
      message: `Successfully joined ${comp.name}`,
      firstAssetId: comp.allowedAssets?.[0]?.id || 1, 
    };
  }

  async seedDummyData() {
    try {
      const count = await this.repo.count();
      if (count > 0) return;

      const dummyComps = [{
        name: "Dragon Lore Invitational",
        description: "High volatility trading for AWP enthusiasts.",
        prizePool: 5000,
        status: 'active' as const,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maxParticipants: 200,
      }];

      await this.repo.save(dummyComps);
      this.logger.log('🚀 Seeded initial competitions.');
    } catch (error) {
      this.logger.error('❌ Failed to seed:', error.message);
    }
  }

  async getLeaderboard(compId: number) {
    return [
      { userName: 'EliteTrader_99', pnl: 45.2, rank: 1 },
      { userName: 'SkinMaster', pnl: 32.8, rank: 2 },
    ];
  }
}