'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';

interface RegionInfo {
  name: string;
  type: string;
  state: string;
  representativeSuburb: string;
}

interface RegionMetrics {
  msp?: number;
  msp_f?: string;
  mrp_f?: string;
  '1y_g'?: number;
  '1y_g_f'?: string;
  name?: string;
}

interface SectionData {
  html?: string;
  house?: {
    html?: string;
    sa3?: RegionMetrics;
    suburb?: RegionMetrics;
    cr?: RegionMetrics;
    [key: string]: unknown;
  };
  unit?: {
    html?: string;
    sa3?: RegionMetrics;
    suburb?: RegionMetrics;
    cr?: RegionMetrics;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface MarketInsightsData {
  house?: {
    months_of_supply?: number;
    sold_count?: number;
    stock_on_market?: number;
    time_on_market?: number;
  };
  unit?: {
    months_of_supply?: number;
    sold_count?: number;
    stock_on_market?: number;
    time_on_market?: number;
  };
}

type SectionType = 'overview' | 'market' | 'demographics' | 'growth';

export default function RegionReportPage({ params }: { params: Promise<{ name: string }> }) {
  const resolvedParams = use(params);
  const regionName = decodeURIComponent(resolvedParams.name);

  const [regionInfo, setRegionInfo] = useState<RegionInfo | null>(null);
  const [activeSection, setActiveSection] = useState<SectionType>('overview');
  const [mspData, setMspData] = useState<SectionData | null>(null);
  const [marketInsights, setMarketInsights] = useState<MarketInsightsData | null>(null);
  const [growthData, setGrowthData] = useState<SectionData | null>(null);
  const [demographicsData, setDemographicsData] = useState<SectionData | null>(null);
  const [incomeData, setIncomeData] = useState<SectionData | null>(null);
  const [populationData, setPopulationData] = useState<SectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch region info
  const fetchRegionInfo = useCallback(async () => {
    try {
      const response = await fetch(`/api/region/${encodeURIComponent(regionName)}`);
      if (!response.ok) throw new Error('Region not found');
      const data = await response.json();
      setRegionInfo(data);
    } catch (err) {
      console.error('Error fetching region info:', err);
      setError('Region not found');
    }
  }, [regionName]);

  // Fetch section data
  const fetchSectionData = useCallback(async (section: string) => {
    try {
      const response = await fetch(`/api/region/${encodeURIComponent(regionName)}?section=${section}`);
      if (!response.ok) return null;
      const result = await response.json();
      return result.data;
    } catch (err) {
      console.error(`Error fetching ${section}:`, err);
      return null;
    }
  }, [regionName]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchRegionInfo();

      // Fetch initial data in parallel
      const [msp, insights] = await Promise.all([
        fetchSectionData('msp'),
        fetchSectionData('market_insights'),
      ]);

      setMspData(msp);
      setMarketInsights(insights);
      setLoading(false);
    };

    loadData();
  }, [fetchRegionInfo, fetchSectionData]);

  // Load section-specific data when section changes
  useEffect(() => {
    const loadSectionData = async () => {
      switch (activeSection) {
        case 'growth':
          if (!growthData) {
            const data = await fetchSectionData('growth');
            setGrowthData(data);
          }
          break;
        case 'demographics':
          if (!demographicsData) {
            const [demo, income, pop] = await Promise.all([
              fetchSectionData('demographics'),
              fetchSectionData('income'),
              fetchSectionData('population'),
            ]);
            setDemographicsData(demo);
            setIncomeData(income);
            setPopulationData(pop);
          }
          break;
      }
    };

    loadSectionData();
  }, [activeSection, growthData, demographicsData, fetchSectionData]);

