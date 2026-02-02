import { NextRequest, NextResponse } from 'next/server';

// Flask backend URL and API key
const FLASK_BACKEND_URL = process.env.FLASK_BACKEND_URL || 'http://localhost:2025';
const FLASK_API_KEY = process.env.FLASK_API_KEY || 'mib_internal_cbf2508cf8';

interface RouteContext {
  params: Promise<{ gnafId: string }>;
}

// Endpoints that return JSON (not HTML/text)
const JSON_ENDPOINTS = [
  '/property/graphs/basic-info',
  '/property/graphs/avm',
  '/property/graphs/house_img',
];

// Endpoints that return plain text (not HTML)
const TEXT_ENDPOINTS = [
  '/property/graphs/summary',
];

// Fetch data from Flask backend
async function fetchFromFlask(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${FLASK_BACKEND_URL}${endpoint}`);

  // Add token as query parameter (Flask property endpoints use token param, not Bearer header)
  url.searchParams.append('token', FLASK_API_KEY);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': '*/*',
      },
    });

    if (!response.ok) {
      console.warn(`[Property API] ${endpoint} returned ${response.status}`);
      return null;
    }

    // Get the response as text first
    const text = await response.text();

    if (!text || text.trim() === '') {
      return null;
    }

    // Check if this endpoint returns JSON
    if (JSON_ENDPOINTS.includes(endpoint)) {
      try {
        return JSON.parse(text);
      } catch {
        // If JSON parsing fails, wrap as html
        return { html: text };
      }
    }

    // Check if this endpoint returns plain text (not HTML)
    if (TEXT_ENDPOINTS.includes(endpoint)) {
      return { summary_short: text, text: text };
    }

    // For all other endpoints, try JSON first, then wrap as HTML
    try {
      const json = JSON.parse(text);
      // If it's already an object with html property, return as-is
      if (json && typeof json === 'object') {
        return json;
      }
      return { html: text };
    } catch {
      // Not JSON, wrap HTML content
      return { html: text };
    }
  } catch (error) {
    console.error(`[Property API] Error fetching ${endpoint}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { gnafId } = await context.params;
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');
    const blur = searchParams.get('blur') || 'false';

    // If requesting a specific section, return only that data
    if (section) {
      let data = null;

      switch (section) {
        case 'info':
          data = await fetchFromFlask('/property/graphs/basic-info', { gnaf_id: gnafId, blur });
          break;
        case 'image':
          data = await fetchFromFlask('/property/graphs/house_img', { gnaf_id: gnafId });
          break;
        case 'history':
          data = await fetchFromFlask('/property/graphs/history', { gnaf_id: gnafId, blur });
          break;
        case 'sales':
          data = await fetchFromFlask('/property/graphs/sales', { gnaf_id: gnafId, blur });
          break;
        case 'rent':
          data = await fetchFromFlask('/property/graphs/rent', { gnaf_id: gnafId, blur });
          break;
        case 'yield':
          data = await fetchFromFlask('/property/graphs/yield', { gnaf_id: gnafId, blur });
          break;
        case 'risk':
          data = await fetchFromFlask('/property/graphs/risk', { gnaf_id: gnafId, blur });
          break;
        case 'amenities':
          data = await fetchFromFlask('/property/graphs/amenities', { gnaf_id: gnafId });
          break;
        case 'schools':
          // Fetch both private and public schools
          const [privateSchools, publicSchools] = await Promise.all([
            fetchFromFlask('/property/graphs/private_schools', { gnaf_id: gnafId }),
            fetchFromFlask('/property/graphs/public_schools', { gnaf_id: gnafId }),
          ]);
          data = { private_schools: privateSchools, public_schools: publicSchools };
          break;
        case 'demographics':
          data = await fetchFromFlask('/property/graphs/demographics', { gnaf_id: gnafId, blur });
          break;
        case 'zoning':
          // Fetch both zoning map and chart
          const [zoningMap, zoningChart] = await Promise.all([
            fetchFromFlask('/property/graphs/zoning_map', { gnaf_id: gnafId, blur }),
            fetchFromFlask('/property/graphs/zoning_chart', { gnaf_id: gnafId, blur }),
          ]);
          data = { map: zoningMap, chart: zoningChart };
          break;
        case 'development':
          // Fetch both DA map and table
          const [dasMap, dasTable] = await Promise.all([
            fetchFromFlask('/property/graphs/das_map', { gnaf_id: gnafId, blur }),
            fetchFromFlask('/property/graphs/das_table', { gnaf_id: gnafId, blur }),
          ]);
          data = { map: dasMap, table: dasTable };
          break;
        case 'das_table':
          data = await fetchFromFlask('/property/graphs/das_table', { gnaf_id: gnafId, blur });
          break;
        case 'das_map':
          data = await fetchFromFlask('/property/graphs/das_map', { gnaf_id: gnafId, blur });
          break;
        case 'summary':
          data = await fetchFromFlask('/property/graphs/summary', { gnaf_id: gnafId, blur });
          break;
        case 'avm':
          data = await fetchFromFlask('/property/graphs/avm', { gnaf_id: gnafId, blur });
          break;
        case 'noise':
          data = await fetchFromFlask('/property/graphs/noise', { gnaf_id: gnafId, blur });
          break;
        case 'easements':
          data = await fetchFromFlask('/property/graphs/easement_map', { gnaf_id: gnafId, blur });
          break;
        case 'pocket':
          data = await fetchFromFlask('/property/graphs/pocket', { gnaf_id: gnafId, blur });
          break;
        case 'neighbors':
          data = await fetchFromFlask('/property/graphs/neighbors', { gnaf_id: gnafId, blur });
          break;
        case 'nearby':
          data = await fetchFromFlask('/property/graphs/nearby-properties', { gnaf_id: gnafId, blur });
          break;
        case 'ethnicity':
          // Fetch both ethnicity map and chart
          const [ethnicityMap, ethnicityChart] = await Promise.all([
            fetchFromFlask('/property/graphs/ethnicity', { gnaf_id: gnafId, blur }),
            fetchFromFlask('/property/graphs/ethnicity_chart', { gnaf_id: gnafId, blur }),
          ]);
          data = { map: ethnicityMap, chart: ethnicityChart };
          break;
        case 'income':
          data = await fetchFromFlask('/property/graphs/income', { gnaf_id: gnafId, blur });
          break;
        case 'base_map':
          data = await fetchFromFlask('/property/graphs/base_map', { gnaf_id: gnafId });
          break;
        case 'thresholds':
          data = await fetchFromFlask('/property/graphs/thresholds', { gnaf_id: gnafId, blur });
          break;
        case 'cma':
          data = await fetchFromFlask('/property/graphs/cma', { gnaf_id: gnafId, blur });
          break;
        case 'sal_insights':
          data = await fetchFromFlask('/property/graphs/sal_insights', { gnaf_id: gnafId, blur });
          break;
        case 'public_schools':
          data = await fetchFromFlask('/property/graphs/public_schools', { gnaf_id: gnafId });
          break;
        case 'private_schools':
          data = await fetchFromFlask('/property/graphs/private_schools', { gnaf_id: gnafId });
          break;
        default:
          return NextResponse.json({ error: 'Unknown section' }, { status: 400 });
      }

      return NextResponse.json({ data, section });
    }

    // Fetch basic property info for initial load
    const propertyInfo = await fetchFromFlask('/property/graphs/basic-info', { gnaf_id: gnafId, blur });

    if (!propertyInfo) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      gnaf_id: gnafId,
      ...propertyInfo,
    });
  } catch (error) {
    console.error('Property API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch property data' },
      { status: 500 }
    );
  }
}
