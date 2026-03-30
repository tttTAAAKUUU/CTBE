// src/markets/price-empire.client.ts
import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class PriceEmpireClient {
  async fetchPrices(): Promise<
    {
      externalId: string;
      price: number;
    }[]
  > {
    const res = await axios.get(
      'https://api.pricempire.com/v2/items',
      {
        headers: {
          Authorization: `Bearer ${process.env.PRICE_EMPIRE_API_KEY}`,
        },
      },
    );

    return res.data.items.map((item) => ({
      externalId: item.id,
      price: item.market_price,
    }));
  }
}
