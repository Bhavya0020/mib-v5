import { NextResponse } from 'next/server';
import { destroySession } from '@/app/lib/auth/session';

export async function POST(): Promise<NextResponse> {
  try {
    await destroySession();

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}