  const sections: { id: SectionType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'market', label: 'Market' },
    { id: 'demographics', label: 'Demographics' },
    { id: 'growth', label: 'Growth' },
  ];

  // Helper to format numbers
  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return 'N/A';
    return num.toLocaleString();
  };

  // Render HTML content safely
  const renderHtmlContent = (html: string | undefined) => {
    if (!html) return null;
    return (
      <div
        className="prose prose-sm max-w-none [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-gray-200 [&_th]:bg-gray-50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-sm [&_th]:font-medium [&_td]:border [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4475e6] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading region data...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Region Not Found</h1>
            <p className="text-gray-600 mb-6">We couldn&apos;t find data for &quot;{regionName}&quot;</p>
            <Link href="/region-reports" className="text-[#4475e6] hover:underline">
              ← Back to Region Reports
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Get SA3 metrics from mspData
  const houseSA3 = mspData?.house?.sa3;
  const unitSA3 = mspData?.unit?.sa3;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-[#f8fafc] py-8 lg:py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Breadcrumb */}
            <nav className="mb-6">
              <ol className="flex items-center gap-2 text-sm">
                <li>
                  <Link href="/region-reports" className="text-[#4475e6] hover:underline">
                    Region Reports
                  </Link>
                </li>
                <li className="text-gray-400">/</li>
                <li className="text-gray-600">{regionName}</li>
              </ol>
            </nav>

            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              {/* Region Info */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-2 py-1 bg-[#4475e6]/10 text-[#4475e6] text-xs font-medium rounded">
                    SA3 Region
                  </span>
                  {regionInfo?.state && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                      {regionInfo.state}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold text-[#383941] mb-2">
                  {regionName}
                </h1>
                {regionInfo?.representativeSuburb && (
                  <p className="text-[#898787]">
                    Based on data from{' '}
                    <Link
                      href={`/suburb-reports/${encodeURIComponent(regionInfo.representativeSuburb)}`}
                      className="text-[#4475e6] hover:underline"
                    >
                      {regionInfo.representativeSuburb}
                    </Link>{' '}
                    and surrounding suburbs
                  </p>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 lg:gap-6">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="text-xs text-[#898787] uppercase tracking-wide mb-1">Median House</div>
                  <div className="text-2xl font-bold text-[#383941]">
                    {houseSA3?.msp_f || 'N/A'}
                  </div>
                  {houseSA3?.['1y_g_f'] && (
                    <div className={`text-sm ${(houseSA3['1y_g'] || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {houseSA3['1y_g_f']} (1yr)
                    </div>
                  )}
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="text-xs text-[#898787] uppercase tracking-wide mb-1">Median Unit</div>
                  <div className="text-2xl font-bold text-[#383941]">
                    {unitSA3?.msp_f || 'N/A'}
                  </div>
                  {unitSA3?.['1y_g_f'] && (
                    <div className={`text-sm ${(unitSA3['1y_g'] || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {unitSA3['1y_g_f']} (1yr)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section Navigation */}
        <section className="border-b border-gray-200 bg-white sticky top-16 z-40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex gap-1 overflow-x-auto py-2 -mb-px">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-[#4475e6] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </div>
        </section>

        {/* Content Sections */}
        <section className="py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Overview Section */}
            {activeSection === 'overview' && (
              <div className="space-y-8">
                {/* Market Overview Cards */}
                <div>
                  <h2 className="text-xl font-bold text-[#383941] mb-4">Market Overview</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Houses */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                      <h3 className="text-lg font-semibold text-[#383941] mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#4475e6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Houses
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Median Sale Price</span>
                          <span className="font-semibold">{houseSA3?.msp_f || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Median Rent</span>
                          <span className="font-semibold">{houseSA3?.mrp_f || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">1 Year Growth</span>
                          <span className={`font-semibold ${(houseSA3?.['1y_g'] || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {houseSA3?.['1y_g_f'] || 'N/A'}
                          </span>
                        </div>
                        {marketInsights?.house && (
                          <>
                            <div className="border-t border-gray-100 pt-3 mt-3">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Days on Market</span>
                                <span className="font-semibold">{marketInsights.house.time_on_market || 'N/A'}</span>
                              </div>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Months of Supply</span>
                              <span className="font-semibold">{marketInsights.house.months_of_supply || 'N/A'}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Units */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                      <h3 className="text-lg font-semibold text-[#383941] mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#4475e6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Units
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Median Sale Price</span>
                          <span className="font-semibold">{unitSA3?.msp_f || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Median Rent</span>
                          <span className="font-semibold">{unitSA3?.mrp_f || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">1 Year Growth</span>
                          <span className={`font-semibold ${(unitSA3?.['1y_g'] || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {unitSA3?.['1y_g_f'] || 'N/A'}
                          </span>
                        </div>
                        {marketInsights?.unit && (
                          <>
                            <div className="border-t border-gray-100 pt-3 mt-3">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Days on Market</span>
                                <span className="font-semibold">{marketInsights.unit.time_on_market || 'N/A'}</span>
                              </div>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Months of Supply</span>
                              <span className="font-semibold">{marketInsights.unit.months_of_supply || 'N/A'}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* MSP Chart */}
                {mspData?.house?.html && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-[#383941] mb-4">Median Sale Price Trend</h3>
                    {renderHtmlContent(mspData.house.html)}
                  </div>
                )}
              </div>
            )}

            {/* Market Section */}
            {activeSection === 'market' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-bold text-[#383941] mb-4">Market Insights</h2>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                      <div className="text-2xl font-bold text-[#4475e6]">
                        {formatNumber(marketInsights?.house?.sold_count)}
                      </div>
                      <div className="text-sm text-gray-600">Houses Sold</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                      <div className="text-2xl font-bold text-[#4475e6]">
                        {formatNumber(marketInsights?.house?.stock_on_market)}
                      </div>
                      <div className="text-sm text-gray-600">Current Listings</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                      <div className="text-2xl font-bold text-[#4475e6]">
                        {marketInsights?.house?.time_on_market || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600">Days on Market</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                      <div className="text-2xl font-bold text-[#4475e6]">
                        {marketInsights?.house?.months_of_supply || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600">Months Supply</div>
                    </div>
                  </div>
                </div>

                {/* Price Charts */}
                {mspData?.house?.html && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-[#383941] mb-4">House Prices</h3>
                    {renderHtmlContent(mspData.house.html)}
                  </div>
                )}

                {mspData?.unit?.html && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-[#383941] mb-4">Unit Prices</h3>
                    {renderHtmlContent(mspData.unit.html)}
                  </div>
                )}
              </div>
            )}

            {/* Demographics Section */}
            {activeSection === 'demographics' && (
              <div className="space-y-8">
                <h2 className="text-xl font-bold text-[#383941] mb-4">Demographics</h2>

                {demographicsData?.html && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-[#383941] mb-4">Population Profile</h3>
                    {renderHtmlContent(demographicsData.html)}
                  </div>
                )}

                {incomeData?.html && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-[#383941] mb-4">Income Distribution</h3>
                    {renderHtmlContent(incomeData.html)}
                  </div>
                )}

                {populationData?.html && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-[#383941] mb-4">Population Trends</h3>
                    {renderHtmlContent(populationData.html)}
                  </div>
                )}

                {!demographicsData?.html && !incomeData?.html && !populationData?.html && (
                  <div className="bg-gray-50 rounded-xl p-8 text-center">
                    <p className="text-gray-600">Demographics data is not available for this region.</p>
                  </div>
                )}
              </div>
            )}

            {/* Growth Section */}
            {activeSection === 'growth' && (
              <div className="space-y-8">
                <h2 className="text-xl font-bold text-[#383941] mb-4">Growth Analysis</h2>

                {/* Growth Summary */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-[#383941] mb-4">House Growth</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">1 Year</span>
                        <span className={`text-xl font-bold ${(houseSA3?.['1y_g'] || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {houseSA3?.['1y_g_f'] || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-[#383941] mb-4">Unit Growth</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">1 Year</span>
                        <span className={`text-xl font-bold ${(unitSA3?.['1y_g'] || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {unitSA3?.['1y_g_f'] || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {growthData?.html && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-[#383941] mb-4">Historical Growth</h3>
                    {renderHtmlContent(growthData.html)}
                  </div>
                )}

                {!growthData?.html && (
                  <div className="bg-gray-50 rounded-xl p-8 text-center">
                    <p className="text-gray-600">Growth chart is loading or not available for this region.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
