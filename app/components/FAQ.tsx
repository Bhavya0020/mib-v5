'use client';

import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      question: 'How accurate is your growth forecast?',
      answer: 'Our forecasts are back-tested against 35 years of market data. We achieve approximately 85% accuracy in predicting suburb-level growth trends. We publish our methodology and accuracy metrics transparently.'
    },
    {
      question: 'Where does your data come from?',
      answer: 'We aggregate data from multiple sources including property listings, sales records, census data, planning applications, and our proprietary data collection network. All data is updated weekly.'
    },
    {
      question: 'How is this different from looking at suburb averages?',
      answer: 'Suburb averages hide significant street-by-street variations. A suburb might average 5% growth, but some streets grew 15% while others declined. We map at the street level where the real differences exist.'
    },
    {
      question: 'How often is the data updated?',
      answer: 'Most of our data is updated weekly. Price changes, new listings, and market indicators refresh every Wednesday. Census-derived data updates annually when new data is released.'
    },
    {
      question: "Is this worth it compared to hiring a buyer's agent?",
      answer: "Buyer's agents typically charge 1-3% of purchase price ($5,000-$30,000+). Our platform gives you the same data they use for a fraction of the cost. Many buyer's agents actually use Microburbs for their research."
    },
    {
      question: 'What if I buy in the wrong area?',
      answer: "That's exactly what we help you avoid. Our risk indicators highlight potential issues like flood zones, flight paths, future developments, and demographic shifts before you commit."
    },
    {
      question: 'How do I know the street-level data is reliable?',
      answer: 'We validate our street-level data against actual sales outcomes. Our reports show confidence levels for each metric, so you know which data points are robust and which have limited samples.'
    },
    {
      question: 'What risks do you identify that I might miss?',
      answer: 'We flag hidden risks like proximity to public housing, planned infrastructure, crime hotspots, school catchment changes, and development applications that could impact property values.'
    },
    {
      question: 'Can I try before I commit?',
      answer: 'Yes! Our free tier gives you access to basic suburb data, limited property searches, and sample reports. You can upgrade anytime when you need more detailed analysis.'
    },
    {
      question: 'How do I actually use this to find properties?',
      answer: 'Start with Suburb Finder to identify high-potential areas matching your criteria. Then use Suburb Reports for deep-dive analysis. Finally, use Property Finder to surface listings in your target areas that match your investment parameters.'
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h2>
          <p className="mt-4 text-lg text-gray-600">
            Questions from property investors like you
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between p-6 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <h3 className="text-lg font-medium text-gray-900 pr-8">
                  {faq.question}
                </h3>
                <span
                  className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 transition-transform ${
                    openIndex === index ? 'rotate-45' : ''
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </span>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <div className="p-6 pt-0 text-gray-600 leading-relaxed">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
