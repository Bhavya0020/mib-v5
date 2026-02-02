'use client';

// Memberstack SDK client-side types and utilities

export interface MemberstackMember {
  id: string;
  auth: {
    email: string;
  };
  customFields?: {
    'first-name'?: string;
    'last-name'?: string;
  };
  planConnections?: Array<{
    planId: string;
    status: string;
  }>;
}

export interface MemberstackLoginResult {
  data?: {
    member: MemberstackMember;
    tokens?: {
      accessToken: string;
    };
  };
  error?: string;
}

export interface MemberstackSignupResult {
  data?: {
    member: MemberstackMember;
    tokens?: {
      accessToken: string;
    };
  };
  error?: string;
}

export interface MemberstackSDK {
  loginMemberEmailPassword: (params: { email: string; password: string }) => Promise<MemberstackLoginResult>;
  signupMemberEmailPassword: (params: {
    email: string;
    password: string;
    customFields?: Record<string, string>;
    planId?: string;
  }) => Promise<MemberstackSignupResult>;
  loginWithProvider: (params: { provider: 'google' }) => Promise<MemberstackLoginResult>;
  signupWithProvider: (params: { provider: 'google' }) => Promise<MemberstackSignupResult>;
  logout: () => Promise<void>;
  getCurrentMember: () => Promise<{ data?: { member: MemberstackMember } }>;
  sendMemberResetPasswordEmail: (params: { email: string }) => Promise<{ data?: unknown; error?: string }>;
  resetMemberPassword: (params: { token: string; newPassword: string }) => Promise<{ data?: unknown; error?: string }>;
  purchasePlansWithCheckout: (params: { priceId: string }) => Promise<void>;
}

declare global {
  interface Window {
    $memberstackDom?: MemberstackSDK;
    MEMBERSTACK_ENV?: 'staging' | 'production';
  }
}

/**
 * Wait for Memberstack SDK to be available
 */
export function waitForMemberstack(maxWait = 5000): Promise<MemberstackSDK> {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = () => {
      if (window.$memberstackDom) {
        console.log('[Memberstack] SDK ready');
        resolve(window.$memberstackDom);
      } else if (Date.now() - start < maxWait) {
        setTimeout(check, 100);
      } else {
        reject(new Error('Memberstack SDK not available'));
      }
    };

    check();
  });
}

/**
 * Get Memberstack environment
 */
export function getMemberstackEnv(): 'staging' | 'production' {
  return window.MEMBERSTACK_ENV || 'staging';
}

/**
 * Login with email and password
 */
export async function loginWithEmail(email: string, password: string): Promise<{
  success: boolean;
  member?: MemberstackMember;
  token?: string;
  error?: string;
}> {
  try {
    const sdk = await waitForMemberstack();
    const result = await sdk.loginMemberEmailPassword({ email, password });

    console.log('[Memberstack] Login result:', result);

    if (result.error) {
      // Handle different error formats from Memberstack
      const errorMsg = typeof result.error === 'string'
        ? result.error
        : (result.error as unknown as { message?: string })?.message || 'Invalid email or password';
      return { success: false, error: errorMsg };
    }

    if (result.data?.member) {
      return {
        success: true,
        member: result.data.member,
        token: result.data.tokens?.accessToken || 'sdk-auth-success',
      };
    }

    return { success: false, error: 'Invalid email or password' };
  } catch (error: unknown) {
    console.error('[Memberstack] Login error:', error);

    // Handle empty object errors (common with invalid credentials)
    if (error && typeof error === 'object') {
      const err = error as { message?: string; code?: string };
      if (Object.keys(error).length === 0) {
        return { success: false, error: 'Invalid email or password. Please check your credentials.' };
      }
      if (err.message) {
        // Clean up common Memberstack error messages
        if (err.message.includes('invalid') || err.message.includes('password') || err.message.includes('email')) {
          return { success: false, error: 'Invalid email or password' };
        }
        return { success: false, error: err.message };
      }
      if (err.code === 'INVALID_CREDENTIALS' || err.code === 'invalid-credentials') {
        return { success: false, error: 'Invalid email or password' };
      }
    }

    return { success: false, error: error instanceof Error ? error.message : 'Login failed. Please try again.' };
  }
}

/**
 * Signup with email and password
 */
