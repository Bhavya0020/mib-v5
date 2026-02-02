'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/app/lib/auth/context';
import AuthModal from './AuthModal';

export default function Header() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Auth modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  const openAuthModal = (mode: 'login' | 'signup') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#f8fafc]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-[100px]">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold text-[#383941]">Microburbs</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center">
            {/* Products Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProductsOpen(!productsOpen)}
                onBlur={() => setTimeout(() => setProductsOpen(false), 150)}
                className="flex items-center gap-1 px-3.5 py-2 text-sm font-medium text-[#383941] hover:text-[#4475e6] hover:bg-[#4475e60d] rounded-md transition-colors"
              >
                Products
                <svg className={`w-4 h-4 transition-transform ${productsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {productsOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-2">
                  <Link href="/suburb-reports" className="block px-4 py-2 text-sm text-[#383941] hover:bg-gray-50 hover:text-[#4475e6]">Suburb Reports</Link>
                  <Link href="/region-reports" className="block px-4 py-2 text-sm text-[#383941] hover:bg-gray-50 hover:text-[#4475e6]">Region Reports</Link>
                  <Link href="/property-reports" className="block px-4 py-2 text-sm text-[#383941] hover:bg-gray-50 hover:text-[#4475e6]">Property Reports</Link>
                  <Link href="/suburb-finder" className="block px-4 py-2 text-sm text-[#383941] hover:bg-gray-50 hover:text-[#4475e6]">Suburb Finder</Link>
                  <Link href="/property-finder" className="block px-4 py-2 text-sm text-[#383941] hover:bg-gray-50 hover:text-[#4475e6]">AI Property Finder</Link>
                  <Link href="/api" className="block px-4 py-2 text-sm text-[#383941] hover:bg-gray-50 hover:text-[#4475e6]">API Access</Link>
                </div>
              )}
            </div>

            {/* Resources Dropdown */}
            <div className="relative">
              <button
                onClick={() => setResourcesOpen(!resourcesOpen)}
                onBlur={() => setTimeout(() => setResourcesOpen(false), 150)}
                className="flex items-center gap-1 px-3.5 py-2 text-sm font-medium text-[#383941] hover:text-[#4475e6] hover:bg-[#4475e60d] rounded-md transition-colors"
              >
                Resources
                <svg className={`w-4 h-4 transition-transform ${resourcesOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {resourcesOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-2">
                  <Link href="/academy" className="block px-4 py-2 text-sm text-[#383941] hover:bg-gray-50 hover:text-[#4475e6]">Microburbs Academy</Link>
                  <Link href="/blog" className="block px-4 py-2 text-sm text-[#383941] hover:bg-gray-50 hover:text-[#4475e6]">Blog</Link>
                  <Link href="/podcast" className="block px-4 py-2 text-sm text-[#383941] hover:bg-gray-50 hover:text-[#4475e6]">Podcasts and Videos</Link>
                </div>
              )}
            </div>

            <Link href="/pricing" className="px-3.5 py-2 text-sm font-medium text-[#383941] hover:text-[#4475e6] hover:bg-[#4475e60d] rounded-md transition-colors">
              Subscriptions
            </Link>
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isLoading ? (
              <div className="w-20 h-8 bg-gray-200 animate-pulse rounded-md" />
            ) : isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  onBlur={() => setTimeout(() => setUserMenuOpen(false), 150)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#383941] hover:text-[#4475e6] hover:bg-[#4475e60d] rounded-md transition-colors"
                >
                  <div className="w-8 h-8 bg-[#4475e6] text-white rounded-full flex items-center justify-center text-sm font-semibold">
                    {user.firstName?.[0] || user.email[0].toUpperCase()}
                  </div>
                  <span>{user.firstName || 'Account'}</span>
                  <svg className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {userMenuOpen && (
                  <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-2">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <Link href="/members-area" className="block px-4 py-2 text-sm text-[#383941] hover:bg-gray-50 hover:text-[#4475e6]">
                      Dashboard
                    </Link>
                    <Link href="/account" className="block px-4 py-2 text-sm text-[#383941] hover:bg-gray-50 hover:text-[#4475e6]">
                      Account Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-4 py-2 text-sm font-medium text-[#383941] hover:text-[#4475e6] transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => openAuthModal('signup')}
                  className="px-5 py-2 text-sm font-medium text-white bg-[#4475e6] hover:bg-[#3361d1] rounded-md transition-colors"
                >
                  Signup
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#383941]"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="space-y-1">
              <Link href="/suburb-reports" className="block px-4 py-2 text-sm text-[#383941] hover:bg-gray-100 rounded">Suburb Reports</Link>
              <Link href="/region-reports" className="block px-4 py-2 text-sm text-[#383941] hover:bg-gray-100 rounded">Region Reports</Link>
              <Link href="/property-reports" className="block px-4 py-2 text-sm text-[#383941] hover:bg-gray-100 rounded">Property Reports</Link>
              <Link href="/suburb-finder" className="block px-4 py-2 text-sm text-[#383941] hover:bg-gray-100 rounded">Suburb Finder</Link>
              <Link href="/pricing" className="block px-4 py-2 text-sm text-[#383941] hover:bg-gray-100 rounded">Subscriptions</Link>
              <div className="pt-4 flex gap-3 px-4">
                {isAuthenticated && user ? (
                  <>
                    <Link href="/members-area" className="flex-1 px-4 py-2 text-sm text-center border border-gray-300 rounded-md text-[#383941]">
                      Dashboard
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex-1 px-4 py-2 text-sm bg-red-500 text-white rounded-md"
                    >
                      Log Out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { openAuthModal('login'); setMobileMenuOpen(false); }}
                      className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-md text-[#383941]"
                    >
                      Login
                    </button>
                    <button
                      onClick={() => { openAuthModal('signup'); setMobileMenuOpen(false); }}
                      className="flex-1 px-4 py-2 text-sm bg-[#4475e6] text-white rounded-md"
                    >
                      Signup
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </header>
  );
}
