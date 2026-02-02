'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/lib/auth/context';
import type { Order, OrderStats, SortField, SortOrder, SortState, FilterState } from '@/app/lib/types/orders';

interface SubscriptionData {
  plan: {
    id: string;
    name: string;
    tier: number;
    description: string;
  };
  usage: {
    propertyReportsUsed: number;
    propertyReportsLimit: number;
    propertyReportsLeft: number;
    suburbReportsUsed: number;
    suburbReportsLimit: number;
    suburbReportsLeft: number;
  };
  features: {
    suburbFinder: 'unlimited' | 'limited';
    propertyFinder: 'unlimited' | 'limited';
    csvExport: boolean;
    prioritySupport: boolean;
  };
}

// Stats Card Component
function StatCard({ value, label, color = 'blue' }: { value: number; label: string; color?: string }) {
  const colorClasses = {
    blue: 'text-[#4475e6]',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 text-center">
      <div className={`text-3xl font-bold ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue} mb-2`}>
        {value.toLocaleString()}
      </div>
      <div className="text-sm text-gray-500 uppercase tracking-wide font-medium">{label}</div>
    </div>
  );
}

// Badge Component
function CategoryBadge({ category }: { category: string }) {
  const isSuburb = category === 'Suburb';
  return (
    <span
      className={`inline-block px-2 py-1 text-xs font-medium uppercase rounded tracking-wide ${
        isSuburb ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
      }`}
    >
      {category}
    </span>
  );
}

// Search Input Component
function SearchInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="min-w-[180px]">
      <label className="block text-xs text-gray-500 mb-1 font-medium">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#4475e6]"
      />
    </div>
  );
}

