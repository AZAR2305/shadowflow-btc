import { NextRequest, NextResponse } from 'next/server';
import { PythPriceService } from '@/lib/server/pythPriceService';

/**
 * POST /api/prices/convert
 * Convert amount from one chain asset to another
 * Body: { amount: number, from: 'BTC'|'STRK', to: 'BTC'|'STRK' }
 * Returns: { fromAmount, fromSymbol, toAmount, toSymbol, rate, timestamp }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, from, to } = body;

    if (!amount || !from || !to) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, from, to' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    const pythService = PythPriceService.getInstance();
    const result = await pythService.convertAmount(amount, from, to);

    return NextResponse.json({
      fromAmount: result.fromAmount,
      fromSymbol: result.fromSymbol,
      toAmount: result.toAmount,
      toSymbol: result.toSymbol,
      exchangeRate: result.exchangeRate,
      fromPrice: result.fromPrice,
      toPrice: result.toPrice,
      timestamp: result.timestamp,
      publishTime: result.publishTime,
    });
  } catch (error: any) {
    console.error('Error converting amount:', error);
    return NextResponse.json(
      { error: 'Conversion failed', message: error?.message },
      { status: 500 }
    );
  }
}
