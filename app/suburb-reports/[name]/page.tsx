'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/lib/auth/context';

// Types
interface SuburbInfo {
  name: string;
  area_name?: string;
  area_level?: string;
  state?: string;
  state_abr?: string;
  postcode?: string;
  geo_divisions?: {
    lga?: string;
    sa2?: string;
    sa3?: string;
    sa4?: string;
    poa?: string;
    ced?: string;
    sed?: string;
    cr?: string;
    gccsa?: string;
    sal?: string;
    region?: string;
  };
}

interface InsightItem {
  id: string;
  name: string;
  value: string;
  comment: string;
  url?: string;
}

interface InsightsData {
  score?: Record<string, InsightItem>;
  distance?: Record<string, InsightItem>;
  nearest?: Record<string, InsightItem>;
}

interface MarketInsightsData {
  months_of_supply?: {
    all?: { value: number; value_f: string; date_f: string };
  };
  sold_count?: {
    house?: { value: number; value_f: string };
    unit?: { value: number; value_f: string };
    all?: { value: number; value_f: string };
  };
  stock_on_market?: {
    house?: { value: number; value_f: string };
    unit?: { value: number; value_f: string };
    all?: { value: number; value_f: string };
  };
  time_on_market?: {
    house?: { value: number; value_f: string };
    unit?: { value: number; value_f: string };
    all?: { value: number; value_f: string };
  };
}

interface SuburbMetrics {
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
    suburb?: SuburbMetrics;
    cr?: SuburbMetrics;
    sa3?: SuburbMetrics;
    [key: string]: unknown
  };
  unit?: {
    html?: string;
    suburb?: SuburbMetrics;
    cr?: SuburbMetrics;
    sa3?: SuburbMetrics;
    [key: string]: unknown
  };
  age?: string;
  [key: string]: unknown;
}

// Section tab type
type SectionTab = 'overview' | 'market' | 'demographics' | 'lifestyle' | 'properties' | 'development' | 'risks';

// Market chart type
type MarketChartTab = 'msp' | 'mrp' | 'yield' | 'volume' | 'vacancy' | 'growth';

// Demographics chart type
type DemoChartTab = 'demographics' | 'income' | 'industry' | 'ethnicity_ts';

