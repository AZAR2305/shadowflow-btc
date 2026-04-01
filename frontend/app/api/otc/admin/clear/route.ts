/**
 * DEVELOPMENT ONLY: Admin endpoint to clear all intents and matches
 * Used for testing fresh starts
 */

import { OtcMatchingService } from '@/lib/server/otcMatchingService';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const otcService = OtcMatchingService.getInstance();
    const result = otcService.clearAllIntents();

    return NextResponse.json({
      success: true,
      message: '🗑️ All intents and matches cleared',
      cleared: result,
    });
  } catch (error) {
    console.error('[ADMIN-CLEAR] Error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const otcService = OtcMatchingService.getInstance();
    const state = otcService.getState();

    return NextResponse.json({
      success: true,
      state,
    });
  } catch (error) {
    console.error('[ADMIN-STATE] Error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
