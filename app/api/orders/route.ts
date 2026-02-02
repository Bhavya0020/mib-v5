import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/auth/session';

// Flask backend URL - matches other API routes
const FLASK_BACKEND_URL = process.env.FLASK_BACKEND_URL || 'http://localhost:2025';
const FLASK_API_KEY = process.env.FLASK_API_KEY || 'mib_internal_cbf2508cf8';

// Sample orders for fallback when Flask backend is not available
const SAMPLE_ORDERS = [
  {
    order_id: 'ORD-2024-001',
    user_email: 'demo@microburbs.com',
    client: 'Direct',
    report_category: 'Suburb' as const,
    location: 'Parramatta, NSW',
    pdf_report: `${FLASK_BACKEND_URL}/pdf_suburb_report?order_id=ORD-2024-001`,
    url: '/suburb-reports/Parramatta',
    date: '15-01-2024',
  },
  {
    order_id: 'ORD-2024-002',
    user_email: 'demo@microburbs.com',
    client: 'Premium',
    report_category: 'Property' as const,
    location: '123 Main Street, Sydney NSW 2000',
    pdf_report: `${FLASK_BACKEND_URL}/pdf_property_report?order_id=ORD-2024-002`,
    url: '/property-reports/GANSW123456789',
    date: '12-01-2024',
  },
  {
    order_id: 'ORD-2024-003',
    user_email: 'demo@microburbs.com',
    client: 'Direct',
    report_category: 'Suburb' as const,
    location: 'Bondi, NSW',
    pdf_report: `${FLASK_BACKEND_URL}/pdf_suburb_report?order_id=ORD-2024-003`,
    url: '/suburb-reports/Bondi',
    date: '10-01-2024',
  },
  {
    order_id: 'ORD-2024-004',
    user_email: 'demo@microburbs.com',
    client: 'Direct',
    report_category: 'Property' as const,
    location: '45 Ocean View Drive, Bondi NSW 2026',
    pdf_report: `${FLASK_BACKEND_URL}/pdf_property_report?order_id=ORD-2024-004`,
    url: '/property-reports/GANSW987654321',
    date: '08-01-2024',
  },
  {
    order_id: 'ORD-2024-005',
    user_email: 'demo@microburbs.com',
    client: 'Premium',
    report_category: 'Suburb' as const,
    location: 'Manly, NSW',
    pdf_report: `${FLASK_BACKEND_URL}/pdf_suburb_report?order_id=ORD-2024-005`,
    url: '/suburb-reports/Manly',
    date: '05-01-2024',
  },
];

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check if user is authenticated
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email') || user.email;
    const reportCategory = searchParams.get('report_category');

    // Always try Flask backend first
    try {
      const params = new URLSearchParams();
      if (email) params.append('email', email);
      if (reportCategory && reportCategory !== 'All') {
        params.append('report_category', reportCategory);
      }
      params.append('token', FLASK_API_KEY);

      const flaskUrl = `${FLASK_BACKEND_URL}/user-orders?${params.toString()}`;
      console.log('[Orders API] Fetching from Flask:', flaskUrl);

      const response = await fetch(flaskUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${FLASK_API_KEY}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const orders = Array.isArray(data) ? data : (data.orders || []);

        console.log(`[Orders API] Got ${orders.length} orders from Flask`);

        return NextResponse.json({
          success: true,
          orders,
        });
      } else {
        console.warn(`[Orders API] Flask returned ${response.status}`);
      }
    } catch (flaskError) {
      console.warn('[Orders API] Flask backend not available:', flaskError);
    }

    // Fallback to sample data if Flask is unavailable
    console.log('[Orders API] Using sample data fallback');

    let orders = SAMPLE_ORDERS;

    // Filter by report category
    if (reportCategory && reportCategory !== 'All') {
      orders = orders.filter(o => o.report_category === reportCategory);
    }

    // Update sample data to use the actual user's email
    orders = orders.map(o => ({
      ...o,
      user_email: user.email,
    }));

    return NextResponse.json({
      success: true,
      orders,
      _fallback: true, // Indicator that this is sample data
    });
  } catch (error) {
    console.error('Orders API error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