// Main Component
export default function SuburbReportPage() {
  const params = useParams();
  const { user, isAuthenticated } = useAuth();
  const suburbName = decodeURIComponent(params.name as string);

  // State
  const [suburb, setSuburb] = useState<SuburbInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionTab>('overview');
  const [marketChartTab, setMarketChartTab] = useState<MarketChartTab>('msp');
  const [demoChartTab, setDemoChartTab] = useState<DemoChartTab>('demographics');
  const [propertyType, setPropertyType] = useState<'house' | 'unit'>('house');
  const [sectionData, setSectionData] = useState<Record<string, SectionData | null>>({});
  const [loadingSections, setLoadingSections] = useState<Record<string, boolean>>({});
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [marketInsights, setMarketInsights] = useState<MarketInsightsData | null>(null);
  const [similarSuburbs, setSimilarSuburbs] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Check if user has full access
  const hasFullAccess = isAuthenticated && user?.bestPlanId && !user.bestPlanId.includes('basic');
  const blur = hasFullAccess ? 'false' : 'true';

  // Fetch section data from API
  const fetchSectionData = useCallback(async (section: string, extraParams: Record<string, string> = {}) => {
    const cacheKey = `${section}-${JSON.stringify(extraParams)}`;
    if (sectionData[cacheKey] !== undefined || loadingSections[cacheKey]) return;

    setLoadingSections(prev => ({ ...prev, [cacheKey]: true }));

    try {
      const params = new URLSearchParams({ section, blur, ...extraParams });
      const response = await fetch(`/api/suburb/${encodeURIComponent(suburbName)}?${params}`);
      if (response.ok) {
        const result = await response.json();
        setSectionData(prev => ({ ...prev, [cacheKey]: result.data }));
      } else {
        setSectionData(prev => ({ ...prev, [cacheKey]: null }));
      }
    } catch (err) {
      console.error(`Error fetching ${section}:`, err);
      setSectionData(prev => ({ ...prev, [cacheKey]: null }));
    } finally {
      setLoadingSections(prev => ({ ...prev, [cacheKey]: false }));
    }
  }, [suburbName, blur, sectionData, loadingSections]);

  // Load suburb data on mount
  useEffect(() => {
    const loadSuburb = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch suburb info
        const response = await fetch(`/api/suburb/${encodeURIComponent(suburbName)}`);
        if (!response.ok) {
          throw new Error('Suburb not found');
        }
        const data = await response.json();
        setSuburb(data);

        // Fetch insights (scores, distances)
        const insightsRes = await fetch(`/api/suburb/${encodeURIComponent(suburbName)}?section=insights&blur=${blur}`);
        if (insightsRes.ok) {
          const insightsData = await insightsRes.json();
          setInsights(insightsData.data);
        }

        // Fetch market insights (supply/demand)
        const marketRes = await fetch(`/api/suburb/${encodeURIComponent(suburbName)}?section=market_insights&blur=${blur}`);
        if (marketRes.ok) {
          const marketData = await marketRes.json();
          setMarketInsights(marketData.data);
        }

        // Fetch similar suburbs
        const similarRes = await fetch(`/api/suburb/${encodeURIComponent(suburbName)}?section=similar_suburbs&blur=${blur}`);
        if (similarRes.ok) {
          const similarData = await similarRes.json();
          if (similarData.data?.html) {
            setSimilarSuburbs(similarData.data.html);
          }
        }

        // Fetch summary
        const summaryRes = await fetch(`/api/suburb/${encodeURIComponent(suburbName)}?section=summary&blur=${blur}`);
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          if (summaryData.data?.html) {
            setSummary(summaryData.data.html);
          } else if (typeof summaryData.data === 'string') {
            setSummary(summaryData.data);
          }
        }

        // Preload initial market data
        const mspRes = await fetch(`/api/suburb/${encodeURIComponent(suburbName)}?section=msp&blur=${blur}`);
        if (mspRes.ok) {
          const mspData = await mspRes.json();
          setSectionData(prev => ({ ...prev, 'msp-{}': mspData.data }));
        }
      } catch (err) {
        console.error('Error loading suburb:', err);
        setError(err instanceof Error ? err.message : 'Failed to load suburb');
      } finally {
        setIsLoading(false);
      }
    };

    if (suburbName) {
      loadSuburb();
    }
  }, [suburbName, blur]);

  // Load section data when section changes
  useEffect(() => {
    if (!suburb) return;

    switch (activeSection) {
      case 'market':
        fetchSectionData('msp');
        fetchSectionData('mrp');
        fetchSectionData('growth');
        break;
      case 'demographics':
        fetchSectionData('demographics');
        fetchSectionData('income');
        break;
      case 'lifestyle':
        fetchSectionData('amenity');
        fetchSectionData('schools_map');
        fetchSectionData('schools_table');
        fetchSectionData('noise');
        break;
      case 'properties':
        fetchSectionData('pocket', { property_type: propertyType });
        fetchSectionData('streets');
        fetchSectionData('near_sales');
        break;
      case 'development':
        fetchSectionData('das_map');
        fetchSectionData('das_table');
        fetchSectionData('zoning');
        break;
      case 'risks':
        fetchSectionData('risk');
        break;
    }
  }, [activeSection, suburb, fetchSectionData, propertyType]);

  // Section tabs configuration
  const sectionTabs: { id: SectionTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
    { id: 'market', label: 'Market', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg> },
    { id: 'demographics', label: 'Demographics', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
    { id: 'lifestyle', label: 'Lifestyle', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
    { id: 'properties', label: 'Properties', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
    { id: 'development', label: 'Development', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
    { id: 'risks', label: 'Risks', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> },
  ];

  // Handle section change
  const handleSectionChange = (sectionId: SectionTab) => {
    setActiveSection(sectionId);
  };

  // Copy report URL
  const copyReportUrl = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    });
  };

  // Render HTML content
  const renderHtml = (html: string | undefined) => {
    if (!html) return null;
    return (
      <div
        className="flask-content w-full"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  // Get section data with caching
  const getSectionData = (section: string, extraParams: Record<string, string> = {}) => {
    const cacheKey = `${section}-${JSON.stringify(extraParams)}`;
    return sectionData[cacheKey];
  };

  const isLoadingSection = (section: string, extraParams: Record<string, string> = {}) => {
    const cacheKey = `${section}-${JSON.stringify(extraParams)}`;
    return loadingSections[cacheKey];
  };

  // Parse score value to number
  const parseScoreValue = (value: string): number => {
    const match = value.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  // Get score color based on value
  const getScoreColor = (value: number, max: number = 100): string => {
    const percentage = (value / max) * 100;
    if (percentage >= 70) return 'bg-green-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-3 border-[#4475e6] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Blur overlay component
  const BlurOverlay = () => (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
      <div className="text-center p-6">
        <svg className="w-12 h-12 text-[#4475e6] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="font-semibold text-gray-800 mb-2">Subscribe to unlock</p>
        <Link href="/pricing" className="text-[#4475e6] hover:underline text-sm">View plans</Link>
      </div>
    </div>
  );

  // Section wrapper with blur
  const SectionWrapper = ({ children, requiresAccess = true, className = '' }: {
    children: React.ReactNode;
    requiresAccess?: boolean;
    className?: string;
  }) => (
    <div className={`relative ${className}`}>
      {requiresAccess && !hasFullAccess && <BlurOverlay />}
      <div className={requiresAccess && !hasFullAccess ? 'blur-sm pointer-events-none' : ''}>
        {children}
      </div>
    </div>
  );

  // Score card component
  const ScoreCard = ({ item, maxScore = 100 }: { item: InsightItem; maxScore?: number }) => {
    const score = parseScoreValue(item.value);
    const percentage = Math.min((score / maxScore) * 100, 100);

    return (
      <div className="bg-white rounded-lg p-4 border border-gray-100 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{item.name}</span>
          <span className="text-lg font-bold text-gray-900">{item.value}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getScoreColor(score, maxScore)}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">{item.comment}</p>
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#4475e6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading suburb report...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !suburb) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-sm max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Suburb Not Found</h2>
          <p className="text-gray-600 mb-6">We couldn&apos;t find the suburb you&apos;re looking for.</p>
          <Link href="/suburb-reports" className="inline-block px-6 py-3 bg-[#4475e6] text-white rounded-lg font-medium hover:bg-[#3a63c7] transition-colors">
            Search Again
          </Link>
        </div>
      </div>
    );
  }

  const displayName = suburb.area_name || suburb.name || suburbName;
  const stateAbr = suburb.state_abr || '';

  // Get key scores for header
  const keyScores = insights?.score ? [
    insights.score['lifestyle-score'],
    insights.score['safety-score'],
    insights.score['family-score'],
    insights.score['affluence-score'],
  ].filter(Boolean) : [];

  // Get MSP data for header stats
  const mspData = getSectionData('msp');

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <header className="bg-[#0f1938] text-white sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold">Microburbs</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/suburb-reports" className="text-sm text-gray-300 hover:text-white flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Search
            </Link>
            {!isAuthenticated && (
              <Link href="/?login=true" className="px-4 py-2 bg-[#4475e6] rounded-lg text-sm font-medium hover:bg-[#3a63c7] transition-colors">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1200px] mx-auto px-4 py-6">
        {/* Toolbar */}
        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Link href="/suburb-reports" className="text-gray-500 hover:text-[#4475e6] flex items-center gap-2 text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Link>
            <span className="text-gray-300">|</span>
            <span className="font-semibold text-gray-800">{displayName}</span>
            {stateAbr && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">{stateAbr}</span>}
          </div>
          <div className="flex gap-3">
            {hasFullAccess && (
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:border-[#4475e6] hover:text-[#4475e6] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PDF
              </button>
            )}
            <button
              onClick={() => setShowSharePopup(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:border-[#4475e6] hover:text-[#4475e6] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          </div>
        </div>

        {/* Suburb Header with Key Stats */}
        <section className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              {/* Left: Name and location info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-800 mb-3">{displayName}</h1>
                <div className="flex flex-wrap gap-2 text-sm text-gray-500 mb-4">
                  {suburb.geo_divisions?.poa && (
                    <span className="bg-gray-100 px-3 py-1 rounded-full flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {suburb.geo_divisions.poa}
                    </span>
                  )}
                  {suburb.geo_divisions?.lga && (
                    <span className="bg-gray-100 px-3 py-1 rounded-full">{suburb.geo_divisions.lga}</span>
                  )}
                  {suburb.geo_divisions?.sa3 && (
                    <span className="bg-gray-100 px-3 py-1 rounded-full">{suburb.geo_divisions.sa3}</span>
                  )}
                </div>

                {/* Distance info */}
                {insights?.distance && (
                  <div className="flex flex-wrap gap-4 text-sm">
                    {insights.distance['driving-time-to-cbd'] && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <svg className="w-4 h-4 text-[#4475e6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{insights.distance['driving-time-to-cbd'].value} to CBD</span>
                      </div>
                    )}
                    {insights.distance['distance-to-beach'] && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <svg className="w-4 h-4 text-[#4475e6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <span>{insights.distance['distance-to-beach'].comment}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Quick Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {mspData?.house?.suburb?.msp_f && (
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
                    <p className="text-xs text-blue-600 font-medium mb-1">Median House</p>
                    <p className="text-xl font-bold text-gray-800">{mspData.house.suburb.msp_f}</p>
                    {mspData.house.suburb['1y_g_f'] && (
                      <p className={`text-xs mt-1 ${mspData.house.suburb['1y_g'] && mspData.house.suburb['1y_g'] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {mspData.house.suburb['1y_g_f']} (1yr)
                      </p>
                    )}
                  </div>
                )}
                {mspData?.unit?.suburb?.msp_f && (
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center">
                    <p className="text-xs text-purple-600 font-medium mb-1">Median Unit</p>
                    <p className="text-xl font-bold text-gray-800">{mspData.unit.suburb.msp_f}</p>
                    {mspData.unit.suburb['1y_g_f'] && (
                      <p className={`text-xs mt-1 ${mspData.unit.suburb['1y_g'] && mspData.unit.suburb['1y_g'] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {mspData.unit.suburb['1y_g_f']} (1yr)
                      </p>
                    )}
                  </div>
                )}
                {marketInsights?.stock_on_market?.all && (
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center">
                    <p className="text-xs text-green-600 font-medium mb-1">Listings</p>
                    <p className="text-xl font-bold text-gray-800">{marketInsights.stock_on_market.all.value_f}</p>
                    <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
                  </div>
                )}
                {marketInsights?.months_of_supply?.all && (
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 text-center">
                    <p className="text-xs text-orange-600 font-medium mb-1">Months of Supply</p>
                    <p className="text-xl font-bold text-gray-800">{marketInsights.months_of_supply.all.value_f}</p>
                    <p className="text-xs text-gray-500 mt-1">Houses & Units</p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Summary */}
            {summary && (
              <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-[#4475e6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <h3 className="font-semibold text-gray-800">AI Suburb Insights</h3>
                </div>
                <div className="text-gray-600 text-sm leading-relaxed">
                  {summary.includes('<') ? renderHtml(summary) : <p>{summary}</p>}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6 sticky top-14 z-40">
          <div className="flex overflow-x-auto">
            {sectionTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleSectionChange(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeSection === tab.id
                    ? 'border-[#4475e6] text-[#4475e6]'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ============================================ */}
        {/* OVERVIEW SECTION */}
        {/* ============================================ */}
        <section id="overview" className={`space-y-6 ${activeSection !== 'overview' ? 'hidden' : ''}`}>
          {/* Key Scores */}
          {insights?.score && Object.keys(insights.score).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Suburb Scores</h2>
              <p className="text-sm text-gray-500 mb-6">How this suburb rates across key metrics</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.values(insights.score).map((item) => (
                  <ScoreCard key={item.id} item={item} maxScore={item.value.includes('/10') ? 10 : 100} />
                ))}
              </div>
            </div>
          )}

          {/* Distance & Location */}
          {insights?.distance && Object.keys(insights.distance).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Location & Accessibility</h2>
              <p className="text-sm text-gray-500 mb-6">Distance to key locations and amenities</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.values(insights.distance).map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-[#4475e6]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-[#4475e6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                      <p className="text-gray-600 text-sm">{item.value}</p>
                      <p className="text-xs text-gray-400 mt-1">{item.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Supply and Demand Indicators */}
          {marketInsights && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2">{displayName} Supply and Demand Indicators</h2>
              <p className="text-sm text-gray-500 mb-6">Key market indicators for {displayName}.</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {marketInsights.months_of_supply?.all && (
                  <div className="text-center p-5 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-4xl font-bold text-[#4475e6]">{marketInsights.months_of_supply.all.value_f}</p>
                    <p className="text-sm font-medium text-gray-700 mt-2">Months of Supply</p>
                    <p className="text-xs text-gray-500 mt-1">Houses & Units</p>
                  </div>
                )}
                {marketInsights.time_on_market?.house && (
                  <div className="text-center p-5 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-4xl font-bold text-[#4475e6]">{marketInsights.time_on_market.house.value_f}</p>
                    <p className="text-sm font-medium text-gray-700 mt-2">Days on Market</p>
                    <p className="text-xs text-gray-500 mt-1">Houses</p>
                  </div>
                )}
                {marketInsights.sold_count?.all && (
                  <div className="text-center p-5 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-4xl font-bold text-[#4475e6]">{marketInsights.sold_count.all.value_f}</p>
                    <p className="text-sm font-medium text-gray-700 mt-2">Properties Sold</p>
                    <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
                  </div>
                )}
                {marketInsights.stock_on_market?.all && (
                  <div className="text-center p-5 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-4xl font-bold text-[#4475e6]">{marketInsights.stock_on_market.all.value_f}</p>
                    <p className="text-sm font-medium text-gray-700 mt-2">Listings</p>
                    <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Similar Suburbs */}
          {similarSuburbs && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <SectionWrapper requiresAccess={true}>
                {renderHtml(similarSuburbs)}
              </SectionWrapper>
            </div>
          )}
        </section>

        {/* ============================================ */}
        {/* MARKET SECTION */}
        {/* ============================================ */}
        <section id="market" className={`space-y-6 ${activeSection !== 'market' ? 'hidden' : ''}`}>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Market Analytics</h2>
            <p className="text-sm text-gray-500 mb-6">Median prices, growth trends, and market indicators</p>

            {/* Chart Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-100 pb-4">
              {[
                { id: 'msp', label: 'Sale Prices' },
                { id: 'mrp', label: 'Rental Prices' },
                { id: 'yield', label: 'Yield' },
                { id: 'volume', label: 'Volume' },
                { id: 'vacancy', label: 'Vacancy' },
                { id: 'growth', label: 'Growth' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setMarketChartTab(tab.id as MarketChartTab);
                    fetchSectionData(tab.id);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    marketChartTab === tab.id ? 'bg-[#4475e6] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Property Type Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setPropertyType('house')}
                className={`px-3 py-1.5 rounded text-xs font-medium ${propertyType === 'house' ? 'bg-[#4475e6] text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                Houses
              </button>
              <button
                onClick={() => setPropertyType('unit')}
                className={`px-3 py-1.5 rounded text-xs font-medium ${propertyType === 'unit' ? 'bg-[#4475e6] text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                Units
              </button>
            </div>

            <SectionWrapper requiresAccess={false}>
              <div className="min-h-[400px] bg-gray-50 rounded-xl p-4">
                {isLoadingSection(marketChartTab) ? (
                  <LoadingSpinner />
                ) : getSectionData(marketChartTab)?.[propertyType]?.html ? (
                  renderHtml(getSectionData(marketChartTab)?.[propertyType]?.html as string)
                ) : getSectionData(marketChartTab)?.html ? (
                  renderHtml(getSectionData(marketChartTab)?.html as string)
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    No data available
                  </div>
                )}
              </div>
            </SectionWrapper>
          </div>
        </section>

        {/* ============================================ */}
        {/* DEMOGRAPHICS SECTION */}
        {/* ============================================ */}
        <section id="demographics" className={`space-y-6 ${activeSection !== 'demographics' ? 'hidden' : ''}`}>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Demographics</h2>
            <p className="text-sm text-gray-500 mb-6">Age distribution, income, and employment data</p>

            {/* Chart Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-100 pb-4">
              {[
                { id: 'demographics', label: 'Age Distribution' },
                { id: 'income', label: 'Income' },
                { id: 'industry', label: 'Industry' },
                { id: 'ethnicity_ts', label: 'Ethnicity' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setDemoChartTab(tab.id as DemoChartTab);
                    fetchSectionData(tab.id);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    demoChartTab === tab.id ? 'bg-[#4475e6] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <SectionWrapper requiresAccess={false}>
              <div className="min-h-[400px] bg-gray-50 rounded-xl p-4">
                {isLoadingSection(demoChartTab) ? (
                  <LoadingSpinner />
                ) : getSectionData(demoChartTab)?.age ? (
                  renderHtml(getSectionData(demoChartTab)?.age as string)
                ) : getSectionData(demoChartTab)?.html ? (
                  renderHtml(getSectionData(demoChartTab)?.html as string)
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    No data available
                  </div>
                )}
              </div>
            </SectionWrapper>
          </div>
        </section>

        {/* ============================================ */}
        {/* LIFESTYLE SECTION */}
        {/* ============================================ */}
        <section id="lifestyle" className={`space-y-6 ${activeSection !== 'lifestyle' ? 'hidden' : ''}`}>
          {/* Amenities */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Nearby Amenities</h2>
            <p className="text-sm text-gray-500 mb-4">Parks, shops, restaurants, transport and more</p>
            <SectionWrapper requiresAccess={true}>
              <div className="min-h-[400px] bg-gray-50 rounded-xl overflow-hidden">
                {isLoadingSection('amenity') ? <LoadingSpinner /> :
                 getSectionData('amenity')?.html ? renderHtml(getSectionData('amenity')?.html as string) :
                 <div className="flex items-center justify-center h-64 text-gray-400">No data available</div>}
              </div>
            </SectionWrapper>
          </div>

          {/* Schools */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Schools</h2>
            <div className="grid lg:grid-cols-2 gap-6">
              <SectionWrapper requiresAccess={true}>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Schools Map</h3>
                  <div className="min-h-[350px] bg-gray-50 rounded-xl overflow-hidden">
                    {isLoadingSection('schools_map') ? <LoadingSpinner /> :
                     getSectionData('schools_map')?.html ? renderHtml(getSectionData('schools_map')?.html as string) :
                     <div className="flex items-center justify-center h-full text-gray-400">No data available</div>}
                  </div>
                </div>
              </SectionWrapper>
              <SectionWrapper requiresAccess={true}>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Schools List</h3>
                  <div className="min-h-[350px] bg-gray-50 rounded-xl p-4 overflow-auto">
                    {isLoadingSection('schools_table') ? <LoadingSpinner /> :
                     getSectionData('schools_table')?.html ? renderHtml(getSectionData('schools_table')?.html as string) :
                     <div className="flex items-center justify-center h-full text-gray-400">No data available</div>}
                  </div>
                </div>
              </SectionWrapper>
            </div>
          </div>

          {/* Noise */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Noise Levels</h3>
            <p className="text-sm text-gray-500 mb-4">Noise pollution indicators in the area</p>
            <SectionWrapper requiresAccess={true}>
              <div className="min-h-[400px] bg-gray-50 rounded-xl overflow-hidden">
                {isLoadingSection('noise') ? <LoadingSpinner /> :
                 getSectionData('noise')?.html ? renderHtml(getSectionData('noise')?.html as string) :
                 <div className="flex items-center justify-center h-64 text-gray-400">No data available</div>}
              </div>
            </SectionWrapper>
          </div>
        </section>

        {/* ============================================ */}
        {/* PROPERTIES SECTION */}
        {/* ============================================ */}
        <section id="properties" className={`space-y-6 ${activeSection !== 'properties' ? 'hidden' : ''}`}>
          {/* Pocket Prices */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Median Prices by Pocket</h2>
            <p className="text-sm text-gray-500 mb-4">Hyperlocal price variations within the suburb</p>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setPropertyType('house');
                  fetchSectionData('pocket', { property_type: 'house' });
                }}
                className={`px-3 py-1.5 rounded text-xs font-medium ${propertyType === 'house' ? 'bg-[#4475e6] text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                Houses
              </button>
              <button
                onClick={() => {
                  setPropertyType('unit');
                  fetchSectionData('pocket', { property_type: 'unit' });
                }}
                className={`px-3 py-1.5 rounded text-xs font-medium ${propertyType === 'unit' ? 'bg-[#4475e6] text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                Units
              </button>
            </div>

            <SectionWrapper requiresAccess={true}>
              <div className="min-h-[400px] bg-gray-50 rounded-xl overflow-hidden">
                {isLoadingSection('pocket', { property_type: propertyType }) ? <LoadingSpinner /> :
                 getSectionData('pocket', { property_type: propertyType })?.html ? renderHtml(getSectionData('pocket', { property_type: propertyType })?.html as string) :
                 <div className="flex items-center justify-center h-64 text-gray-400">No data available</div>}
              </div>
            </SectionWrapper>
          </div>

          {/* Streets Performance */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Streets Performance</h3>
            <p className="text-sm text-gray-500 mb-4">Market performance by street</p>
            <SectionWrapper requiresAccess={true}>
              <div className="min-h-[350px] bg-gray-50 rounded-xl p-4 overflow-auto">
                {isLoadingSection('streets') ? <LoadingSpinner /> :
                 getSectionData('streets')?.html ? renderHtml(getSectionData('streets')?.html as string) :
                 <div className="flex items-center justify-center h-64 text-gray-400">No data available</div>}
              </div>
            </SectionWrapper>
          </div>

          {/* For Sale */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Properties for Sale</h3>
            <p className="text-sm text-gray-500 mb-4">Current listings in this suburb</p>
            <SectionWrapper requiresAccess={true}>
              <div className="min-h-[400px] bg-gray-50 rounded-xl overflow-hidden">
                {isLoadingSection('near_sales') ? <LoadingSpinner /> :
                 getSectionData('near_sales')?.html ? renderHtml(getSectionData('near_sales')?.html as string) :
                 <div className="flex items-center justify-center h-64 text-gray-400">No data available</div>}
              </div>
            </SectionWrapper>
          </div>
        </section>

        {/* ============================================ */}
        {/* DEVELOPMENT SECTION */}
        {/* ============================================ */}
        <section id="development" className={`space-y-6 ${activeSection !== 'development' ? 'hidden' : ''}`}>
          {/* Development Applications */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Development Applications</h2>
            <p className="text-sm text-gray-500 mb-4">Recent and upcoming development projects</p>
            <SectionWrapper requiresAccess={true}>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="min-h-[350px] bg-gray-50 rounded-xl overflow-hidden">
                  {isLoadingSection('das_map') ? <LoadingSpinner /> :
                   getSectionData('das_map')?.html ? renderHtml(getSectionData('das_map')?.html as string) :
                   <div className="flex items-center justify-center h-full text-gray-400">No data available</div>}
                </div>
                <div className="min-h-[350px] bg-gray-50 rounded-xl p-4 overflow-auto">
                  {isLoadingSection('das_table') ? <LoadingSpinner /> :
                   getSectionData('das_table')?.html ? renderHtml(getSectionData('das_table')?.html as string) :
                   <div className="flex items-center justify-center h-full text-gray-400">No data available</div>}
                </div>
              </div>
            </SectionWrapper>
          </div>

          {/* Zoning */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Zoning</h3>
            <p className="text-sm text-gray-500 mb-4">Land use zoning classifications</p>
            <SectionWrapper requiresAccess={true}>
              <div className="min-h-[400px] bg-gray-50 rounded-xl overflow-hidden">
                {isLoadingSection('zoning') ? <LoadingSpinner /> :
                 getSectionData('zoning')?.html ? renderHtml(getSectionData('zoning')?.html as string) :
                 <div className="flex items-center justify-center h-64 text-gray-400">No data available</div>}
              </div>
            </SectionWrapper>
          </div>
        </section>

        {/* ============================================ */}
        {/* RISKS SECTION */}
        {/* ============================================ */}
        <section id="risks" className={`space-y-6 ${activeSection !== 'risks' ? 'hidden' : ''}`}>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Risk Factors</h2>
            <p className="text-sm text-gray-500 mb-4">Environmental and safety risk indicators</p>
            <SectionWrapper requiresAccess={true}>
              <div className="min-h-[400px] bg-gray-50 rounded-xl overflow-hidden">
                {isLoadingSection('risk') ? <LoadingSpinner /> :
                 getSectionData('risk')?.html ? renderHtml(getSectionData('risk')?.html as string) :
                 <div className="flex items-center justify-center h-64 text-gray-400">No data available</div>}
              </div>
            </SectionWrapper>
          </div>
        </section>

        {/* Subscribe CTA */}
        {!hasFullAccess && (
          <div className="bg-gradient-to-r from-[#4475e6] to-[#6b5ce7] rounded-xl p-8 text-white text-center mt-8">
            <h2 className="text-2xl font-bold mb-4">Unlock Full Suburb Report</h2>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Subscribe to get complete suburb reports with detailed market analysis, demographics, and more.
            </p>
            <Link href="/pricing" className="inline-block px-8 py-3 bg-white text-[#4475e6] rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              View Plans
            </Link>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-8 text-center p-6 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-500 leading-relaxed max-w-3xl mx-auto">
            This Report is for informational purposes only. While Microburbs uses proprietary analysis and sources data from providers believed to be reliable, we do not guarantee accuracy or completeness.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#0f1938] text-white py-8 mt-12">
        <div className="max-w-[1200px] mx-auto px-4 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} Microburbs. All rights reserved.</p>
        </div>
      </footer>

      {/* Share Popup */}
      {showSharePopup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSharePopup(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Share Report</h3>
              <button onClick={() => setShowSharePopup(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <a
                href={`mailto:?subject=Suburb Report - ${displayName}&body=Check out this suburb report: ${typeof window !== 'undefined' ? window.location.href : ''}`}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-xs text-gray-600">Email</span>
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50"
              >
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>
                <span className="text-xs text-gray-600">Facebook</span>
              </a>
              <a
                href={`https://twitter.com/intent/tweet?url=${typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : ''}&text=Check out this suburb report`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50"
              >
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <span className="text-xs text-gray-600">X</span>
              </a>
              <button
                onClick={copyReportUrl}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${copySuccess ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {copySuccess ? (
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  )}
                </div>
                <span className="text-xs text-gray-600">{copySuccess ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
