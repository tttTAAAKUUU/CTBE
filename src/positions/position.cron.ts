import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PositionsService } from './position.service';
import { MarketsService } from '../markets/market.service';


@Injectable()
export class PositionsCron {
  private readonly logger = new Logger(PositionsCron.name);

  constructor(
    private readonly positionsService: PositionsService,
    private readonly marketsService: MarketsService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async autoClosePositions() {
  const openPositions =
    await this.positionsService.getOpenPositions();

  for (const position of openPositions) {
    const snapshot =
      await this.marketsService.getLatestSnapshot(
        position.market.id,
      );

    const price = Number(snapshot.price);

    const shouldClose =
      await this.positionsService.evaluateAutoClose(
        position,
        price,
      );

    if (shouldClose) {
      await this.positionsService.closePosition(
        position.user,
        position.id,
        price,
      );
    }
  }
}

}
