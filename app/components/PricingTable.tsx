'use client';

import { useState } from 'react';

type BillingPeriod = 'monthly' | 'quarterly';

interface Plan {
  name: string;
  monthlyPrice: number | null;
  quarterlyPrice: number | null;
  popular?: boolean;
  features: {
    propertyFinder: string;
    suburbReports: string;
    suburbFinder: string;
    propertyReports: string;
    dataExplorer: string;
  };
}

export default function PricingTable() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  const plans: Plan[] = [
    {
      name: 'Free',
      monthlyPrice: 0,
      quarterlyPrice: 0,
      features: {
        propertyFinder: '5 properties',
        suburbReports: 'Basic only',
        suburbFinder: 'Limited filters',
        propertyReports: 'Basic metrics',
        dataExplorer: 'No access',
      },
    },
    {
      name: 'Basic',
      monthlyPrice: 29,
      quarterlyPrice: 69,
      features: {
        propertyFinder: 'Unlimited',
        suburbReports: '2/month',
        suburbFinder: 'Limited filters',
        propertyReports: '5/month',
        dataExplorer: 'No access',
      },
    },
    {
      name: 'Advanced',
      monthlyPrice: 79,
      quarterlyPrice: 189,
      popular: true,
      features: {
        propertyFinder: 'Unlimited',
        suburbReports: '20/month',
        suburbFinder: 'All filters + CSV',
        propertyReports: '30/month',
        dataExplorer: 'Full access',
      },
    },
    {
      name: 'Portfolio',
      monthlyPrice: 149,
      quarterlyPrice: 359,
      features: {
        propertyFinder: 'Unlimited',
        suburbReports: 'Unlimited',
        suburbFinder: 'All filters + CSV',
        propertyReports: 'Unlimited',
        dataExplorer: 'Full access',
      },
    },
  ];

  const featureLabels = [
    { key: 'propertyFinder', label: 'AI Property Finder', icon: '🤖' },
    { key: 'suburbReports', label: 'Suburb Reports', icon: '📊' },
    { key: 'suburbFinder', label: 'Suburb Finder', icon: '🔍' },
    { key: 'propertyReports', label: 'Property Reports', icon: '🏠' },
    { key: 'dataExplorer', label: 'DataExplorer', icon: '📈' },
  ];

  const getPrice = (plan: Plan) => {
    const price = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.quarterlyPrice;
    return price;
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return 'Loading...';
    if (price === 0) return 'Free';
    return `$${price}`;
  };

  return (
    <section className="py-20 bg-gray-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">
            Buy a better Property, Backed by Data
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Choose the plan that fits your investment journey
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <span
            className={`text-sm font-medium transition-colors ${
              billingPeriod === 'monthly' ? 'text-gray-900' : 'text-gray-500'
            }`}
          >
            Monthly
          </span>
          <button
            onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'quarterly' : 'monthly')}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              billingPeriod === 'quarterly' ? 'bg-[#4475e6]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                billingPeriod === 'quarterly' ? 'translate-x-7' : ''
              }`}
            />
          </button>
          <span
            className={`text-sm font-medium transition-colors ${
              billingPeriod === 'quarterly' ? 'text-gray-900' : 'text-gray-500'
            }`}
          >
            Quarterly
          </span>
          <span className="bg-[#4475e6] text-white text-xs font-semibold px-3 py-1 rounded-full">
            Save 20%
          </span>
        </div>

        {/* Pricing Table */}
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-2xl shadow-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-6 text-left font-medium text-gray-500">Features</th>
                {plans.map((plan, index) => (
                  <th key={index} className="p-6 text-center relative">
                    {plan.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#4475e6] text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    )}
                    <div className="space-y-2">
                      <div className="text-lg font-semibold text-gray-900">{plan.name}</div>
                      <div className="text-3xl font-bold text-gray-900">
                        {formatPrice(getPrice(plan))}
                      </div>
                      {getPrice(plan) !== 0 && (
                        <div className="text-sm text-gray-500">
                          /{billingPeriod === 'monthly' ? 'month' : 'quarter'}
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {featureLabels.map((feature, featureIndex) => (
                <tr key={featureIndex} className="hover:bg-gray-50 transition-colors">
                  <td className="p-5 text-gray-900 font-medium">
                    <span className="mr-2">{feature.icon}</span>
                    {feature.label}
                  </td>
                  {plans.map((plan, planIndex) => {
                    const value = plan.features[feature.key as keyof typeof plan.features];
                    const isFullAccess = value.toLowerCase().includes('unlimited') || value.toLowerCase().includes('full');
                    const isNoAccess = value.toLowerCase().includes('no access');

                    return (
                      <td
                        key={planIndex}
                        className={`p-5 text-center ${
                          isFullAccess
                            ? 'text-[#4475e6] font-medium'
                            : isNoAccess
                            ? 'text-gray-400'
                            : 'text-gray-600'
                        }`}
                      >
                        {isFullAccess && (
                          <svg className="w-5 h-5 text-[#4475e6] mx-auto mb-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td className="p-6"></td>
                {plans.map((plan, index) => (
                  <td key={index} className="p-6 text-center">
                    <button
                      className={`px-6 py-3 rounded-full font-medium transition-all ${
                        plan.popular
                          ? 'bg-[#4475e6] text-white hover:bg-[#3361d1] shadow-lg hover:shadow-xl'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      {plan.monthlyPrice === 0 ? 'Get Started' : 'Subscribe'}
                    </button>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}
