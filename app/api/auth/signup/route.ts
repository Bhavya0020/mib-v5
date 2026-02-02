import { NextRequest, NextResponse } from 'next/server';
import { getMemberstackClient } from '@/app/lib/auth/memberstack';
import { createSession } from '@/app/lib/auth/session';
import type { SignupRequest, AuthResponse, User } from '@/app/lib/auth/types';

export async function POST(request: NextRequest): Promise<NextResponse<AuthResponse>> {
  try {
    const body: SignupRequest = await request.json();
    const { email, firstName, lastName, plan, memberstackToken, env = 'staging' } = body;

    if (!email || !memberstackToken) {
      return NextResponse.json(
        { success: false, error: 'Email and token are required' },
        { status: 400 }
      );
    }

    // Get member from Memberstack (account was created client-side)
    const client = getMemberstackClient(env);
    const member = await client.getMember(email);

    if (!member) {
      // For signup, if we can't fetch the member yet, create a temporary user
      // This handles the case where Memberstack hasn't synced yet
      const user: User = {
        id: `temp_${Date.now()}`,
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        activePlans: plan ? [plan] : ['pln_basic--n5180oor'],
        bestPlanId: plan || 'pln_basic--n5180oor',
        memberstackId: '',
      };

      await createSession(user);

      return NextResponse.json({
        success: true,
        user,
        redirectUrl: '/members-area',
      });
    }

    // Get active plans
    const activePlans = client.getActivePlanIds(member);
    const bestPlanId = client.getBestPlanId(activePlans);

    // Create user object
    const user: User = {
      id: member.id,
      email: member.auth.email,
      firstName: member.customFields['first-name'] || firstName || '',
      lastName: member.customFields['last-name'] || lastName || '',
      activePlans: activePlans.length > 0 ? activePlans : (plan ? [plan] : ['pln_basic--n5180oor']),
      bestPlanId: bestPlanId || plan || 'pln_basic--n5180oor',
      memberstackId: member.id,
    };

    // Create session
    await createSession(user);

    return NextResponse.json({
      success: true,
      user,
      redirectUrl: '/members-area',
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during signup' },
      { status: 500 }
    );
  }
}
