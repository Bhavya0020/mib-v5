// Auth types and interfaces

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  activePlans: string[];
  bestPlanId: string | null;
  memberstackId: string;
}

export interface UserSession {
  id: string;
  userEmail: string;
  memberstackId: string;
  firstName: string;
  lastName: string;
  activePlans: string[];
  bestPlanId: string | null;
  createdAt: Date;
  lastAccessed: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface LoginRequest {
  email: string;
  memberstackToken: string;
  memberstackId?: string;  // Member ID from client-side SDK for accurate lookup
  firstName?: string;      // First name from client-side SDK
  lastName?: string;       // Last name from client-side SDK
  env?: 'staging' | 'production';
}

export interface SignupRequest {
  email: string;
  firstName: string;
  lastName: string;
  plan: string;
  memberstackToken: string;
  env?: 'staging' | 'production';
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
  redirectUrl?: string;
}

// Plan definitions matching Flask backend
export const PLANS = {
  // Free tier
  'pln_basic--n5180oor': {
    id: 'pln_basic--n5180oor',
    name: 'Free',
    tier: 0,
    suburbReports: 0,
    propertyReports: 0,
    features: ['5 AI property matches', 'Basic suburb reports', 'Limited filters'],
  },
  // Essentials
  'pln_essentials-vb1k04zy': {
    id: 'pln_essentials-vb1k04zy',
    name: 'Essentials',
    tier: 1,
    suburbReports: 2,
    propertyReports: 5,
    features: ['Unlimited AI property matches', '2 suburb reports/month', '5 property reports/month'],
  },
  // Advanced
  'pln_advanced-ni690fz3': {
    id: 'pln_advanced-ni690fz3',
    name: 'Advanced',
    tier: 2,
    suburbReports: 20,
    propertyReports: 30,
    features: ['Unlimited AI property matches', '20 suburb reports/month', '30 property reports/month', 'All filters + CSV export'],
  },
  // Portfolio Builder
  'pln_portfolio-builder-fb6b0fzp': {
    id: 'pln_portfolio-builder-fb6b0fzp',
    name: 'Portfolio Builder',
    tier: 3,
    suburbReports: -1, // Unlimited
    propertyReports: -1, // Unlimited
    features: ['Unlimited everything', 'Priority support', 'Custom reports'],
  },
} as const;

export type PlanId = keyof typeof PLANS;

// Pricing for plans (monthly and quarterly)
export const PLAN_PRICING = {
  free: {
    monthly: 0,
    quarterly: 0,
    monthlyPriceId: null,
    quarterlyPriceId: null,
  },
  essentials: {
    monthly: 95,
    quarterly: 77,
    monthlyPriceId: 'prc_essentials-monthly-x7wv07nc',
    quarterlyPriceId: 'prc_essentials-quarterly-1l3v0p5r',
  },
  advanced: {
    monthly: 170,
    quarterly: 137,
    monthlyPriceId: 'prc_advanced-monthly-5gdm0crl',
    quarterlyPriceId: 'prc_advanced-quarterly-u0jn06ox',
  },
  portfolioBuilder: {
    monthly: 390,
    quarterly: 320,
    monthlyPriceId: 'prc_portfolio-builder-monthly-p3od0cof',
    quarterlyPriceId: 'prc_portfolio-builder-quarterly-xr920fz8',
  },
} as const;
