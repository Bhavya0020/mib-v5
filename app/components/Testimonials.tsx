export default function Testimonials() {
  const testimonials = [
    {
      name: 'Sarah M.',
      date: 'January 2024',
      rating: 5,
      text: 'Microburbs helped me identify a street that outperformed the suburb average by 12%. The street-level data is incredible - I could see exactly which blocks had the best growth potential.',
      source: 'Google Reviews'
    },
    {
      name: 'James T.',
      date: 'December 2023',
      rating: 5,
      text: "As a buyer's agent, I use Microburbs daily. The weekly updates and predictive analytics give my clients an edge that other agents simply don't have access to.",
      source: 'Google Reviews'
    },
    {
      name: 'Michelle K.',
      date: 'November 2023',
      rating: 5,
      text: 'The suburb finder helped me discover areas I never would have considered. Found a growing suburb 40km from the CBD with infrastructure plans that will drive growth.',
      source: 'Google Reviews'
    },
    {
      name: 'David R.',
      date: 'October 2023',
      rating: 5,
      text: 'Worth every cent. The risk indicators saved me from buying near a planned social housing development. That information alone paid for my subscription many times over.',
      source: 'Google Reviews'
    },
  ];

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <svg
        key={i}
        className={`w-5 h-5 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">What users say about Microburbs</h2>
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-sm text-gray-600">Reviews from</span>
            <span className="flex items-center gap-1 text-sm font-medium">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google Reviews
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-1">{renderStars(testimonial.rating)}</div>
                <span className="text-sm text-gray-500">{testimonial.date}</span>
              </div>
              <p className="text-gray-700 mb-4 leading-relaxed">"{testimonial.text}"</p>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{testimonial.name}</span>
                <span className="text-xs text-gray-500">{testimonial.source}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
