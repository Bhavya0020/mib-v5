import { NextRequest, NextResponse } from 'next/server';

const FLASK_BACKEND_URL = process.env.FLASK_BACKEND_URL || 'http://localhost:2025';
const FLASK_API_KEY = process.env.FLASK_API_KEY || 'mib_internal_cbf2508cf8';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const state = searchParams.get('state') || '';
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';

    if (query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const url = new URL(`${FLASK_BACKEND_URL}/api/suburb/suburbs`);
    url.searchParams.append('suburb', query);
    url.searchParams.append('token', FLASK_API_KEY);
    if (state) url.searchParams.append('state', state);
    url.searchParams.append('page', page);
    url.searchParams.append('limit', limit);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${FLASK_API_KEY}`,
      },
    });

    if (!response.ok) {
      console.warn(`[Suburb Search] Flask returned ${response.status}`);
      return NextResponse.json({ results: [] });
    }

    const data = await response.json();

    // Transform results for frontend
    const results = (data.results || []).map((item: {
      area_name: string;
      area_level: string;
      information: {
        state: string;
        poa: string;
        lga: string;
        sa3: string;
      };
    }) => ({
      name: item.area_name,
      level: item.area_level,
      state: item.information?.state || '',
      postcode: item.information?.poa || '',
      lga: item.information?.lga || '',
      sa3: item.information?.sa3 || '',
    }));

    return NextResponse.json({
      results,
      page: data.page || 1,
    });
  } catch (error) {
    console.error('Suburb search error:', error);
    return NextResponse.json({ results: [] });
  }
}
