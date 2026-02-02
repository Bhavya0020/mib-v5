import { NextRequest, NextResponse } from 'next/server';

const FLASK_BACKEND_URL = process.env.FLASK_BACKEND_URL || 'http://localhost:2025';
const FLASK_API_KEY = process.env.FLASK_API_KEY || 'mib_internal_cbf2508cf8';

interface RouteContext {
  params: Promise<{ name: string }>;
}

// Fetch from Flask API endpoints (use Bearer auth)
async function fetchFromFlaskAPI(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${FLASK_BACKEND_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${FLASK_API_KEY}`,
      },
    });

    if (!response.ok) {
      console.warn(`[Suburb API] ${endpoint} returned ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`[Suburb API] Error fetching ${endpoint}:`, error);
    return null;
  }
}

// Fetch from Flask graph endpoints (use token param)
async function fetchFromFlaskGraph(endpoint: string, suburb: string, params: Record<string, string> = {}) {
  const url = new URL(`${FLASK_BACKEND_URL}/suburb_report/graphs/${endpoint}/${encodeURIComponent(suburb)}`);
  url.searchParams.append('token', FLASK_API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      console.warn(`[Suburb Graph] ${endpoint} returned ${response.status}`);
      return null;
    }

    const text = await response.text();
    if (!text || text.trim() === '') return null;

    // Try to parse as JSON first
    try {
      return JSON.parse(text);
    } catch {
      // If not JSON, wrap as HTML
      return { html: text };
    }
  } catch (error) {
    console.error(`[Suburb Graph] Error fetching ${endpoint}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { name } = await context.params;
    const suburbName = decodeURIComponent(name);
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');
    const blur = searchParams.get('blur') || 'false';
    const propertyType = searchParams.get('property_type') || 'house';

    // If requesting a specific section, return only that data
    if (section) {
      let data = null;

      switch (section) {
        // Market section
        case 'msp':
          data = await fetchFromFlaskGraph('msp', suburbName, { blur });
          break;
        case 'mrp':
          data = await fetchFromFlaskGraph('mrp', suburbName, { blur });
          break;
        case 'yield':
          data = await fetchFromFlaskGraph('yield', suburbName, { blur });
          break;
        case 'volume':
          data = await fetchFromFlaskGraph('volume', suburbName, { blur });
          break;
        case 'vacancy':
          data = await fetchFromFlaskGraph('vacancy', suburbName, { blur });
          break;
        case 'growth':
          data = await fetchFromFlaskGraph('growth', suburbName, { blur });
          break;
        case 'growth_forecast':
          data = await fetchFromFlaskGraph('growth_forecast', suburbName, { blur });
          break;
        case 'growth_quadrants':
          data = await fetchFromFlaskGraph('growth_quadrants', suburbName, { blur });
          break;

        // Demographics section
        case 'demographics':
          data = await fetchFromFlaskGraph('demographics', suburbName, { blur });
          break;
        case 'income':
          data = await fetchFromFlaskGraph('income', suburbName, { blur });
          break;
        case 'industry':
          data = await fetchFromFlaskGraph('industry', suburbName, { blur });
          break;
        case 'occupations':
          data = await fetchFromFlaskGraph('occupations', suburbName, { blur });
          break;
        case 'ethnicity_ts':
          data = await fetchFromFlaskGraph('ethnicity_ts', suburbName, { blur });
          break;
        case 'population':
          data = await fetchFromFlaskGraph('population', suburbName, { blur });
          break;
        case 'population_forecast':
          data = await fetchFromFlaskGraph('population_forecast', suburbName, { blur });
          break;

        // Lifestyle section
        case 'amenity':
        case 'amenities':
          data = await fetchFromFlaskGraph('amenity', suburbName, { blur });
          break;
        case 'schools_map':
          data = await fetchFromFlaskGraph('schools_map', suburbName, { blur });
          break;
        case 'schools_table':
          data = await fetchFromFlaskGraph('schools_table', suburbName, { blur });
          break;
        case 'schools_catchments':
          data = await fetchFromFlaskGraph('schools_catchments', suburbName, { blur });
          break;
        case 'noise':
          data = await fetchFromFlaskGraph('noise', suburbName, { blur });
          break;
        case 'base_map':
          data = await fetchFromFlaskGraph('base_map', suburbName, { blur });
          break;

        // Properties section
        case 'pocket':
          data = await fetchFromFlaskGraph('pocket', suburbName, { blur, property_type: propertyType });
          break;
        case 'streets':
          data = await fetchFromFlaskGraph('streets', suburbName, { blur });
          break;
        case 'near_sales':
          data = await fetchFromFlaskGraph('near_sales', suburbName, { blur });
          break;

        // Development section
        case 'das_map':
          data = await fetchFromFlaskGraph('das_map', suburbName, { blur });
          break;
        case 'das_table':
          data = await fetchFromFlaskGraph('das_table', suburbName, { blur });
          break;
        case 'zoning':
          data = await fetchFromFlaskGraph('zoning', suburbName, { blur });
          break;

        // Risks section
        case 'risk':
          data = await fetchFromFlaskGraph('risk', suburbName, { blur });
          break;

        // Summary
        case 'summary':
        case 'gpt_summary':
          data = await fetchFromFlaskGraph('gpt_summary', suburbName, { blur });
          break;

        // Market insights
        case 'market_insights':
          data = await fetchFromFlaskGraph('market_insights', suburbName, { blur });
          break;
        case 'similar_suburbs':
          data = await fetchFromFlaskGraph('similar_suburbs', suburbName, { blur });
          break;
        case 'insights':
          data = await fetchFromFlaskGraph('insights', suburbName, { blur });
          break;

        default:
          return NextResponse.json({ error: 'Unknown section' }, { status: 400 });
      }

      return NextResponse.json({ data, section });
    }

    // Fetch basic suburb info
    const suburbInfo = await fetchFromFlaskAPI('/api/suburb/info', { suburb: suburbName });

    if (!suburbInfo || suburbInfo.error) {
      return NextResponse.json(
        { error: 'Suburb not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      name: suburbName,
      ...suburbInfo.information,
    });
  } catch (error) {
    console.error('Suburb API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suburb data' },
      { status: 500 }
    );
  }
}
