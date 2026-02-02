import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/auth/session';
import { PLANS, type PlanId } from '@/app/lib/auth/types';

const FLASK_BACKEND_URL = process.env.FLASK_BACKEND_URL || 'http://localhost:2025';
const FLASK_API_KEY = process.env.FLASK_API_KEY || 'mib_internal_cbf2508cf8';

interface SubscriptionData {
  plan: {
    id: string;
    name: string;
    tier: number;
    description: string;
  };
  usage: {
    propertyReportsUsed: number;
    propertyReportsLimit: number;
    propertyReportsLeft: number;
    suburbReportsUsed: number;
    suburbReportsLimit: number;
    suburbReportsLeft: number;
  };
  features: {
    suburbFinder: 'unlimited' | 'limited';
    propertyFinder: 'unlimited' | 'limited';
    csvExport: boolean;
    prioritySupport: boolean;
  };
}

// Helper to get plan details
function getPlanDetails(planId: string | null) {
  if (!planId) {
    return PLANS['pln_basic--n5180oor'];
  }

  // Check if it's a known plan ID
  if (planId in PLANS) {
    return PLANS[planId as PlanId];
  }

  // Try to match by name fragment
  if (planId.includes('portfolio')) {
    return PLANS['pln_portfolio-builder-fb6b0fzp'];
  }
  if (planId.includes('advanced')) {
    return PLANS['pln_advanced-ni690fz3'];
  }
  if (planId.includes('essentials')) {
    return PLANS['pln_essentials-vb1k04zy'];
  }

  // Default to free plan
  return PLANS['pln_basic--n5180oor'];
}

// Get plan description
function getPlanDescription(planName: string): string {
  switch (planName) {
    case 'Portfolio Builder':
      return 'Unlimited access to all Microburbs features and reports';
    case 'Advanced':
      return 'Extended access with 20 suburb reports and 30 property reports per month';
    case 'Essentials':
      return 'Basic access with 2 suburb reports and 5 property reports per month';
    default:
      return 'Basic access to Microburbs features';
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user's plan details
    console.log('[Subscription API] User:', user.email, 'bestPlanId:', user.bestPlanId, 'activePlans:', user.activePlans);
    const planDetails = getPlanDetails(user.bestPlanId);
    console.log('[Subscription API] Resolved plan:', planDetails.name, 'tier:', planDetails.tier);

    // Try to fetch usage from Flask backend
    let propertyReportsUsed = 0;
    let suburbReportsUsed = 0;

    // Always try to fetch usage from Flask backend
    try {
      const response = await fetch(
        `${FLASK_BACKEND_URL}/user-orders?email=${encodeURIComponent(user.email)}&token=${FLASK_API_KEY}`
      );
      if (response.ok) {
        const orders = await response.json();

        // Count reports used this month
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        orders.forEach((order: { report_category: string; date: string }) => {
          // Parse date (DD-MM-YYYY format)
          const [, month, year] = order.date.split('-').map(Number);
          if (year === currentYear && month - 1 === currentMonth) {
            if (order.report_category === 'Property') {
              propertyReportsUsed++;
            } else if (order.report_category === 'Suburb') {
              suburbReportsUsed++;
            }
          }
        });
      }
    } catch (error) {
      console.warn('[Subscription API] Failed to fetch usage from Flask:', error);
    }

    // Calculate remaining reports
    const propertyReportsLimit = planDetails.propertyReports;
    const suburbReportsLimit = planDetails.suburbReports;

    const propertyReportsLeft = propertyReportsLimit === -1
      ? -1 // Unlimited
      : Math.max(0, propertyReportsLimit - propertyReportsUsed);

    const suburbReportsLeft = suburbReportsLimit === -1
      ? -1 // Unlimited
      : Math.max(0, suburbReportsLimit - suburbReportsUsed);

    // Determine feature access based on plan tier
    const isUnlimited = planDetails.tier >= 3;
    const hasAdvancedFeatures = planDetails.tier >= 2;

    const subscriptionData: SubscriptionData = {
      plan: {
        id: planDetails.id,
        name: planDetails.name,
        tier: planDetails.tier,
        description: getPlanDescription(planDetails.name),
      },
      usage: {
        propertyReportsUsed,
        propertyReportsLimit,
        propertyReportsLeft,
        suburbReportsUsed,
        suburbReportsLimit,
        suburbReportsLeft,
      },
      features: {
        suburbFinder: isUnlimited || hasAdvancedFeatures ? 'unlimited' : 'limited',
        propertyFinder: isUnlimited || hasAdvancedFeatures ? 'unlimited' : 'limited',
        csvExport: hasAdvancedFeatures,
        prioritySupport: isUnlimited,
      },
    };

    return NextResponse.json({
      success: true,
      subscription: subscriptionData,
    });
  } catch (error) {
    console.error('Subscription API error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
