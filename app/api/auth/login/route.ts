import { NextRequest, NextResponse } from 'next/server';
import { getMemberstackClient } from '@/app/lib/auth/memberstack';
import { createSession } from '@/app/lib/auth/session';
import type { LoginRequest, AuthResponse, User } from '@/app/lib/auth/types';

export async function POST(request: NextRequest): Promise<NextResponse<AuthResponse>> {
  try {
    const body: LoginRequest = await request.json();
    const { email, memberstackToken, memberstackId, firstName, lastName, env = 'staging' } = body;

    console.log('[Login] Attempting login for email:', email, 'memberstackId:', memberstackId);

    if (!email || !memberstackToken) {
      return NextResponse.json(
        { success: false, error: 'Email and token are required' },
        { status: 400 }
      );
    }

    const client = getMemberstackClient(env);
    let member = null;

    // Prefer fetching by member ID if provided (more accurate)
    if (memberstackId) {
      console.log('[Login] Fetching member by ID:', memberstackId);
      member = await client.getMemberById(memberstackId);
    }

    // Fall back to email search if ID fetch failed
    if (!member) {
      console.log('[Login] Fetching member by email:', email);
      member = await client.getMember(email);
    }

    console.log('[Login] Member found:', member ? `${member.auth.email} (${member.id}) firstName: ${member.customFields?.['first-name']}` : 'not found');

    // If we have client-side data and no server-side member, use client data
    // This handles cases where the API might have sync issues
    if (!member && memberstackId) {
      console.log('[Login] Using client-provided data for session');
      const user: User = {
        id: memberstackId,
        email: email,
        firstName: firstName || '',
        lastName: lastName || '',
        activePlans: ['pln_basic--n5180oor'],
        bestPlanId: 'pln_basic--n5180oor',
        memberstackId: memberstackId,
      };

      await createSession(user);

      return NextResponse.json({
        success: true,
        user,
        redirectUrl: '/members-area',
      });
    }

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get active plans
    const activePlans = client.getActivePlanIds(member);
    const bestPlanId = client.getBestPlanId(activePlans);

    // Create user object - prefer server data but use client data as fallback
    const user: User = {
      id: member.id,
      email: member.auth.email,
      firstName: member.customFields?.['first-name'] || firstName || '',
      lastName: member.customFields?.['last-name'] || lastName || '',
      activePlans,
      bestPlanId,
      memberstackId: member.id,
    };

    // Create session
    console.log('[Login] Creating session for user:', user.email, 'firstName:', user.firstName);
    await createSession(user);

    return NextResponse.json({
      success: true,
      user,
      redirectUrl: '/members-area',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