export async function signupWithEmail(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  planId?: string
): Promise<{
  success: boolean;
  member?: MemberstackMember;
  token?: string;
  error?: string;
}> {
  try {
    const sdk = await waitForMemberstack();

    // Build signup params - only include planId if it's a valid Memberstack plan ID
    const signupParams: {
      email: string;
      password: string;
      customFields: Record<string, string>;
      planId?: string;
    } = {
      email,
      password,
      customFields: {
        'first-name': firstName,
        'last-name': lastName,
      },
    };

    // Only add planId if it looks like a valid Memberstack plan ID (starts with pln_)
    if (planId && planId.startsWith('pln_') && !planId.includes('free')) {
      signupParams.planId = planId;
    }

    console.log('[Memberstack] Signup params:', { ...signupParams, password: '***' });

    const result = await sdk.signupMemberEmailPassword(signupParams);

    console.log('[Memberstack] Signup result:', result);

    if (result.error) {
      const errorMsg = typeof result.error === 'string'
        ? result.error
        : (result.error as unknown as { message?: string })?.message || 'Signup failed';
      return { success: false, error: errorMsg };
    }

    if (result.data?.member) {
      return {
        success: true,
        member: result.data.member,
        token: result.data.tokens?.accessToken || 'sdk-auth-success',
      };
    }

    return { success: false, error: 'Signup failed. Please try again.' };
  } catch (error: unknown) {
    console.error('[Memberstack] Signup error:', error);

    // Handle empty object errors
    if (error && typeof error === 'object') {
      const err = error as { message?: string; code?: string };
      if (Object.keys(error).length === 0) {
        return { success: false, error: 'Signup failed. This email may already be registered, or please check your details and try again.' };
      }
      if (err.message) {
        if (err.message.includes('already') || err.message.includes('exists')) {
          return { success: false, error: 'This email is already registered. Please log in instead.' };
        }
        return { success: false, error: err.message };
      }
    }

    return { success: false, error: error instanceof Error ? error.message : 'Signup failed. Please try again.' };
  }
}

/**
 * Login/Signup with Google OAuth
 */
export async function loginWithGoogle(): Promise<{
  success: boolean;
  member?: MemberstackMember;
  token?: string;
  error?: string;
}> {
  try {
    // Check if SDK is available
    if (!window.$memberstackDom) {
      return {
        success: false,
        error: 'Memberstack SDK not loaded. Please refresh the page and try again.'
      };
    }

    const sdk = window.$memberstackDom;

    // Try login first
    try {
      const loginResult = await sdk.loginWithProvider({ provider: 'google' });

      if (loginResult.data?.member) {
        return {
          success: true,
          member: loginResult.data.member,
          token: loginResult.data.tokens?.accessToken || 'sdk-auth-success',
        };
      }

      // If login returned but no member, might be a new user
      if (loginResult.error) {
        console.log('[Memberstack] Login failed, trying signup:', loginResult.error);
      }
    } catch (loginError) {
      // Login failed, try signup
      console.log('[Memberstack] Login threw error, trying signup');
    }

    // Try signup
    try {
      const signupResult = await sdk.signupWithProvider({ provider: 'google' });

      if (signupResult.data?.member) {
        return {
          success: true,
          member: signupResult.data.member,
          token: signupResult.data.tokens?.accessToken || 'sdk-auth-success',
        };
      }

      return {
        success: false,
        error: signupResult.error || 'Google authentication failed. Please try again.'
      };
    } catch (signupError) {
      const errorMessage = signupError instanceof Error ? signupError.message : 'Unknown error';
      console.error('[Memberstack] Signup with Google failed:', errorMessage);
      return {
        success: false,
        error: 'Google authentication failed. Make sure popups are allowed and try again.'
      };
    }
  } catch (error) {
    console.error('[Memberstack] Google auth error:', error);

    // Provide more helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('popup')) {
        return { success: false, error: 'Popup was blocked. Please allow popups and try again.' };
      }
      return { success: false, error: error.message };
    }

    // If we get an empty error object, Google OAuth likely isn't configured
    if (error && typeof error === 'object' && Object.keys(error).length === 0) {
      return {
        success: false,
        error: 'Google sign-in is not configured. Please use email and password instead.'
      };
    }

    return { success: false, error: 'Google authentication failed. Please try again.' };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const sdk = await waitForMemberstack();
    const result = await sdk.sendMemberResetPasswordEmail({ email });

    if (result.error) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    console.error('[Memberstack] Password reset error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send reset email' };
  }
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const sdk = await waitForMemberstack();
    const result = await sdk.resetMemberPassword({ token, newPassword });

    if (result.error) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    console.error('[Memberstack] Reset password error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to reset password' };
  }
}

/**
 * Redirect to Stripe checkout for a plan
 */
export async function purchasePlan(priceId: string): Promise<void> {
  const sdk = await waitForMemberstack();
  await sdk.purchasePlansWithCheckout({ priceId });
}

/**
 * Logout from Memberstack
 */
export async function memberstackLogout(): Promise<void> {
  try {
    const sdk = await waitForMemberstack();
    await sdk.logout();
  } catch (error) {
    console.error('[Memberstack] Logout error:', error);
  }
}
