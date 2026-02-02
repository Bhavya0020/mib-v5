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
      console.warn(`[Region API] ${endpoint} returned ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`[Region API] Error fetching ${endpoint}:`, error);
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
      console.warn(`[Region Graph] ${endpoint} returned ${response.status}`);
      return null;
    }

    const text = await response.text();
    if (!text || text.trim() === '') return null;

    try {
      return JSON.parse(text);
    } catch {
      return { html: text };
    }
  } catch (error) {
    console.error(`[Region Graph] Error fetching ${endpoint}:`, error);
    return null;
  }
}

// Find a representative suburb for the region
async function findSuburbInRegion(regionName: string): Promise<string | null> {
  try {
    const url = new URL(`${FLASK_BACKEND_URL}/api/suburb/suburbs`);
    url.searchParams.append('suburb', regionName.split(' - ')[0]); // Use first part of region name as search
    url.searchParams.append('token', FLASK_API_KEY);
    url.searchParams.append('limit', '50');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${FLASK_API_KEY}`,
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const suburbs = data.results || [];

    // Find a suburb that belongs to this SA3 region
    for (const suburb of suburbs) {
      if (suburb.information?.sa3 === regionName) {
        return suburb.name;
      }
    }

    // If not found, try broader search
    const broaderUrl = new URL(`${FLASK_BACKEND_URL}/api/suburb/suburbs`);
    broaderUrl.searchParams.append('suburb', 'a'); // Generic search
    broaderUrl.searchParams.append('token', FLASK_API_KEY);
    broaderUrl.searchParams.append('limit', '200');

    const broaderResponse = await fetch(broaderUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${FLASK_API_KEY}`,
      },
    });

    if (broaderResponse.ok) {
      const broaderData = await broaderResponse.json();
      const broaderSuburbs = broaderData.results || [];

      for (const suburb of broaderSuburbs) {
        if (suburb.information?.sa3 === regionName) {
          return suburb.name;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding suburb in region:', error);
    return null;
  }
}

// Extract SA3-level data from MSP response
function extractSA3Data(data: Record<string, unknown>) {
  if (!data) return null;

  const result: Record<string, unknown> = {};

  // Extract SA3 data from house and unit sections
  if (data.house && typeof data.house === 'object') {
    const houseData = data.house as Record<string, unknown>;
    result.house = {
      sa3: houseData.sa3 || {},
      html: houseData.html,
    };
  }

  if (data.unit && typeof data.unit === 'object') {
    const unitData = data.unit as Record<string, unknown>;
    result.unit = {
      sa3: unitData.sa3 || {},
      html: unitData.html,
    };
  }

  return result;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { name } = await context.params;
    const regionName = decodeURIComponent(name);
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');
    const blur = searchParams.get('blur') || 'false';

    // Find a suburb in this region to fetch data from
    const representativeSuburb = await findSuburbInRegion(regionName);

    if (!representativeSuburb) {
      return NextResponse.json(
        { error: 'Could not find suburbs in this region' },
        { status: 404 }
      );
    }

    // If requesting a specific section, return that data with SA3 focus
    if (section) {
      let data = null;

      switch (section) {
        case 'msp':
          const mspData = await fetchFromFlaskGraph('msp', representativeSuburb, { blur });
          data = extractSA3Data(mspData) || mspData;
          break;
        case 'mrp':
          const mrpData = await fetchFromFlaskGraph('mrp', representativeSuburb, { blur });
          data = extractSA3Data(mrpData) || mrpData;
          break;
        case 'yield':
          const yieldData = await fetchFromFlaskGraph('yield', representativeSuburb, { blur });
          data = extractSA3Data(yieldData) || yieldData;
          break;
        case 'volume':
          data = await fetchFromFlaskGraph('volume', representativeSuburb, { blur });
          break;
        case 'vacancy':
          data = await fetchFromFlaskGraph('vacancy', representativeSuburb, { blur });
          break;
        case 'growth':
          data = await fetchFromFlaskGraph('growth', representativeSuburb, { blur });
          break;
        case 'demographics':
          data = await fetchFromFlaskGraph('demographics', representativeSuburb, { blur });
          break;
        case 'income':
          data = await fetchFromFlaskGraph('income', representativeSuburb, { blur });
          break;
        case 'population':
          data = await fetchFromFlaskGraph('population', representativeSuburb, { blur });
          break;
        case 'market_insights':
          data = await fetchFromFlaskGraph('market_insights', representativeSuburb, { blur });
          break;
        case 'risk':
          data = await fetchFromFlaskGraph('risk', representativeSuburb, { blur });
          break;
        default:
          return NextResponse.json({ error: 'Unknown section' }, { status: 400 });
      }

      return NextResponse.json({
        data,
        section,
        region: regionName,
        representativeSuburb
      });
    }

    // Return basic region info
    const suburbInfo = await fetchFromFlaskAPI('/api/suburb/info', { suburb: representativeSuburb });

    return NextResponse.json({
      name: regionName,
      type: 'SA3',
      representativeSuburb,
      state: suburbInfo?.information?.state || '',
      suburbCount: 1, // Could be expanded to count suburbs in region
    });
  } catch (error) {
    console.error('Region API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch region data' },
      { status: 500 }
    );
  }
}
