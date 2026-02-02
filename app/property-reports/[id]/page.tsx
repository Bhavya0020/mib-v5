'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/lib/auth/context';

// Types
interface PropertyAddress {
  street?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  poa?: string;
  formatted?: string;
  with_suburb?: string;
}

interface StructuralVars {
  bedrooms?: string | number;
  bathrooms?: string | number;
  garage_spaces?: string | number;
  land_size?: string;
  property_type?: string;
}

interface LastRecord {
  type?: string;
  price?: string;
  text?: string;
  color?: string;
  offMarket?: number;
}

interface PropertyInfo {
  gnaf_id: string;
  address?: PropertyAddress;
  property_type?: string;
  structural_vars?: StructuralVars;
  last_record?: LastRecord;
}

type HtmlContainer = {
  html?: string;
  [key: string]: HtmlContainer | string | number | boolean | null | undefined;
};

interface SectionData {
  html?: string;
  map?: HtmlContainer;
  table?: HtmlContainer;
  chart?: HtmlContainer;
  public_schools?: HtmlContainer;
  private_schools?: HtmlContainer;
  [key: string]: HtmlContainer | string | number | boolean | null | undefined;
}

interface AVMData {
  predicted_price?: string;
  price_low?: string;
  price_high?: string;
  rent_value?: string;
  rent_low?: string;
  rent_high?: string;
}

// Section tab type
type SectionTab = 'market' | 'risks' | 'development' | 'lifestyle' | 'demographics';

// Chart sub-tab type for market section
type MarketChartTab = 'sales' | 'rent' | 'yield';

