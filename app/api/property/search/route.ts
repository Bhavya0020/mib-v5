import { NextRequest, NextResponse } from 'next/server';

// Flask backend URL for property API
const FLASK_BACKEND_URL = process.env.FLASK_BACKEND_URL || 'http://localhost:2025';
// API key for Flask backend authentication
const FLASK_API_KEY = process.env.FLASK_API_KEY || 'mib_internal_cbf2508cf8';

// Helper to extract suburb from display name (e.g., "123 Main St, Parramatta" -> "Parramatta")
function parseSuburbFromAddress(displayName: string): string {
  const parts = displayName.split(',');
  return parts.length > 1 ? parts[parts.length - 1].trim() : '';
}

// Helper to extract state from GNAF ID (e.g., "GANSW123456" -> "NSW")
function parseStateFromId(gnafId: string): string {
  if (!gnafId || gnafId.length < 5) return '';
  const stateCode = gnafId.substring(2, 5).toUpperCase();
  const stateMap: Record<string, string> = {
    'NSW': 'NSW',
    'VIC': 'VIC',
    'QLD': 'QLD',
    'WA': 'WA',
    'SA': 'SA',
    'TAS': 'TAS',
    'NT': 'NT',
    'ACT': 'ACT',
  };
  return stateMap[stateCode] || stateCode;
}

// Sample address suggestions for demo/development (fallback only)
const SAMPLE_ADDRESSES = [
  // NSW - Western Sydney
  { gnaf_id: 'GANSW100000001', address: '15 Railway Street', suburb: 'Mays Hill', state: 'NSW', postcode: '2145' },
  { gnaf_id: 'GANSW100000002', address: '42 Victoria Road', suburb: 'Mays Hill', state: 'NSW', postcode: '2145' },
  { gnaf_id: 'GANSW100000003', address: '88 Great Western Highway', suburb: 'Mays Hill', state: 'NSW', postcode: '2145' },
  { gnaf_id: 'GANSW123456789', address: '123 Main Street', suburb: 'Parramatta', state: 'NSW', postcode: '2150' },
  { gnaf_id: 'GANSW123456790', address: '55 Church Street', suburb: 'Parramatta', state: 'NSW', postcode: '2150' },
  { gnaf_id: 'GANSW100000004', address: '12 Pitt Street', suburb: 'Granville', state: 'NSW', postcode: '2142' },
  { gnaf_id: 'GANSW100000005', address: '78 Woodville Road', suburb: 'Merrylands', state: 'NSW', postcode: '2160' },
  { gnaf_id: 'GANSW100000006', address: '34 Station Street', suburb: 'Harris Park', state: 'NSW', postcode: '2150' },
  { gnaf_id: 'GANSW100000007', address: '156 James Ruse Drive', suburb: 'Rosehill', state: 'NSW', postcode: '2142' },
  // NSW - Sydney CBD & Eastern Suburbs
  { gnaf_id: 'GANSW234567890', address: '45 George Street', suburb: 'Sydney', state: 'NSW', postcode: '2000' },
  { gnaf_id: 'GANSW345678901', address: '78 Ocean Drive', suburb: 'Bondi', state: 'NSW', postcode: '2026' },
  { gnaf_id: 'GANSW890123456', address: '67 Harbour View', suburb: 'Mosman', state: 'NSW', postcode: '2088' },
  // NSW - North Shore
  { gnaf_id: 'GANSW456789012', address: '12 Station Road', suburb: 'Chatswood', state: 'NSW', postcode: '2067' },
  { gnaf_id: 'GANSW567890123', address: '99 Park Avenue', suburb: 'Manly', state: 'NSW', postcode: '2095' },
  { gnaf_id: 'GANSW678901234', address: '156 Victoria Street', suburb: 'Epping', state: 'NSW', postcode: '2121' },
  { gnaf_id: 'GANSW789012345', address: '234 Pacific Highway', suburb: 'Castle Hill', state: 'NSW', postcode: '2154' },
  // VIC
  { gnaf_id: 'GAVIC123456789', address: '42 Collins Street', suburb: 'Melbourne', state: 'VIC', postcode: '3000' },
  { gnaf_id: 'GAVIC234567890', address: '88 Chapel Street', suburb: 'South Yarra', state: 'VIC', postcode: '3141' },
  // QLD
  { gnaf_id: 'GAQLD123456789', address: '15 Queen Street', suburb: 'Brisbane', state: 'QLD', postcode: '4000' },
  { gnaf_id: 'GAQLD234567890', address: '33 Gold Coast Highway', suburb: 'Surfers Paradise', state: 'QLD', postcode: '4217' },
];

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 3) {
      return NextResponse.json({ suggestions: [] });
    }

    // Try to fetch from Flask backend
    try {
      const response = await fetch(
        `${FLASK_BACKEND_URL}/api/property/address?address=${encodeURIComponent(query)}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${FLASK_API_KEY}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Flask returns { results: [...] } with address objects
        // Fields: id, name, display_name, abbr, property_type, typ
        const results = data.results || data.suggestions || [];
        return NextResponse.json({
          suggestions: results.map((item: Record<string, unknown>) => ({
            gnaf_id: item.id,
            address: item.display_name || item.name,
            // Parse suburb from the display name (last part after comma)
            suburb: parseSuburbFromAddress(item.display_name as string || item.name as string || ''),
            state: parseStateFromId(item.id as string || ''),
            postcode: '',
            property_type: item.property_type,
          })),
        });
      }

      console.warn('[Property Search] Flask backend returned:', response.status, await response.text());
    } catch (flaskError) {
      console.warn('[Property Search] Flask backend not available:', flaskError);
    }

    // Only fall back to sample data if explicitly enabled
    const useSampleFallback = process.env.USE_SAMPLE_FALLBACK === 'true';

    if (useSampleFallback) {
      // Filter sample data based on query
      const queryLower = query.toLowerCase();
      const filtered = SAMPLE_ADDRESSES.filter(
        (addr) =>
          addr.address.toLowerCase().includes(queryLower) ||
          addr.suburb.toLowerCase().includes(queryLower) ||
          addr.postcode.includes(query)
      ).slice(0, 10);

      return NextResponse.json({
        suggestions: filtered,
      });
    }

    // Return empty if backend unavailable and sample fallback disabled
    return NextResponse.json({
      suggestions: [],
      error: 'Property search service unavailable',
    });
  } catch (error) {
    console.error('Property search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
