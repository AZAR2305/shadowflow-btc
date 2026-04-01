import { NextResponse } from 'next/server';
import { PythPriceService } from '@/lib/server/pythPriceService';

/**
 * GET /api/prices/btc-strk
 * Get current BTC and STRK prices
 * Returns: { btc: price, strk: price, rate: btc/strk }
 */
export async function GET() {
  try {
    const pythService = PythPriceService.getInstance();
    const priceMap = await pythService.getPrices(['BTC', 'STRK']);

    const btcPrice = priceMap.get('BTC');
    const strkPrice = priceMap.get('STRK');

    if (!btcPrice || !strkPrice) {
      return NextResponse.json(
        { error: 'Failed to fetch prices' },
        { status: 500 }
      );
    }

    const btcValue = btcPrice.formattedPrice;
    const strkValue = strkPrice.formattedPrice;

    return NextResponse.json({
      btc: {
        symbol: 'BTC',
        price: btcValue,
        priceRaw: btcPrice.price,
        confidence: btcPrice.conf,
        exponent: btcPrice.expo,
        publishTime: btcPrice.publishTime,
      },
      strk: {
        symbol: 'STRK',
        price: strkValue,
        priceRaw: strkPrice.price,
        confidence: strkPrice.conf,
        exponent: strkPrice.expo,
        publishTime: strkPrice.publishTime,
      },
      rate: {
        btcToStrk: strkValue / btcValue,
        strkToBtc: btcValue / strkValue,
        timestamp: Math.max(btcPrice.publishTime, strkPrice.publishTime),
      },
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error fetching prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prices', message },
      { status: 500 }
    );
  }
}
