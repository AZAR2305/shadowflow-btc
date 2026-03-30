import { NextRequest, NextResponse } from 'next/server';
import { EscrowContractService } from '@/lib/server/escrowContractService';

const escrowService = EscrowContractService.getInstance();

/**
 * GET /api/escrow/balance/:chain/:wallet
 * Get escrow balance for a wallet on a specific chain
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { chain: string; wallet: string } }
) {
  try {
    const chain = params.chain as 'btc' | 'strk';
    const wallet = params.wallet;

    if (!['btc', 'strk'].includes(chain)) {
      return NextResponse.json(
        { error: 'Invalid chain. Must be btc or strk' },
        { status: 400 }
      );
    }

    const balance = escrowService.getEscrowBalance(chain, wallet);

    if (!balance) {
      return NextResponse.json({
        chain,
        wallet,
        deposit: '0',
        locked: false,
        status: 'none',
        message: 'No escrow balance found',
      });
    }

    return NextResponse.json(balance);
  } catch (error: any) {
    console.error('Escrow balance error:', error);
    return NextResponse.json(
      { error: 'Failed to get escrow balance', message: error?.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/escrow/deposit
 * Deposit funds into escrow
 * Body: { amount, chain, walletAddress, escrowHash }
 */
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'deposit') {
      const body = await request.json();
      const { amount, chain, walletAddress, escrowHash } = body;

      if (!amount || !chain || !walletAddress || !escrowHash) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      const tx = await escrowService.depositToEscrow(
        amount,
        chain,
        walletAddress,
        escrowHash
      );

      return NextResponse.json({
        success: true,
        transaction: tx,
        message: `Deposited ${amount} ${chain.toUpperCase()} to escrow`,
      });
    }

    if (action === 'release') {
      const body = await request.json();
      const { amount, chain, walletAddress, releaseHash } = body;

      if (!amount || !chain || !walletAddress || !releaseHash) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      const tx = await escrowService.releaseFromEscrow(
        chain,
        walletAddress,
        amount,
        releaseHash
      );

      return NextResponse.json({
        success: true,
        transaction: tx,
        message: `Released ${amount} ${chain.toUpperCase()} from escrow`,
      });
    }

    if (action === 'refund') {
      const body = await request.json();
      const { chain, walletAddress } = body;

      if (!chain || !walletAddress) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      const tx = await escrowService.refundEscrow(chain, walletAddress);

      return NextResponse.json({
        success: true,
        transaction: tx,
        message: 'Escrow refunded',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use deposit, release, or refund' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Escrow transaction error:', error);
    return NextResponse.json(
      { error: 'Transaction failed', message: error?.message },
      { status: 500 }
    );
  }
}
