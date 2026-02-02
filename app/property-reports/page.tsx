'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';
import { useAuth } from '@/app/lib/auth/context';

interface AddressSuggestion {
  gnaf_id: string;
  address: string;  // Full display address from Flask
  suburb: string;
  state: string;
  postcode: string;
  property_type?: string;
}

export default function PropertyReportsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [step, setStep] = useState(1);

  // Form state for step 2
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Pre-fill user data if authenticated
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setConfirmEmail(user.email || '');
    }
  }, [user]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/property/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      }
    } catch (err) {
      console.error('Address search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddressChange = (value: string) => {
    setAddress(value);
    setSelectedAddress(null);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchAddress(value);
    }, 300);
  };

  const handleSelectAddress = (suggestion: AddressSuggestion) => {
    setSelectedAddress(suggestion);
    // The address field from Flask already contains the full display name
    setAddress(suggestion.address);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleGetReport = () => {
    if (!selectedAddress) {
      setError('Please select a valid address from the suggestions');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (email !== confirmEmail) {
      setError('Email addresses do not match');
      return;
    }

    if (!selectedAddress) {
      setError('Please select a valid address');
      return;
    }

    setIsSubmitting(true);

    try {
      // Navigate to the report page
      router.push(`/property-reports/${selectedAddress.gnaf_id}?address=${encodeURIComponent(address)}`);
    } catch (err) {
      console.error('Submit error:', err);
      setError('An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: 'MicroVal Price Estimate',
      description: 'Smart price prediction based on comparable sales and local market trends',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: 'Hyperlocal Insights',
      description: 'Street-level data including schools, amenities, noise levels, and demographics',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      title: 'Growth Forecasts',
      description: 'Capital growth projections and rental yield analysis',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      title: 'Risk Assessment',
      description: 'Environmental risks, flood zones, and market volatility indicators',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      title: 'Development Potential',
      description: 'Zoning information, easements, and development assessment scoring',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      title: 'Comparable Sales',
      description: 'Recent sales data and comparative market analysis',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#0f1938] to-[#1a2d5c] text-white py-16 md:py-24">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-[100px]">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Property Investment Report
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-10">
              Unparalleled and in-depth investment insights to help you maximise your returns.
            </p>

            {/* Search Form */}
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-2xl">
              {step === 1 ? (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-800">
                    Critical, data-driven property insights, two clicks away
                  </h2>

                  <div className="relative" ref={suggestionsRef}>
                    <label className="block text-sm font-medium text-gray-700 text-left mb-2">
                      Enter the property address
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => handleAddressChange(e.target.value)}
                      placeholder="Start typing an address..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#4475e6] focus:border-transparent outline-none"
                    />

                    {isSearching && (
                      <div className="absolute right-4 top-[42px]">
                        <div className="w-5 h-5 border-2 border-[#4475e6] border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}

                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {suggestions.map((suggestion, idx) => (
                          <button
                            key={suggestion.gnaf_id || idx}
                            onClick={() => handleSelectAddress(suggestion)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-gray-800"
                          >
                            <div className="font-medium">{suggestion.address}</div>
                            {suggestion.property_type && (
                              <div className="text-xs text-gray-400 capitalize">{suggestion.property_type}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {error && (
                    <p className="text-red-500 text-sm">{error}</p>
                  )}

                  <button
                    onClick={handleGetReport}
                    disabled={!address}
                    className="w-full py-3 bg-[#4475e6] text-white rounded-lg font-semibold hover:bg-[#3361d1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Get Report
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center text-gray-600 hover:text-gray-800 mb-2"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>

                  <h2 className="text-xl font-semibold text-gray-800">
                    Where should we send the report to?
                  </h2>

                  <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 text-left">
                    <span className="font-medium">Property:</span> {address}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 text-left mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#4475e6] focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 text-left mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#4475e6] focus:border-transparent outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 text-left mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#4475e6] focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 text-left mb-1">
                      Confirm Email Address
                    </label>
                    <input
                      type="email"
                      value={confirmEmail}
                      onChange={(e) => setConfirmEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-[#4475e6] focus:border-transparent outline-none"
                    />
                  </div>

                  {error && (
                    <p className="text-red-500 text-sm">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-[#4475e6] text-white rounded-lg font-semibold hover:bg-[#3361d1] transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Loading...' : 'View Report'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-[100px]">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-4">
            What&apos;s Included in Your Report
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Access the same data used by Australia&apos;s top buyer&apos;s agents to make informed investment decisions.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow"
              >
                <div className="text-[#4475e6] mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#4475e6] py-16">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-[100px] text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to Make Data-Driven Decisions?
          </h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            Get unlimited access to property reports, suburb insights, and AI-powered property matching with a subscription.
          </p>
          <Link
            href="/pricing"
            className="inline-block px-8 py-3 bg-white text-[#4475e6] rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            View Subscription Plans
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0f1938] text-white py-12">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-[100px]">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <span className="text-xl font-bold">Microburbs</span>
              <p className="text-gray-400 text-sm mt-2">Australia&apos;s most comprehensive property data</p>
            </div>
            <div className="flex gap-6">
              <Link href="/privacy-policy" className="text-gray-400 hover:text-white text-sm">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white text-sm">
                Terms of Use
              </Link>
              <Link href="/contact" className="text-gray-400 hover:text-white text-sm">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
