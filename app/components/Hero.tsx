'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type SearchMode = 'research' | 'property';

interface AddressSuggestion {
  id: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  gnafId: string;
}

interface SuburbSuggestion {
  name: string;
  level: string;
  state: string;
  postcode: string;
  lga: string;
  sa3: string;
}

export default function Hero() {
  const router = useRouter();
  const [searchMode, setSearchMode] = useState<SearchMode>('research');
  const [searchQuery, setSearchQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [suburbSuggestions, setSuburbSuggestions] = useState<SuburbSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Search for suburbs (Research mode)
  const searchSuburbs = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuburbSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/suburb/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      const results = data.results || [];
      if (results.length > 0) {
        setSuburbSuggestions(results);
        setShowSuggestions(true);
      } else {
        setSuburbSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Suburb search error:', error);
      setSuburbSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Search for addresses (Find a Property mode)
  const searchAddresses = useCallback(async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/property/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      // API returns suggestions array with gnaf_id field
      const results = data.suggestions || data.results || [];
      if (results.length > 0) {
        // Map gnaf_id to gnafId for consistency
        const mapped = results.map((item: Record<string, string>) => ({
          id: item.gnaf_id || item.id,
          address: item.address,
          suburb: item.suburb || '',
          state: item.state || '',
          postcode: item.postcode || '',
          gnafId: item.gnaf_id || item.gnafId || item.id,
        }));
        setAddressSuggestions(mapped);
        setShowSuggestions(true);
      } else {
        setAddressSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Address search error:', error);
      setAddressSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (searchMode === 'research') {
        searchSuburbs(value);
      } else {
        searchAddresses(value);
      }
    }, 300);
  };

  // Handle suburb selection (Research mode)
  const handleSelectSuburb = (suggestion: SuburbSuggestion) => {
    setSearchQuery(suggestion.name);
    setShowSuggestions(false);
    setSuburbSuggestions([]);
    // Navigate to suburb report page
    router.push(`/suburb-reports/${encodeURIComponent(suggestion.name)}`);
  };

  // Handle address selection (Find a Property mode)
  const handleSelectAddress = (suggestion: AddressSuggestion) => {
    setSearchQuery(suggestion.address);
    setShowSuggestions(false);
    setAddressSuggestions([]);
    // Navigate to property report page
    router.push(`/property-reports/${suggestion.gnafId}`);
  };

  // Handle search button click
  const handleSearch = () => {
    if (searchMode === 'research' && suburbSuggestions.length > 0) {
      handleSelectSuburb(suburbSuggestions[0]);
    } else if (searchMode === 'property' && addressSuggestions.length > 0) {
      handleSelectAddress(addressSuggestions[0]);
    }
  };

  // Handle hint clicks
  const handleHintClick = (hint: string) => {
    setSearchQuery(hint);
    if (searchMode === 'research') {
      searchSuburbs(hint);
    } else {
      searchAddresses(hint);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const headlines = {
    research: {
      main: 'Beat the market and maximise returns',
      sub: "Access the same data used by Australia's top buyer's agents, updated weekly"
    },
    property: {
      main: 'Find your next investment property',
      sub: 'AI-powered property matching based on your criteria'
    }
  };

  const currentYear = new Date().getFullYear();
  const yearsEstablished = currentYear - 2014;

  const stats = [
    { value: `${yearsEstablished} years`, label: 'Established', icon: 'clock' },
    { value: '2+ Billion', label: 'Data Points', icon: 'database' },
    { value: '5+ Million', label: 'Site Visitors', icon: 'users' },
    { value: '10,000+', label: 'Satisfied Members', icon: 'heart' },
  ];

  return (
    <section className="bg-[#f8fafc] py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-[#383941]">
                {headlines[searchMode].main}
              </h1>
              <p className="text-xl text-[#898787] italic">
                {headlines[searchMode].sub}
              </p>
            </div>

            {/* Search Section */}
            <div className="bg-white rounded-2xl p-6 space-y-4 shadow-sm border border-gray-100">
              {/* Search Tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSearchMode('research');
                    setSearchQuery('');
                    setShowSuggestions(false);
                    setAddressSuggestions([]);
                    setSuburbSuggestions([]);
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    searchMode === 'research'
                      ? 'bg-[#4475e6] text-white'
                      : 'bg-gray-100 text-[#383941] hover:bg-gray-200'
                  }`}
                >
                  Research
                </button>
                <button
                  onClick={() => {
                    setSearchMode('property');
                    setSearchQuery('');
                    setShowSuggestions(false);
                    setAddressSuggestions([]);
                    setSuburbSuggestions([]);
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    searchMode === 'property'
                      ? 'bg-[#4475e6] text-white'
                      : 'bg-gray-100 text-[#383941] hover:bg-gray-200'
                  }`}
                >
                  Find a Property
                </button>
              </div>

              {/* Search Input */}
              <div className="relative" ref={searchRef}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (searchMode === 'research' && suburbSuggestions.length > 0) {
                        handleSelectSuburb(suburbSuggestions[0]);
                      } else if (searchMode === 'property' && addressSuggestions.length > 0) {
                        handleSelectAddress(addressSuggestions[0]);
                      }
                    }
                  }}
                  placeholder={
                    searchMode === 'research'
                      ? 'Search suburb, region or state...'
                      : 'Search for a property address...'
                  }
                  className="w-full px-4 py-4 pr-12 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-500 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4475e6] focus:border-transparent"
                />
                <button
                  onClick={handleSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#4475e6] hover:bg-[#3361d1] rounded-lg transition-colors"
                >
                  {isSearching ? (
                    <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </button>

                {/* Suburb Suggestions Dropdown (Research mode) */}
                {showSuggestions && searchMode === 'research' && suburbSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 max-h-80 overflow-y-auto">
                    {suburbSuggestions.map((suggestion, index) => (
                      <button
                        key={`${suggestion.name}-${index}`}
                        onClick={() => handleSelectSuburb(suggestion)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <svg className="w-5 h-5 text-[#4475e6] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {suggestion.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {suggestion.state}{suggestion.postcode ? ` ${suggestion.postcode}` : ''}{suggestion.lga ? ` • ${suggestion.lga}` : ''}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Address Suggestions Dropdown (Property mode) */}
                {showSuggestions && searchMode === 'property' && addressSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 max-h-80 overflow-y-auto">
                    {addressSuggestions.map((suggestion, index) => (
                      <button
                        key={suggestion.gnafId || index}
                        onClick={() => handleSelectAddress(suggestion)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <svg className="w-5 h-5 text-[#4475e6] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {suggestion.address}
                          </div>
                          {suggestion.suburb && (
                            <div className="text-xs text-gray-500">
                              {suggestion.suburb}{suggestion.state ? `, ${suggestion.state}` : ''}{suggestion.postcode ? ` ${suggestion.postcode}` : ''}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Search Hints */}
              {searchMode === 'research' ? (
                <p className="text-sm text-[#898787]">
                  Try: <span onClick={() => handleHintClick('Paddington')} className="text-[#4475e6] cursor-pointer hover:underline">Paddington</span>,{' '}
                  <span onClick={() => handleHintClick('Belmont North')} className="text-[#4475e6] cursor-pointer hover:underline">Belmont North</span>,{' '}
                  <span onClick={() => handleHintClick('Bondi')} className="text-[#4475e6] cursor-pointer hover:underline">Bondi</span>
                </p>
              ) : (
                <p className="text-sm text-[#898787]">
                  Try: <span onClick={() => handleHintClick('15 Rengor Close Belmont North')} className="text-[#4475e6] cursor-pointer hover:underline">15 Rengor Close Belmont North</span>,{' '}
                  <span onClick={() => handleHintClick('7 Min-Eve Drive Svensson Heights')} className="text-[#4475e6] cursor-pointer hover:underline">7 Min-Eve Drive</span>
                </p>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
                  <div className="text-2xl font-bold text-[#4475e6]">{stat.value}</div>
                  <div className="text-sm text-[#898787]">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Visual */}
          <div className="hidden lg:block relative">
            <div className="relative w-full h-[500px] bg-gradient-to-br from-[#4475e6]/10 to-[#4475e6]/5 rounded-3xl overflow-hidden border border-gray-100">
              {/* Animated Map Placeholder */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  {/* Australia Map SVG Placeholder */}
                  <svg viewBox="0 0 200 200" className="w-64 h-64 text-[#4475e6]/20">
                    <circle cx="100" cy="100" r="80" fill="currentColor" />
                  </svg>
                  {/* Pulsing dots for cities */}
                  <div className="absolute top-1/4 right-1/4 w-3 h-3 bg-[#4475e6] rounded-full animate-ping" />
                  <div className="absolute top-1/2 right-1/3 w-3 h-3 bg-[#4475e6] rounded-full animate-ping animation-delay-300" />
                  <div className="absolute bottom-1/3 left-1/3 w-3 h-3 bg-[#4475e6] rounded-full animate-ping animation-delay-600" />
                </div>
              </div>

              {/* Data streams visualization */}
              <div className="absolute bottom-8 left-8 right-8 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#898787]">Data Points Analyzed</span>
                  <span className="text-[#4475e6] font-mono font-bold">2,847,392,156</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-[#898787]">+15,200 TODAY</span>
                  <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-[#4475e6] rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
