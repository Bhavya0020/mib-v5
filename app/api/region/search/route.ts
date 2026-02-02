import { NextRequest, NextResponse } from 'next/server';

const FLASK_BACKEND_URL = process.env.FLASK_BACKEND_URL || 'http://localhost:2025';
const FLASK_API_KEY = process.env.FLASK_API_KEY || 'mib_internal_cbf2508cf8';

// Known regions (SA3 areas) - these can be expanded
const KNOWN_REGIONS: Record<string, { state: string; type: string }> = {
  'Eastern Suburbs - North': { state: 'NSW', type: 'SA3' },
  'Eastern Suburbs - South': { state: 'NSW', type: 'SA3' },
  'Sydney Inner City': { state: 'NSW', type: 'SA3' },
  'North Sydney - Mosman': { state: 'NSW', type: 'SA3' },
  'Ryde': { state: 'NSW', type: 'SA3' },
  'Parramatta': { state: 'NSW', type: 'SA3' },
  'Blacktown - North': { state: 'NSW', type: 'SA3' },
  'Blacktown - South-West': { state: 'NSW', type: 'SA3' },
  'Penrith': { state: 'NSW', type: 'SA3' },
  'Blue Mountains': { state: 'NSW', type: 'SA3' },
  'Inner West': { state: 'NSW', type: 'SA3' },
  'Canterbury': { state: 'NSW', type: 'SA3' },
  'Bankstown': { state: 'NSW', type: 'SA3' },
  'Sutherland - Menai - Heathcote': { state: 'NSW', type: 'SA3' },
  'Cronulla - Miranda - Caringbah': { state: 'NSW', type: 'SA3' },
  'St George': { state: 'NSW', type: 'SA3' },
  'Strathfield - Burwood - Ashfield': { state: 'NSW', type: 'SA3' },
  'Canada Bay': { state: 'NSW', type: 'SA3' },
  'Leichhardt': { state: 'NSW', type: 'SA3' },
  'Marrickville - Sydenham - Petersham': { state: 'NSW', type: 'SA3' },
  'Hornsby': { state: 'NSW', type: 'SA3' },
  'Ku-ring-gai': { state: 'NSW', type: 'SA3' },
  'Northern Beaches': { state: 'NSW', type: 'SA3' },
  'Pittwater': { state: 'NSW', type: 'SA3' },
  'Warringah': { state: 'NSW', type: 'SA3' },
  'Chatswood - Lane Cove': { state: 'NSW', type: 'SA3' },
  'Lower Northern Sydney': { state: 'NSW', type: 'SA3' },
  'Newcastle': { state: 'NSW', type: 'SA3' },
  'Lake Macquarie - East': { state: 'NSW', type: 'SA3' },
  'Lake Macquarie - West': { state: 'NSW', type: 'SA3' },
  'Maitland': { state: 'NSW', type: 'SA3' },
  'Central Coast': { state: 'NSW', type: 'SA3' },
  'Wollongong': { state: 'NSW', type: 'SA3' },
  // Melbourne
  'Melbourne City': { state: 'VIC', type: 'SA3' },
  'Port Phillip': { state: 'VIC', type: 'SA3' },
  'Stonnington - East': { state: 'VIC', type: 'SA3' },
  'Stonnington - West': { state: 'VIC', type: 'SA3' },
  'Boroondara': { state: 'VIC', type: 'SA3' },
  'Yarra': { state: 'VIC', type: 'SA3' },
  'Darebin - South': { state: 'VIC', type: 'SA3' },
  'Darebin - North': { state: 'VIC', type: 'SA3' },
  'Banyule': { state: 'VIC', type: 'SA3' },
  'Manningham - East': { state: 'VIC', type: 'SA3' },
  'Manningham - West': { state: 'VIC', type: 'SA3' },
  'Whitehorse - East': { state: 'VIC', type: 'SA3' },
  'Whitehorse - West': { state: 'VIC', type: 'SA3' },
  'Monash': { state: 'VIC', type: 'SA3' },
  'Glen Eira': { state: 'VIC', type: 'SA3' },
  'Bayside': { state: 'VIC', type: 'SA3' },
  'Kingston': { state: 'VIC', type: 'SA3' },
  'Greater Dandenong': { state: 'VIC', type: 'SA3' },
  'Casey - North': { state: 'VIC', type: 'SA3' },
  'Casey - South': { state: 'VIC', type: 'SA3' },
  'Frankston': { state: 'VIC', type: 'SA3' },
  'Mornington Peninsula': { state: 'VIC', type: 'SA3' },
  'Knox': { state: 'VIC', type: 'SA3' },
  'Maroondah': { state: 'VIC', type: 'SA3' },
  'Yarra Ranges': { state: 'VIC', type: 'SA3' },
  // Brisbane
  'Brisbane Inner': { state: 'QLD', type: 'SA3' },
  'Brisbane Inner - East': { state: 'QLD', type: 'SA3' },
  'Brisbane Inner - North': { state: 'QLD', type: 'SA3' },
  'Brisbane Inner - West': { state: 'QLD', type: 'SA3' },
  'Brisbane - South': { state: 'QLD', type: 'SA3' },
  'Brisbane - East': { state: 'QLD', type: 'SA3' },
  'Brisbane - North': { state: 'QLD', type: 'SA3' },
  'Brisbane - West': { state: 'QLD', type: 'SA3' },
  'Ipswich Inner': { state: 'QLD', type: 'SA3' },
  'Ipswich Hinterland': { state: 'QLD', type: 'SA3' },
  'Logan - Beaudesert': { state: 'QLD', type: 'SA3' },
  'Gold Coast - North': { state: 'QLD', type: 'SA3' },
  'Gold Coast - South': { state: 'QLD', type: 'SA3' },
  'Surfers Paradise': { state: 'QLD', type: 'SA3' },
  'Sunshine Coast': { state: 'QLD', type: 'SA3' },
  // Perth
  'Perth City': { state: 'WA', type: 'SA3' },
  'Fremantle': { state: 'WA', type: 'SA3' },
  'Cottesloe - Claremont': { state: 'WA', type: 'SA3' },
  'Melville': { state: 'WA', type: 'SA3' },
  'South Perth': { state: 'WA', type: 'SA3' },
  'Victoria Park': { state: 'WA', type: 'SA3' },
  'Canning': { state: 'WA', type: 'SA3' },
  'Gosnells': { state: 'WA', type: 'SA3' },
  'Armadale': { state: 'WA', type: 'SA3' },
  'Rockingham': { state: 'WA', type: 'SA3' },
  'Mandurah': { state: 'WA', type: 'SA3' },
  'Joondalup': { state: 'WA', type: 'SA3' },
  'Wanneroo': { state: 'WA', type: 'SA3' },
  'Stirling': { state: 'WA', type: 'SA3' },
  // Adelaide
  'Adelaide City': { state: 'SA', type: 'SA3' },
  'Adelaide Hills': { state: 'SA', type: 'SA3' },
  'Burnside': { state: 'SA', type: 'SA3' },
  'Campbelltown': { state: 'SA', type: 'SA3' },
  'Norwood - Payneham - St Peters': { state: 'SA', type: 'SA3' },
  'Unley': { state: 'SA', type: 'SA3' },
  'Holdfast Bay': { state: 'SA', type: 'SA3' },
  'Marion': { state: 'SA', type: 'SA3' },
  'Mitcham': { state: 'SA', type: 'SA3' },
  'Onkaparinga': { state: 'SA', type: 'SA3' },
  'Port Adelaide - East': { state: 'SA', type: 'SA3' },
  'Port Adelaide - West': { state: 'SA', type: 'SA3' },
  'Charles Sturt': { state: 'SA', type: 'SA3' },
  'West Torrens': { state: 'SA', type: 'SA3' },
  'Salisbury': { state: 'SA', type: 'SA3' },
  'Tea Tree Gully': { state: 'SA', type: 'SA3' },
  'Playford': { state: 'SA', type: 'SA3' },
  // Canberra
  'North Canberra': { state: 'ACT', type: 'SA3' },
  'South Canberra': { state: 'ACT', type: 'SA3' },
  'Belconnen': { state: 'ACT', type: 'SA3' },
  'Gungahlin': { state: 'ACT', type: 'SA3' },
  'Tuggeranong': { state: 'ACT', type: 'SA3' },
  'Woden Valley': { state: 'ACT', type: 'SA3' },
  'Weston Creek': { state: 'ACT', type: 'SA3' },
  'Molonglo': { state: 'ACT', type: 'SA3' },
  // Hobart
  'Hobart Inner': { state: 'TAS', type: 'SA3' },
  'Hobart - North East': { state: 'TAS', type: 'SA3' },
  'Hobart - North West': { state: 'TAS', type: 'SA3' },
  'Hobart - South and West': { state: 'TAS', type: 'SA3' },
  'Brighton': { state: 'TAS', type: 'SA3' },
  // Darwin
  'Darwin City': { state: 'NT', type: 'SA3' },
  'Darwin Suburbs': { state: 'NT', type: 'SA3' },
  'Palmerston': { state: 'NT', type: 'SA3' },
  'Litchfield': { state: 'NT', type: 'SA3' },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const state = searchParams.get('state') || '';

    if (query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const queryLower = query.toLowerCase();

    // Filter known regions by query and state
    const matchingRegions = Object.entries(KNOWN_REGIONS)
      .filter(([name, info]) => {
        const matchesQuery = name.toLowerCase().includes(queryLower);
        const matchesState = !state || info.state === state;
        return matchesQuery && matchesState;
      })
      .map(([name, info]) => ({
        name,
        type: info.type,
        state: info.state,
      }))
      .slice(0, 20);

    // Also try to get regions from suburb search results
    try {
      const suburbUrl = new URL(`${FLASK_BACKEND_URL}/api/suburb/suburbs`);
      suburbUrl.searchParams.append('suburb', query);
      suburbUrl.searchParams.append('token', FLASK_API_KEY);
      suburbUrl.searchParams.append('limit', '50');

      const response = await fetch(suburbUrl.toString(), {
        headers: {
          'Authorization': `Bearer ${FLASK_API_KEY}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const suburbs = data.results || [];

        // Extract unique SA3 regions from suburb results
        const sa3Regions = new Set<string>();
        suburbs.forEach((suburb: { information?: { sa3?: string; state?: string } }) => {
          if (suburb.information?.sa3) {
            const sa3Name = suburb.information.sa3;
            const regionState = suburb.information.state?.includes('New South Wales') ? 'NSW' :
                               suburb.information.state?.includes('Victoria') ? 'VIC' :
                               suburb.information.state?.includes('Queensland') ? 'QLD' :
                               suburb.information.state?.includes('Western Australia') ? 'WA' :
                               suburb.information.state?.includes('South Australia') ? 'SA' :
                               suburb.information.state?.includes('Tasmania') ? 'TAS' :
                               suburb.information.state?.includes('Northern Territory') ? 'NT' :
                               suburb.information.state?.includes('Australian Capital') ? 'ACT' : '';

            if (!matchingRegions.find(r => r.name === sa3Name)) {
              sa3Regions.add(JSON.stringify({ name: sa3Name, type: 'SA3', state: regionState }));
            }
          }
        });

        // Add unique SA3 regions from suburb search
        sa3Regions.forEach(regionJson => {
          const region = JSON.parse(regionJson);
          if (!matchingRegions.find(r => r.name === region.name)) {
            matchingRegions.push(region);
          }
        });
      }
    } catch (error) {
      console.error('Error fetching suburb data for regions:', error);
    }

    return NextResponse.json({
      results: matchingRegions,
    });
  } catch (error) {
    console.error('Region search error:', error);
    return NextResponse.json({ results: [] });
  }
}
