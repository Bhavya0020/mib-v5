'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/lib/auth/context';
import { useToast } from '@/app/components/Toast';
import { PLAN_PRICING } from '@/app/lib/auth/types';
import {
  loginWithEmail,
  signupWithEmail,
  loginWithGoogle,
  sendPasswordResetEmail,
  purchasePlan,
} from '@/app/lib/auth/memberstack-client';

type AuthMode = 'login' | 'signup';
type SignupStep = 1 | 2;
type BillingPeriod = 'monthly' | 'quarterly';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

interface SelectedPlan {
  id: string;
  name: string;
  priceId: string | null;
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const { login, signup } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

  // Password validation
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setSignupStep(1);
      setError('');
      setSuccessMessage('');
      setShowForgotPassword(false);
      setForgotPasswordSent(false);
    } else {
      // Reset form on close
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setSelectedPlan(null);
      setError('');
      setSuccessMessage('');
      setShowForgotPassword(false);
      setForgotPasswordSent(false);
    }
  }, [isOpen, initialMode]);

  // Password validation
  useEffect(() => {
    setPasswordValidation({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
    });
  }, [password]);

  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Authenticate with Memberstack SDK
      const msResult = await loginWithEmail(email, password);

      if (!msResult.success) {
        setError(msResult.error || 'Invalid email or password');
        setIsLoading(false);
        return;
      }

      // Create server-side session with full member data
      const success = await login({
        email,
        token: msResult.token || 'sdk-auth-success',
        memberstackId: msResult.member?.id,
        firstName: msResult.member?.customFields?.['first-name'],
        lastName: msResult.member?.customFields?.['last-name'],
      });
      if (success) {
        const userName = msResult.member?.customFields?.['first-name'] || email.split('@')[0];
        showToast(`Welcome back, ${userName}!`, 'success');
        onClose();
      } else {
        setError('Failed to create session');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Please meet all password requirements');
      return;
    }

    setIsLoading(true);

    try {
      // Register with Memberstack SDK
      const msResult = await signupWithEmail(
        email,
        password,
        firstName,
        lastName,
        selectedPlan?.id
      );

      if (!msResult.success) {
        setError(msResult.error || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      // Create server-side session
      const success = await signup(
        email,
        firstName,
        lastName,
        selectedPlan?.id || 'pln_basic--n5180oor',
        msResult.token || 'sdk-auth-success'
      );

      if (success) {
        // If paid plan, redirect to Stripe checkout
        if (selectedPlan?.priceId) {
          try {
            // Store flag to show user details after checkout
            sessionStorage.setItem('showUserDetailsAfterCheckout', 'true');
            await purchasePlan(selectedPlan.priceId);
            // Memberstack will redirect to Stripe, then back
            return;
          } catch (checkoutError) {
            console.error('Checkout error:', checkoutError);
            // Continue without checkout, user can upgrade later
          }
        }
        showToast(`Welcome to Microburbs, ${firstName || email.split('@')[0]}!`, 'success');
        onClose();
      } else {
        setError('Failed to create session');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = useCallback(async () => {
    setError('');
    setIsLoading(true);

    // Check if Memberstack SDK is loaded
    if (typeof window === 'undefined' || !window.$memberstackDom) {
      setError('Authentication service is loading. Please wait a moment and try again.');
      setIsLoading(false);
      return;
    }

    try {
      // Authenticate with Google via Memberstack
      const msResult = await loginWithGoogle();

      if (!msResult.success) {
        setError(msResult.error || 'Google authentication failed');
        setIsLoading(false);
        return;
      }

      if (!msResult.member) {
        setError('Failed to get user information');
        setIsLoading(false);
        return;
      }

      // Create server-side session with full member data
      const success = await login({
        email: msResult.member.auth.email,
        token: msResult.token || 'sdk-auth-success',
        memberstackId: msResult.member.id,
        firstName: msResult.member.customFields?.['first-name'],
        lastName: msResult.member.customFields?.['last-name'],
      });

      if (success) {
        const userName = msResult.member.customFields?.['first-name'] || msResult.member.auth.email.split('@')[0];
        showToast(`Welcome, ${userName}!`, 'success');
        onClose();
      } else {
        setError('Failed to create session');
      }
    } catch (err) {
      console.error('Google auth error:', err);
      setError('An error occurred during Google authentication. Make sure popups are allowed.');
    } finally {
      setIsLoading(false);
    }
  }, [login, onClose, showToast]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const result = await sendPasswordResetEmail(email);

      if (result.success) {
        setForgotPasswordSent(true);
        setSuccessMessage('Password reset email sent! Check your inbox.');
      } else {
        setError(result.error || 'Failed to send reset email');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Map from UI plan keys to actual Memberstack plan IDs
  const MEMBERSTACK_PLAN_IDS: Record<string, string> = {
    free: 'pln_basic--n5180oor',
    essentials: 'pln_essentials-vb1k04zy',
    advanced: 'pln_advanced-ni690fz3',
    portfolioBuilder: 'pln_portfolio-builder-fb6b0fzp',
  };

  const selectPlan = (planKey: string, planName: string) => {
    const pricing = PLAN_PRICING[planKey as keyof typeof PLAN_PRICING];
    const priceId = billingPeriod === 'monthly' ? pricing.monthlyPriceId : pricing.quarterlyPriceId;

    setSelectedPlan({
      id: MEMBERSTACK_PLAN_IDS[planKey] || `pln_${planKey}`,
      name: planName,
      priceId,
    });
    setSignupStep(2);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex">
        {/* Left side - Form */}
        <div className="flex-1 p-8 overflow-y-auto">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Tab switcher */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => { setMode('login'); setShowForgotPassword(false); }}
              className={`text-lg font-semibold pb-2 border-b-2 transition-colors ${
                mode === 'login'
                  ? 'text-[#4475e6] border-[#4475e6]'
                  : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => { setMode('signup'); setSignupStep(1); setShowForgotPassword(false); }}
              className={`text-lg font-semibold pb-2 border-b-2 transition-colors ${
                mode === 'signup'
                  ? 'text-[#4475e6] border-[#4475e6]'
                  : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && !showForgotPassword && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4475e6] focus:border-transparent outline-none"
                  placeholder="Enter your email"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4475e6] focus:border-transparent outline-none"
                  placeholder="Enter your password"
                  required
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-[#4475e6] border-gray-300 rounded focus:ring-[#4475e6]"
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-[#4475e6] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#4475e6] text-white rounded-lg font-medium hover:bg-[#3361d1] transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Logging in...' : 'Log In'}
              </button>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-white text-sm text-gray-500">or</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGoogleAuth}
                className="w-full py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </form>
          )}

          {/* Forgot Password */}
          {mode === 'login' && showForgotPassword && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <button
                type="button"
                onClick={() => { setShowForgotPassword(false); setForgotPasswordSent(false); setSuccessMessage(''); }}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to login
              </button>
              <h3 className="text-xl font-semibold text-gray-900">Reset your password</h3>
              <p className="text-gray-600">Enter your email and we'll send you a reset link.</p>

              {successMessage && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-600 rounded-lg text-sm">
                  {successMessage}
                </div>
              )}

              {!forgotPasswordSent && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4475e6] focus:border-transparent outline-none"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-[#4475e6] text-white rounded-lg font-medium hover:bg-[#3361d1] transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </>
              )}
            </form>
          )}

          {/* Signup Step 1 - Plan Selection */}
          {mode === 'signup' && signupStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900">Choose your plan</h3>

              {/* Billing toggle */}
              <div className="flex items-center justify-center gap-4">
                <span className={`text-sm font-medium ${billingPeriod === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
                  Monthly
                </span>
                <button
                  onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'quarterly' : 'monthly')}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    billingPeriod === 'quarterly' ? 'bg-[#4475e6]' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    billingPeriod === 'quarterly' ? 'translate-x-6' : ''
                  }`} />
                </button>
                <span className={`text-sm font-medium ${billingPeriod === 'quarterly' ? 'text-gray-900' : 'text-gray-500'}`}>
                  Quarterly
                </span>
                <span className="bg-[#4475e6] text-white text-xs font-semibold px-2 py-1 rounded-full">
                  Save 20%
                </span>
              </div>

              {/* Plan cards */}
              <div className="grid grid-cols-2 gap-4">
                {/* Free Plan */}
                <button
                  onClick={() => selectPlan('free', 'Free')}
                  className="p-4 border-2 border-gray-200 rounded-xl hover:border-[#4475e6] transition-colors text-left"
                >
                  <h4 className="font-semibold text-gray-900">Free</h4>
                  <p className="text-2xl font-bold text-gray-900 mt-1">$0</p>
                  <ul className="mt-3 space-y-1 text-sm text-gray-600">
                    <li>5 AI property matches</li>
                    <li>Basic suburb reports</li>
                  </ul>
                </button>

                {/* Essentials Plan */}
                <button
                  onClick={() => selectPlan('essentials', 'Essentials')}
                  className="p-4 border-2 border-gray-200 rounded-xl hover:border-[#4475e6] transition-colors text-left"
                >
                  <h4 className="font-semibold text-gray-900">Essentials</h4>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ${billingPeriod === 'monthly' ? PLAN_PRICING.essentials.monthly : PLAN_PRICING.essentials.quarterly}
                    <span className="text-sm font-normal text-gray-500">/mo</span>
                  </p>
                  <ul className="mt-3 space-y-1 text-sm text-gray-600">
                    <li>Unlimited AI matches</li>
                    <li>2 suburb reports/mo</li>
                  </ul>
                </button>

                {/* Advanced Plan */}
                <button
                  onClick={() => selectPlan('advanced', 'Advanced')}
                  className="p-4 border-2 border-[#4475e6] rounded-xl bg-[#4475e6]/5 text-left relative"
                >
                  <span className="absolute -top-2 left-4 bg-[#4475e6] text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    Popular
                  </span>
                  <h4 className="font-semibold text-gray-900">Advanced</h4>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ${billingPeriod === 'monthly' ? PLAN_PRICING.advanced.monthly : PLAN_PRICING.advanced.quarterly}
                    <span className="text-sm font-normal text-gray-500">/mo</span>
                  </p>
                  <ul className="mt-3 space-y-1 text-sm text-gray-600">
                    <li>20 suburb reports/mo</li>
                    <li>All filters + CSV</li>
                  </ul>
                </button>

                {/* Portfolio Builder Plan */}
                <button
                  onClick={() => selectPlan('portfolioBuilder', 'Portfolio Builder')}
                  className="p-4 border-2 border-gray-200 rounded-xl hover:border-[#4475e6] transition-colors text-left"
                >
                  <h4 className="font-semibold text-gray-900">Portfolio Builder</h4>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ${billingPeriod === 'monthly' ? PLAN_PRICING.portfolioBuilder.monthly : PLAN_PRICING.portfolioBuilder.quarterly}
                    <span className="text-sm font-normal text-gray-500">/mo</span>
                  </p>
                  <ul className="mt-3 space-y-1 text-sm text-gray-600">
                    <li>Unlimited everything</li>
                    <li>Priority support</li>
                  </ul>
                </button>
              </div>
            </div>
          )}

          {/* Signup Step 2 - Account Details */}
          {mode === 'signup' && signupStep === 2 && (
            <form onSubmit={handleSignup} className="space-y-4">
              <button
                type="button"
                onClick={() => setSignupStep(1)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to plans
              </button>

              <h3 className="text-xl font-semibold text-gray-900">
                Create your account
                {selectedPlan && (
                  <span className="text-[#4475e6] ml-2">({selectedPlan.name})</span>
                )}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4475e6] focus:border-transparent outline-none"
                    placeholder="First name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4475e6] focus:border-transparent outline-none"
                    placeholder="Last name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4475e6] focus:border-transparent outline-none"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4475e6] focus:border-transparent outline-none"
                  placeholder="Create a password"
                  required
                />
                {/* Password requirements */}
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className={`flex items-center gap-1 ${passwordValidation.length ? 'text-green-600' : 'text-gray-400'}`}>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d={passwordValidation.length
                        ? "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        : "M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z"
                      } clipRule="evenodd" />
                    </svg>
                    8+ characters
                  </div>
                  <div className={`flex items-center gap-1 ${passwordValidation.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d={passwordValidation.uppercase
                        ? "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        : "M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z"
                      } clipRule="evenodd" />
                    </svg>
                    Uppercase
                  </div>
                  <div className={`flex items-center gap-1 ${passwordValidation.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d={passwordValidation.lowercase
                        ? "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        : "M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z"
                      } clipRule="evenodd" />
                    </svg>
                    Lowercase
                  </div>
                  <div className={`flex items-center gap-1 ${passwordValidation.number ? 'text-green-600' : 'text-gray-400'}`}>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d={passwordValidation.number
                        ? "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        : "M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z"
                      } clipRule="evenodd" />
                    </svg>
                    Number
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !isPasswordValid}
                className="w-full py-3 bg-[#4475e6] text-white rounded-lg font-medium hover:bg-[#3361d1] transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-white text-sm text-gray-500">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleAuth}
                className="w-full py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </form>
          )}
        </div>

        {/* Right side - Branding */}
        <div className="hidden md:flex w-80 bg-[#f8fafc] flex-col justify-center p-8 border-l border-gray-100">
          <div className="text-2xl font-bold text-[#383941] mb-6">Microburbs</div>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-[#4475e6] mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-600">Street-level property data</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-[#4475e6] mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-600">AI-powered property matching</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-[#4475e6] mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-600">Comprehensive suburb reports</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-[#4475e6] mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-600">2+ billion data points</span>
            </li>
          </ul>
          <div className="mt-8 p-4 bg-white rounded-lg border border-gray-100">
            <p className="text-sm text-gray-600 italic">
              "Microburbs helped me find the perfect investment property with data I couldn't find anywhere else."
            </p>
            <p className="text-sm font-medium text-gray-900 mt-2">— Sarah T., Investor</p>
          </div>
        </div>
      </div>
    </div>
  );
}
