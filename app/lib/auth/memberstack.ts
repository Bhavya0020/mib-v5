// Memberstack API client for server-side operations

const MEMBERSTACK_API_URL = 'https://admin.memberstack.com/members';

interface MemberstackMember {
  id: string;
  auth: {
    email: string;
  };
  customFields: {
    'first-name'?: string;
    'last-name'?: string;
  };
  planConnections: Array<{
    planId: string;
    status: string;
  }>;
}

export class MemberstackClient {
  private apiKey: string;
  private env: 'staging' | 'production';

  constructor(env: 'staging' | 'production' = 'staging') {
    this.env = env;
    this.apiKey = this.getApiKey();
  }

  private getApiKey(): string {
    const key = this.env === 'production'
      ? process.env.MEMBERSTACK_API_KEY_PRODUCTION
      : process.env.MEMBERSTACK_API_KEY_STAGING;

    if (!key) {
      console.warn(`Memberstack API key not configured for ${this.env} environment`);
      return '';
    }
    return key;
  }

  async getMember(email: string): Promise<MemberstackMember | null> {
    if (!this.apiKey) {
      console.error('Memberstack API key not configured');
      return null;
    }

    try {
      console.log('[Memberstack API] Fetching member by email:', email);
      const response = await fetch(`${MEMBERSTACK_API_URL}?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch member from Memberstack:', response.status);
        return null;
      }

      const data = await response.json();
      console.log('[Memberstack API] Response:', JSON.stringify(data, null, 2));

      // Memberstack returns an array of members
      if (data.data && data.data.length > 0) {
        const member = data.data[0];
        console.log('[Memberstack API] Found member:', member.auth.email, 'firstName:', member.customFields?.['first-name']);
        return member;
      }

      console.log('[Memberstack API] No member found for email:', email);
      return null;
    } catch (error) {
      console.error('Error fetching member from Memberstack:', error);
      return null;
    }
  }

  async getMemberById(memberId: string): Promise<MemberstackMember | null> {
    if (!this.apiKey) {
      console.error('Memberstack API key not configured');
      return null;
    }

    try {
      console.log('[Memberstack API] Fetching member by ID:', memberId);
      const response = await fetch(`${MEMBERSTACK_API_URL}/${memberId}`, {
        method: 'GET',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch member from Memberstack:', response.status);
        return null;
      }

      const data = await response.json();
      console.log('[Memberstack API] Found member by ID:', data.data?.auth?.email);
      return data.data || null;
    } catch (error) {
      console.error('Error fetching member from Memberstack:', error);
      return null;
    }
  }

  getActivePlanIds(member: MemberstackMember): string[] {
    return member.planConnections
      .filter(conn => conn.status === 'ACTIVE')
      .map(conn => conn.planId);
  }

  getBestPlanId(activePlanIds: string[]): string | null {
    console.log('[Memberstack] Active plan IDs:', activePlanIds);

    // Plan hierarchy: Portfolio Builder > Advanced > Essentials > Free
    // Match by name fragment since Memberstack IDs may vary
    // Order matters - check highest tier first
    const hierarchy = [
      // Highest tier (Portfolio Builder level)
      { pattern: 'portfolio', mappedId: 'pln_portfolio-builder-fb6b0fzp' },
      { pattern: 'office-team', mappedId: 'pln_portfolio-builder-fb6b0fzp' },
      { pattern: 'team', mappedId: 'pln_portfolio-builder-fb6b0fzp' },
      { pattern: 'premium', mappedId: 'pln_portfolio-builder-fb6b0fzp' },
      { pattern: 'unlimited', mappedId: 'pln_portfolio-builder-fb6b0fzp' },
      // Advanced tier
      { pattern: 'advanced', mappedId: 'pln_advanced-ni690fz3' },
      { pattern: 'pro', mappedId: 'pln_advanced-ni690fz3' },
      // Essentials tier
      { pattern: 'essentials', mappedId: 'pln_essentials-vb1k04zy' },
      { pattern: 'starter', mappedId: 'pln_essentials-vb1k04zy' },
      // Free tier
      { pattern: 'basic', mappedId: 'pln_basic--n5180oor' },
      { pattern: 'free', mappedId: 'pln_basic--n5180oor' },
    ];

    for (const { pattern, mappedId } of hierarchy) {
      const matchingPlan = activePlanIds.find(id => id.toLowerCase().includes(pattern));
      if (matchingPlan) {
        console.log('[Memberstack] Matched plan:', matchingPlan, '-> mapped to:', mappedId);
        return mappedId;
      }
    }

    // If no match by pattern, return the first active plan as-is
    console.log('[Memberstack] No pattern match, using first plan:', activePlanIds[0]);
    return activePlanIds[0] || null;
  }
}

// Singleton instances for each environment
let stagingClient: MemberstackClient | null = null;
let productionClient: MemberstackClient | null = null;

export function getMemberstackClient(env: 'staging' | 'production' = 'staging'): MemberstackClient {
  if (env === 'production') {
    if (!productionClient) {
      productionClient = new MemberstackClient('production');
    }
    return productionClient;
  }

  if (!stagingClient) {
    stagingClient = new MemberstackClient('staging');
  }
  return stagingClient;
}
