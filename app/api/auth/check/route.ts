import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/app/lib/auth/session';

export async function GET(): Promise<NextResponse> {
  try {
    const loggedIn = await isAuthenticated();

    return NextResponse.json({
      logged_in: loggedIn,
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({
      logged_in: false,
    });
  }
}