// Main Component
export default function PropertyReportPage() {
  const params = useParams();
  const { user, isAuthenticated } = useAuth();
  const gnafId = params.id as string;

  // State
  const [property, setProperty] = useState<PropertyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionTab>('market');
  const [marketChartTab, setMarketChartTab] = useState<MarketChartTab>('sales');
  const [sectionData, setSectionData] = useState<Record<string, SectionData | null>>({});
  const [loadingSections, setLoadingSections] = useState<Record<string, boolean>>({});
  const [imageUrl, setImageUrl] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [avmData, setAvmData] = useState<AVMData | null>(null);

  // Check if user has full access
  const hasFullAccess = isAuthenticated && user?.bestPlanId && !user.bestPlanId.includes('basic');
  const blur = hasFullAccess ? 'false' : 'true';

  // Fetch section data from API
  const fetchSectionData = useCallback(async (section: string) => {
    if (sectionData[section] !== undefined || loadingSections[section]) return;

    setLoadingSections(prev => ({ ...prev, [section]: true }));

    try {
      const response = await fetch(`/api/property/${gnafId}?section=${section}&blur=${blur}`);
      if (response.ok) {
        const result = await response.json();
        setSectionData(prev => ({ ...prev, [section]: result.data }));
      } else {
        setSectionData(prev => ({ ...prev, [section]: null }));
      }
    } catch (err) {
      console.error(`Error fetching ${section}:`, err);
      setSectionData(prev => ({ ...prev, [section]: null }));
    } finally {
      setLoadingSections(prev => ({ ...prev, [section]: false }));
    }
  }, [gnafId, blur, sectionData, loadingSections]);

  // Load property data on mount
  useEffect(() => {
    const loadProperty = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch basic property info
        const response = await fetch(`/api/property/${gnafId}?blur=${blur}`);
        if (!response.ok) {
          throw new Error('Property not found');
        }
        const data = await response.json();
        setProperty(data);

        // Fetch additional data in parallel
        const [imageRes, summaryRes, avmRes, historyRes] = await Promise.all([
          fetch(`/api/property/${gnafId}?section=image`),
          fetch(`/api/property/${gnafId}?section=summary&blur=${blur}`),
          fetch(`/api/property/${gnafId}?section=avm&blur=${blur}`),
          fetch(`/api/property/${gnafId}?section=history&blur=${blur}`),
        ]);

        // Process image
        if (imageRes.ok) {
          const imageData = await imageRes.json();
          if (imageData.data?.img_b64) {
            setImageUrl(`data:image/jpeg;base64,${imageData.data.img_b64}`);
          } else if (imageData.data?.image_url) {
            setImageUrl(imageData.data.image_url);
          }
        }

        // Process summary
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          if (summaryData.data?.summary_short) {
            setSummary(summaryData.data.summary_short);
          } else if (summaryData.data?.html) {
            setSummary(summaryData.data.html);
          }
        }

        // Process AVM
        if (avmRes.ok) {
          const avmResult = await avmRes.json();
          if (avmResult.data) {
            setAvmData(avmResult.data);
          }
        }

        // Process history
        if (historyRes.ok) {
          const historyResult = await historyRes.json();
          setSectionData(prev => ({ ...prev, history: historyResult.data }));
        }

      } catch (err) {
        console.error('Error loading property:', err);
        setError(err instanceof Error ? err.message : 'Failed to load property');
      } finally {
        setIsLoading(false);
      }
    };

    if (gnafId) {
      loadProperty();
    }
  }, [gnafId, blur]);

  // Load section data when section changes
  useEffect(() => {
    if (!property) return;

    switch (activeSection) {
      case 'market':
        fetchSectionData('sales');
        fetchSectionData('rent');
        fetchSectionData('yield');
        fetchSectionData('pocket');
        fetchSectionData('neighbors');
        fetchSectionData('nearby');
        break;
      case 'risks':
        fetchSectionData('risk');
        fetchSectionData('noise');
        break;
      case 'development':
        fetchSectionData('development');
        fetchSectionData('zoning');
        fetchSectionData('easements');
        break;
      case 'lifestyle':
        fetchSectionData('amenities');
        fetchSectionData('schools');
        fetchSectionData('public_schools');
        fetchSectionData('private_schools');
        break;
      case 'demographics':
        fetchSectionData('demographics');
        fetchSectionData('ethnicity');
        fetchSectionData('income');
        break;
    }
  }, [activeSection, property, fetchSectionData]);

  // Section tabs configuration
  const sectionTabs: { id: SectionTab; label: string; icon: string }[] = [
    { id: 'market', label: 'Market Insights', icon: 'chart' },
    { id: 'risks', label: 'Risks', icon: 'warning' },
    { id: 'development', label: 'Development', icon: 'building' },
    { id: 'lifestyle', label: 'Lifestyle', icon: 'heart' },
    { id: 'demographics', label: 'Demographics', icon: 'users' },
  ];

  // Handle section change
  const handleSectionChange = (sectionId: SectionTab) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Copy report URL
  const copyReportUrl = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    });
  };

  // Render HTML content safely
  const renderHtml = (html: string | undefined, isBlurred: boolean = false) => {
    if (!html) return null;
    return (
      <div
        className={`flask-content w-full ${isBlurred && !hasFullAccess ? 'blur-sm pointer-events-none' : ''}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-3 border-[#5675df] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Blur overlay component for locked content
  const BlurOverlay = () => (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
      <div className="text-center p-6">
        <svg className="w-12 h-12 text-[#5675df] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="font-semibold text-gray-800 mb-2">Subscribe to unlock</p>
        <Link href="/pricing" className="text-[#5675df] hover:underline text-sm">View plans</Link>
      </div>
    </div>
  );

  // Section wrapper with optional blur
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

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#5675df] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading property report...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !property) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-sm max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Property Not Found</h2>
          <p className="text-gray-600 mb-6">We couldn&apos;t find the property you&apos;re looking for.</p>
          <Link href="/" className="inline-block px-6 py-3 bg-[#5675df] text-white rounded-lg font-medium hover:bg-[#4a67c7] transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const address = property.address || {};
  const structuralVars = property.structural_vars || {};
  const lastRecord = property.last_record || {};

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <header className="bg-[#0f1938] text-white sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold">Microburbs</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-300 hover:text-white flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Search
            </Link>
            {!isAuthenticated && (
              <Link href="/?login=true" className="px-4 py-2 bg-[#5675df] rounded-lg text-sm font-medium hover:bg-[#4a67c7] transition-colors">
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
            <Link href="/" className="text-gray-500 hover:text-[#5675df] flex items-center gap-2 text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Link>
            <span className="text-gray-300">|</span>
            <span className="font-semibold text-gray-800">{address.street}</span>
          </div>
          <div className="flex gap-3">
            {hasFullAccess && (
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:border-[#5675df] hover:text-[#5675df] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PDF
              </button>
            )}
            <button
              onClick={() => setShowSharePopup(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:border-[#5675df] hover:text-[#5675df] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          </div>
        </div>

        {/* ============================================ */}
        {/* PROPERTY SUMMARY SECTION */}
        {/* ============================================ */}
        <section className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Property Image */}
              <div className="relative h-[300px] bg-gray-100 rounded-xl overflow-hidden">
                {imageUrl ? (
                  <img src={imageUrl} alt="Property" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Property Info */}
              <div className="flex flex-col">
                {/* Status Badge */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: lastRecord.color || '#888' }} />
                    <span className="text-sm font-medium">{lastRecord.type || 'Unknown'}</span>
                  </div>
                </div>

                {/* Address */}
                <h1 className="text-2xl font-bold text-gray-800 mb-2">{address.street}</h1>
                <p className="text-gray-600 mb-6">
                  <Link href={`/suburb-reports?suburb=${encodeURIComponent(address.suburb || '')}`} className="hover:text-[#5675df] hover:underline">
                    {address.suburb}
                  </Link>
                  , {address.state} {address.poa || address.postcode}
                </p>

                {/* Property Features */}
                <div className="flex flex-wrap gap-6 mb-6">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#5675df]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                    <span className="font-semibold">{structuralVars.bedrooms || '-'}</span>
                    <span className="text-gray-500 text-sm">Beds</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#5675df]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                    </svg>
                    <span className="font-semibold">{structuralVars.bathrooms || '-'}</span>
                    <span className="text-gray-500 text-sm">Baths</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#5675df]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                    </svg>
                    <span className="font-semibold">{structuralVars.garage_spaces || '-'}</span>
                    <span className="text-gray-500 text-sm">Cars</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#5675df]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    <span className="font-semibold">{structuralVars.land_size || '-'}</span>
                  </div>
                </div>

                {/* Price */}
                <div className="border-t border-gray-100 pt-5 mt-auto">
                  <p className="text-3xl font-bold text-gray-800">{lastRecord.price || '-'}</p>
                  <p className="text-sm text-gray-500 mt-1">{lastRecord.text || ''}</p>
                </div>
              </div>
            </div>

            {/* GPT Summary */}
            {summary && (
              <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-[#5675df]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <h3 className="font-semibold text-gray-800">AI Property Insights</h3>
                </div>
                <div className="text-gray-600 text-sm leading-relaxed">
                  {summary.includes('<') ? (
                    renderHtml(summary)
                  ) : (
                    <div className="space-y-3">
                      {summary.split('\n\n').map((paragraph, pIdx) => {
                        // Check if this paragraph contains bullet points
                        if (paragraph.includes('\n- ') || paragraph.startsWith('- ')) {
                          const lines = paragraph.split('\n');
                          const intro = lines[0].startsWith('- ') ? null : lines[0];
                          const bullets = lines.filter(l => l.startsWith('- '));
                          return (
                            <div key={pIdx}>
                              {intro && <p className="mb-2">{intro}</p>}
                              <ul className="space-y-1.5">
                                {bullets.map((bullet, bIdx) => (
                                  <li key={bIdx} className="flex items-start gap-2">
                                    <span className="flex-shrink-0">{bullet.substring(2, 4)}</span>
                                    <span>{bullet.substring(4).trim()}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        }
                        return <p key={pIdx}>{paragraph}</p>;
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Property History */}
            {sectionData.history && (
              <div className="mt-6">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#5675df]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Property History
                </h3>
                <SectionWrapper requiresAccess={true}>
                  <div className="bg-gray-50 rounded-xl p-4 overflow-x-auto">
                    {sectionData.history.html ? (
                      renderHtml(sectionData.history.html as string)
                    ) : (
                      <p className="text-gray-500 text-center py-4">No history available</p>
                    )}
                  </div>
                </SectionWrapper>
              </div>
            )}
          </div>
        </section>

        {/* ============================================ */}
        {/* AVM SECTION - Home Value & Rent Estimates */}
        {/* ============================================ */}
        {avmData && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Home Value Estimate */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#5675df]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Home Value Estimate</h2>
                  <p className="text-xs text-gray-500">MicroVal Automated Valuation</p>
                </div>
              </div>
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500 mb-2">Estimated Property Price</p>
                <p className="text-4xl font-bold text-[#5675df]">{avmData.predicted_price || '-'}</p>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="text-center">
                  <p className="text-gray-400">Low</p>
                  <p className="font-semibold">{avmData.price_low || '-'}</p>
                </div>
                <div className="flex-1 mx-4 h-2 bg-gradient-to-r from-blue-200 via-[#5675df] to-blue-200 rounded-full" />
                <div className="text-center">
                  <p className="text-gray-400">High</p>
                  <p className="font-semibold">{avmData.price_high || '-'}</p>
                </div>
              </div>
            </div>

            {/* Rent Estimate */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Rent Estimate</h2>
                  <p className="text-xs text-gray-500">Weekly Rental Value</p>
                </div>
              </div>
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500 mb-2">Estimated Weekly Rent</p>
                <p className="text-4xl font-bold text-orange-500">{avmData.rent_value || 'Coming Soon'}</p>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="text-center">
                  <p className="text-gray-400">Low</p>
                  <p className="font-semibold">{avmData.rent_low || '-'}</p>
                </div>
                <div className="flex-1 mx-4 h-2 bg-gradient-to-r from-orange-200 via-orange-500 to-orange-200 rounded-full" />
                <div className="text-center">
                  <p className="text-gray-400">High</p>
                  <p className="font-semibold">{avmData.rent_high || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* SECTION TABS NAVIGATION */}
        {/* ============================================ */}
        <div className="bg-white rounded-xl shadow-sm mb-6 sticky top-14 z-40">
          <div className="flex overflow-x-auto">
            {sectionTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleSectionChange(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeSection === tab.id
                    ? 'border-[#5675df] text-[#5675df]'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ============================================ */}
        {/* MARKET INSIGHTS SECTION */}
        {/* ============================================ */}
        <section id="market" className={`space-y-6 ${activeSection !== 'market' ? 'hidden' : ''}`}>
          {/* Sales & Prices Charts */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Sales & Rental Data</h2>
            <p className="text-sm text-gray-500 mb-6">Median prices calculated using our smart methodology for {property.property_type || 'properties'}</p>

            {/* Chart Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-100 pb-4">
              <button
                onClick={() => setMarketChartTab('sales')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  marketChartTab === 'sales' ? 'bg-[#5675df] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Median Sale Prices
              </button>
              <button
                onClick={() => setMarketChartTab('rent')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  marketChartTab === 'rent' ? 'bg-[#5675df] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Rental Prices
              </button>
              <button
                onClick={() => setMarketChartTab('yield')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  marketChartTab === 'yield' ? 'bg-[#5675df] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Rental Yield
              </button>
            </div>

            <SectionWrapper requiresAccess={true}>
              <div className="min-h-[350px] bg-gray-50 rounded-xl p-4">
                {marketChartTab === 'sales' && (
                  loadingSections['sales'] ? <LoadingSpinner /> :
                  sectionData['sales']?.html ? renderHtml(sectionData['sales'].html as string) :
                  <div className="flex items-center justify-center h-64 text-gray-400">Sales chart will appear here</div>
                )}
                {marketChartTab === 'rent' && (
                  loadingSections['rent'] ? <LoadingSpinner /> :
                  sectionData['rent']?.html ? renderHtml(sectionData['rent'].html as string) :
                  <div className="flex items-center justify-center h-64 text-gray-400">Rental chart will appear here</div>
                )}
                {marketChartTab === 'yield' && (
                  loadingSections['yield'] ? <LoadingSpinner /> :
                  sectionData['yield']?.html ? renderHtml(sectionData['yield'].html as string) :
                  <div className="flex items-center justify-center h-64 text-gray-400">Yield chart will appear here</div>
                )}
              </div>
            </SectionWrapper>
          </div>

          {/* Median Sale Price by Pocket (Choropleth) */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Median Sale Price by Pocket</h3>
            <p className="text-sm text-gray-500 mb-4">Hyperlocal price variations within the suburb - see which pockets are more valuable</p>
            <SectionWrapper requiresAccess={true}>
              <div className="min-h-[400px] bg-gray-50 rounded-xl overflow-hidden">
                {loadingSections['pocket'] ? <LoadingSpinner /> :
                 sectionData['pocket']?.html ? renderHtml(sectionData['pocket'].html as string) :
                 <div className="flex items-center justify-center h-64 text-gray-400">Pocket price map will appear here</div>}
              </div>
            </SectionWrapper>
          </div>

          {/* Meet the Neighbours */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Meet the Neighbours</h3>
            <p className="text-sm text-gray-500 mb-4">Owner-occupier vs. renter percentage on this street - understand community stability</p>
            <SectionWrapper requiresAccess={true}>
              <div className="min-h-[400px] bg-gray-50 rounded-xl overflow-hidden">
                {loadingSections['neighbors'] ? <LoadingSpinner /> :
                 sectionData['neighbors']?.html ? renderHtml(sectionData['neighbors'].html as string) :
                 <div className="flex items-center justify-center h-64 text-gray-400">Neighbours ownership map will appear here</div>}
              </div>
            </SectionWrapper>
          </div>

          {/* For Sale Properties Nearby */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">For Sale Properties Nearby</h3>
            <p className="text-sm text-gray-500 mb-4">Current listings in the surrounding area</p>
            <SectionWrapper requiresAccess={true}>
              <div className="min-h-[400px] bg-gray-50 rounded-xl overflow-hidden">
                {loadingSections['nearby'] ? <LoadingSpinner /> :
                 sectionData['nearby']?.html ? renderHtml(sectionData['nearby'].html as string) :
                 <div className="flex items-center justify-center h-64 text-gray-400">Nearby properties map will appear here</div>}
              </div>
            </SectionWrapper>
          </div>
        </section>

        {/* ============================================ */}
        {/* RISKS SECTION */}
        {/* ============================================ */}
        <section id="risks" className={`space-y-6 ${activeSection !== 'risks' ? 'hidden' : ''}`}>
          {/* Risk & Public Housing Heatmap */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Risk & Public Housing Assessment</h2>
            <p className="text-sm text-gray-500 mb-4">Environmental risks and public housing concentration areas - red indicates higher risk/concentration</p>
            <SectionWrapper requiresAccess={true}>
              <div className="min-h-[400px] bg-gray-50 rounded-xl overflow-hidden">
                {loadingSections['risk'] ? <LoadingSpinner /> :
                 sectionData['risk']?.html ? renderHtml(sectionData['risk'].html as string) :
                 <div className="flex items-center justify-center h-64 text-gray-400">Risk heatmap will appear here</div>}
              </div>
            </SectionWrapper>
          </div>

          {/* Noise Map */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Noise Levels</h3>
            <p className="text-sm text-gray-500 mb-4">Noise pollution map - red indicates noisier areas (busy roads, commercial zones)</p>
            <SectionWrapper requiresAccess={true}>
              <div className="min-h-[400px] bg-gray-50 rounded-xl overflow-hidden">
                {loadingSections['noise'] ? <LoadingSpinner /> :
                 sectionData['noise']?.html ? renderHtml(sectionData['noise'].html as string) :
                 <div className="flex items-center justify-center h-64 text-gray-400">Noise map will appear here</div>}
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
            <p className="text-sm text-gray-500 mb-4">Recent and upcoming development projects in the area</p>
            <SectionWrapper requiresAccess={true}>
              <div className="grid lg:grid-cols-2 gap-6">
                {/* DA Map */}
                <div className="min-h-[350px] bg-gray-50 rounded-xl overflow-hidden">
                  {loadingSections['development'] ? <LoadingSpinner /> :
                   sectionData['development']?.map?.html ? renderHtml(sectionData['development'].map.html as string) :
                   <div className="flex items-center justify-center h-full text-gray-400">DA map will appear here</div>}
                </div>
                {/* DA Table */}
                <div className="min-h-[350px] bg-gray-50 rounded-xl p-4 overflow-auto">
                  {loadingSections['development'] ? <LoadingSpinner /> :
                   sectionData['development']?.table?.html ? renderHtml(sectionData['development'].table.html as string) :
                   <div className="flex items-center justify-center h-full text-gray-400">DA table will appear here</div>}
                </div>
              </div>
            </SectionWrapper>
          </div>

          {/* Zoning Information */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Zoning Information</h3>
            <p className="text-sm text-gray-500 mb-4">Current zoning classifications and permitted land uses</p>
            <SectionWrapper requiresAccess={true}>
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Zoning Map */}
                <div className="min-h-[350px] bg-gray-50 rounded-xl overflow-hidden">
                  {loadingSections['zoning'] ? <LoadingSpinner /> :
                   sectionData['zoning']?.map?.html ? renderHtml(sectionData['zoning'].map.html as string) :
                   <div className="flex items-center justify-center h-full text-gray-400">Zoning map will appear here</div>}
                </div>
                {/* Zoning Chart/Info */}
                <div className="min-h-[350px] bg-gray-50 rounded-xl p-4 overflow-auto">
                  {loadingSections['zoning'] ? <LoadingSpinner /> :
                   sectionData['zoning']?.chart?.html ? renderHtml(sectionData['zoning'].chart.html as string) :
                   <div className="flex items-center justify-center h-full text-gray-400">Zoning details will appear here</div>}
                </div>
              </div>
            </SectionWrapper>
          </div>

          {/* Easements */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Easements & Rights of Way</h3>
            <p className="text-sm text-gray-500 mb-4">Utility easements and access restrictions affecting the property</p>
            <SectionWrapper requiresAccess={true}>
              <div className="min-h-[400px] bg-gray-50 rounded-xl overflow-hidden">
                {loadingSections['easements'] ? <LoadingSpinner /> :
                 sectionData['easements']?.html ? renderHtml(sectionData['easements'].html as string) :
                 <div className="flex items-center justify-center h-64 text-gray-400">Easements map will appear here</div>}
              </div>
            </SectionWrapper>
          </div>
        </section>

        {/* ============================================ */}
        {/* LIFESTYLE SECTION */}
        {/* ============================================ */}
        <section id="lifestyle" className={`space-y-6 ${activeSection !== 'lifestyle' ? 'hidden' : ''}`}>
          {/* Nearby Amenities */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Nearby Amenities</h2>
            <p className="text-sm text-gray-500 mb-4">Parks, restaurants, shopping, transport, healthcare and more</p>
            <SectionWrapper requiresAccess={true}>
              <div className="min-h-[400px] bg-gray-50 rounded-xl overflow-hidden">
                {loadingSections['amenities'] ? <LoadingSpinner /> :
                 sectionData['amenities']?.html ? renderHtml(sectionData['amenities'].html as string) :
                 <div className="flex items-center justify-center h-64 text-gray-400">Amenities map will appear here</div>}
              </div>
            </SectionWrapper>
          </div>

          {/* Schools */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Schools & Catchments</h2>

            {/* Public Schools */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Public Schools</h3>
              <p className="text-sm text-gray-500 mb-4">School catchment areas and rankings</p>
              <SectionWrapper requiresAccess={true}>
                <div className="min-h-[350px] bg-gray-50 rounded-xl overflow-hidden">
                  {loadingSections['public_schools'] ? <LoadingSpinner /> :
                   sectionData['public_schools']?.html ? renderHtml(sectionData['public_schools'].html as string) :
                   sectionData['schools']?.public_schools?.html ? renderHtml(sectionData['schools'].public_schools.html as string) :
                   <div className="flex items-center justify-center h-64 text-gray-400">Public schools data will appear here</div>}
                </div>
              </SectionWrapper>
            </div>

            {/* Private Schools */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Private Schools</h3>
              <p className="text-sm text-gray-500 mb-4">Nearby private and independent schools</p>
              <SectionWrapper requiresAccess={true}>
                <div className="min-h-[350px] bg-gray-50 rounded-xl overflow-hidden">
                  {loadingSections['private_schools'] ? <LoadingSpinner /> :
                   sectionData['private_schools']?.html ? renderHtml(sectionData['private_schools'].html as string) :
                   sectionData['schools']?.private_schools?.html ? renderHtml(sectionData['schools'].private_schools.html as string) :
                   <div className="flex items-center justify-center h-64 text-gray-400">Private schools data will appear here</div>}
                </div>
              </SectionWrapper>
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* DEMOGRAPHICS SECTION */}
        {/* ============================================ */}
        <section id="demographics" className={`space-y-6 ${activeSection !== 'demographics' ? 'hidden' : ''}`}>
          {/* Population Pyramid */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Population Demographics</h2>
            <p className="text-sm text-gray-500 mb-4">Age and gender distribution in the area</p>
            <SectionWrapper requiresAccess={true}>
              <div className="min-h-[400px] bg-gray-50 rounded-xl overflow-hidden">
                {loadingSections['demographics'] ? <LoadingSpinner /> :
                 sectionData['demographics']?.html ? renderHtml(sectionData['demographics'].html as string) :
                 <div className="flex items-center justify-center h-64 text-gray-400">Population pyramid will appear here</div>}
              </div>
            </SectionWrapper>
          </div>

          {/* Ethnicity */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Ethnicity & Cultural Background</h3>
            <p className="text-sm text-gray-500 mb-4">Cultural diversity and country of birth statistics</p>
            <SectionWrapper requiresAccess={true}>
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Ethnicity Map */}
                <div className="min-h-[350px] bg-gray-50 rounded-xl overflow-hidden">
                  {loadingSections['ethnicity'] ? <LoadingSpinner /> :
                   sectionData['ethnicity']?.map?.html ? renderHtml(sectionData['ethnicity'].map.html as string) :
                   <div className="flex items-center justify-center h-full text-gray-400">Ethnicity heatmap will appear here</div>}
                </div>
                {/* Ethnicity Chart */}
                <div className="min-h-[350px] bg-gray-50 rounded-xl p-4 overflow-auto">
                  {loadingSections['ethnicity'] ? <LoadingSpinner /> :
                   sectionData['ethnicity']?.chart?.html ? renderHtml(sectionData['ethnicity'].chart.html as string) :
                   <div className="flex items-center justify-center h-full text-gray-400">Top regions of birth will appear here</div>}
                </div>
              </div>
            </SectionWrapper>
          </div>

          {/* Income */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Income & Affluence</h3>
            <p className="text-sm text-gray-500 mb-4">Household income levels and affluence scores</p>
            <SectionWrapper requiresAccess={true}>
              <div className="min-h-[300px] bg-gray-50 rounded-xl overflow-hidden">
                {loadingSections['income'] ? <LoadingSpinner /> :
                 sectionData['income']?.html ? renderHtml(sectionData['income'].html as string) :
                 <div className="flex items-center justify-center h-64 text-gray-400">Income data will appear here</div>}
              </div>
            </SectionWrapper>
          </div>
        </section>

        {/* ============================================ */}
        {/* SUBSCRIBE CTA (for non-subscribers) */}
        {/* ============================================ */}
        {!hasFullAccess && (
          <div className="bg-gradient-to-r from-[#5675df] to-[#6b5ce7] rounded-xl p-8 text-white text-center mt-8">
            <h2 className="text-2xl font-bold mb-4">Unlock Full Report Access</h2>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Subscribe to get complete property reports with detailed market analysis, risk assessments, development data, and demographic insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/pricing" className="inline-block px-8 py-3 bg-white text-[#5675df] rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                View Plans
              </Link>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* DISCLAIMER */}
        {/* ============================================ */}
        <div className="mt-8 text-center p-6 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-500 leading-relaxed max-w-3xl mx-auto">
            This Report is for informational purposes only. While Microburbs uses proprietary analysis and sources data from providers believed to be reliable, we do not guarantee accuracy or completeness. This Report should not be the sole basis for investment or financial decisions. Always verify critical details independently and seek advice from a qualified professional.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#0f1938] text-white py-8 mt-12">
        <div className="max-w-[1200px] mx-auto px-4 text-center text-sm text-gray-400">
          <p>Data provided for informational purposes only. Please verify with relevant authorities.</p>
          <p className="mt-2">&copy; {new Date().getFullYear()} Microburbs. All rights reserved.</p>
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
            <p className="text-gray-600 mb-4">Share this property report with anyone</p>
            <div className="grid grid-cols-4 gap-4">
              <a
                href={`mailto:?subject=Property Report - ${address.street}&body=Check out this property report: ${typeof window !== 'undefined' ? window.location.href : ''}`}
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
                href={`https://twitter.com/intent/tweet?url=${typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : ''}&text=Check out this property report`}
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