export default function MembersAreaPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();

  // Subscription state
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasFetched, setHasFetched] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    location: '',
    userEmail: '',
    client: '',
    orderId: '',
  });

  // Sort state
  const [sort, setSort] = useState<SortState>({ field: '', order: 'asc' });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch subscription on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchSubscription();
    }
  }, [isAuthenticated, user]);

  // Fetch orders on mount
  useEffect(() => {
    if (isAuthenticated && user && !hasFetched) {
      fetchOrders();
    }
  }, [isAuthenticated, user, hasFetched]);

  const fetchSubscription = async () => {
    setSubscriptionLoading(true);
    try {
      const response = await fetch('/api/user/subscription');

      // Handle session expiry - clear auth state and redirect to login
      if (response.status === 401) {
        await logout();
        return;
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSubscription(data.subscription);
        }
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const fetchOrders = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/orders?email=${encodeURIComponent(user?.email || '')}`);

      // Handle session expiry - clear auth state and redirect to login
      if (response.status === 401) {
        await logout();
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setOrders(data.orders || []);
      setHasFetched(true);
    } catch (err) {
      setError('Failed to load orders. Please try again.');
      console.error('Error fetching orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate stats
  const stats: OrderStats = useMemo(() => {
    return {
      totalOrders: orders.length,
      suburbReports: orders.filter((o) => o.report_category === 'Suburb').length,
      propertyReports: orders.filter((o) => o.report_category === 'Property').length,
      uniqueLocations: new Set(orders.map((o) => o.location)).size,
    };
  }, [orders]);

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Apply filters
    if (filters.location) {
      result = result.filter((o) => o.location?.toLowerCase().includes(filters.location.toLowerCase()));
    }
    if (filters.userEmail) {
      result = result.filter((o) => o.user_email?.toLowerCase().includes(filters.userEmail.toLowerCase()));
    }
    if (filters.client) {
      // Filter by report_category when using tabs (Property/Suburb)
      if (filters.client === 'Property' || filters.client === 'Suburb') {
        result = result.filter((o) => o.report_category === filters.client);
      } else {
        result = result.filter((o) => o.client?.toLowerCase().includes(filters.client.toLowerCase()));
      }
    }
    if (filters.orderId) {
      result = result.filter((o) => o.order_id?.toLowerCase().includes(filters.orderId.toLowerCase()));
    }

    // Apply sort
    if (sort.field) {
      result.sort((a, b) => {
        let valueA = a[sort.field as keyof Order];
        let valueB = b[sort.field as keyof Order];

        if (!valueA && !valueB) return 0;
        if (!valueA) return sort.order === 'asc' ? 1 : -1;
        if (!valueB) return sort.order === 'asc' ? -1 : 1;

        // Handle date sorting (DD-MM-YYYY format)
        if (sort.field === 'date') {
          const parseDate = (dateStr: string) => {
            const [day, month, year] = dateStr.split('-');
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          };
          valueA = parseDate(valueA as string).getTime() as unknown as string;
          valueB = parseDate(valueB as string).getTime() as unknown as string;
        }

        const strA = String(valueA).toLowerCase();
        const strB = String(valueB).toLowerCase();

        let comparison = 0;
        if (strA > strB) comparison = 1;
        if (strA < strB) comparison = -1;

        return sort.order === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [orders, filters, sort]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sort]);

  const handleSort = useCallback((field: SortField) => {
    setSort((prev) => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const clearFilters = () => {
    setFilters({ location: '', userEmail: '', client: '', orderId: '' });
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#4475e6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const getSortArrow = (field: SortField) => {
    if (sort.field !== field) return '↕';
    return sort.order === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <div className="max-w-[1200px] mx-auto px-5 py-5">
        {/* Header */}
        <header className="flex items-center justify-between mb-5 pb-4 border-b border-gray-200">
          <Link href="/" className="text-lg font-bold text-gray-800">
            Microburbs Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded hover:bg-gray-200 transition-colors"
            >
              Home
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Welcome Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">
            Welcome back, {user.firstName || user.email.split('@')[0]}!
          </h1>
          <p className="text-gray-600">
            View and manage your property and suburb reports.
          </p>
        </div>

        {/* Subscription Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Plan Info */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Plan</h2>
              {subscriptionLoading ? (
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-48 mb-4"></div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl font-bold text-[#4475e6]">
                      {subscription?.plan.name || 'Free'}
                    </span>
                    {subscription?.plan.tier === 0 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                        Free Plan
                      </span>
                    )}
                    {subscription?.plan.tier === 1 && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded">
                        Essentials
                      </span>
                    )}
                    {subscription?.plan.tier === 2 && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-600 text-xs font-medium rounded">
                        Advanced
                      </span>
                    )}
                    {subscription?.plan.tier === 3 && (
                      <span className="px-2 py-1 bg-green-100 text-green-600 text-xs font-medium rounded">
                        Portfolio
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-4">
                    {subscription?.plan.description || 'Basic access to Microburbs features'}
                  </p>
                  {(subscription?.plan.tier || 0) < 3 && (
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#4475e6] text-white text-sm font-medium rounded-lg hover:bg-[#3361d1] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                      Upgrade Plan
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Usage Stats */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Report Credits</h2>
              {subscriptionLoading ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="animate-pulse bg-gray-100 rounded-lg p-4">
                    <div className="h-8 bg-gray-200 rounded w-12 mx-auto mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-24 mx-auto"></div>
                  </div>
                  <div className="animate-pulse bg-gray-100 rounded-lg p-4">
                    <div className="h-8 bg-gray-200 rounded w-12 mx-auto mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-24 mx-auto"></div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {subscription?.usage.propertyReportsLeft === -1
                        ? '∞'
                        : subscription?.usage.propertyReportsLeft || 0}
                    </div>
                    <div className="text-sm text-gray-600">Property Reports Left</div>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      {subscription?.usage.suburbReportsLeft === -1
                        ? '∞'
                        : subscription?.usage.suburbReportsLeft || 0}
                    </div>
                    <div className="text-sm text-gray-600">Suburb Reports Left</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Feature Access */}
          {!subscriptionLoading && subscription && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Feature Access</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${subscription.features.suburbFinder === 'unlimited' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <span className="text-sm text-gray-600">Suburb Finder</span>
                  <span className={`text-xs font-medium ${subscription.features.suburbFinder === 'unlimited' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {subscription.features.suburbFinder === 'unlimited' ? 'Unlimited' : 'Limited'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${subscription.features.propertyFinder === 'unlimited' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <span className="text-sm text-gray-600">Property Finder</span>
                  <span className={`text-xs font-medium ${subscription.features.propertyFinder === 'unlimited' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {subscription.features.propertyFinder === 'unlimited' ? 'Unlimited' : 'Limited'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${subscription.features.csvExport ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm text-gray-600">CSV Export</span>
                  <span className={`text-xs font-medium ${subscription.features.csvExport ? 'text-green-600' : 'text-gray-400'}`}>
                    {subscription.features.csvExport ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${subscription.features.prioritySupport ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm text-gray-600">Priority Support</span>
                  <span className={`text-xs font-medium ${subscription.features.prioritySupport ? 'text-green-600' : 'text-gray-400'}`}>
                    {subscription.features.prioritySupport ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Data Hub Section */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Data Hub Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Data Hub</h2>
              </div>
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={filters.location}
                  onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
                  placeholder="Search reports..."
                  className="w-full md:w-64 pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4475e6] focus:border-transparent"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setFilters((f) => ({ ...f, client: '' }))}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  !filters.client
                    ? 'bg-[#4475e6] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Reports
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {orders.length}
                </span>
              </button>
              <button
                onClick={() => setFilters((f) => ({ ...f, client: 'Property' }))}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filters.client === 'Property'
                    ? 'bg-[#4475e6] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Property
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {stats.propertyReports}
                </span>
              </button>
              <button
                onClick={() => setFilters((f) => ({ ...f, client: 'Suburb' }))}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filters.client === 'Suburb'
                    ? 'bg-[#4475e6] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Suburb
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {stats.suburbReports}
                </span>
              </button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-4 border-[#4475e6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading reports...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-6">
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
                {error}
                <button onClick={fetchOrders} className="ml-4 underline">
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Reports Table */}
          {!isLoading && !error && hasFetched && (
            <>
              {filteredOrders.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No reports yet</h3>
                  <p className="text-gray-500 mb-6">Generate your first property or suburb report to see it here</p>
                  <Link
                    href="/suburb-reports"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#4475e6] text-white rounded-lg font-medium hover:bg-[#3361d1] transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Get Started
                  </Link>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('location')}
                          >
                            Address / Suburb
                            <span className="ml-1">{getSortArrow('location')}</span>
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                            onClick={() => handleSort('date')}
                          >
                            Date
                            <span className="ml-1">{getSortArrow('date')}</span>
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {paginatedOrders.map((order, idx) => (
                          <tr key={order.order_id || idx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                  order.report_category === 'Property'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-green-100 text-green-800'
                                }`}
                              >
                                {order.report_category === 'Property' ? (
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                )}
                                {order.report_category || 'Unknown'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900 max-w-[300px] truncate" title={order.location}>
                                {order.location || 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{order.date || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex justify-end gap-2">
                                {order.url && (
                                  <a
                                    href={order.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#4475e6] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    View
                                  </a>
                                )}
                                {order.pdf_report && order.pdf_report !== 'N/A' && (
                                  <a
                                    href={order.pdf_report}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    PDF
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredOrders.length)} of {filteredOrders.length}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Previous
                        </button>
                        <div className="flex gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`px-3 py-1.5 text-sm rounded-lg ${
                                  currentPage === pageNum
                                    ? 'bg-[#4475e6] text-white'
                                    : 'border border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
