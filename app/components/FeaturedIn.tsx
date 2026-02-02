export default function FeaturedIn() {
  const logos = [
    { name: 'The Age', width: 100 },
    { name: 'Sydney Morning Herald', width: 140 },
    { name: 'Financial Review', width: 130 },
    { name: 'Domain', width: 90 },
    { name: 'Canberra Times', width: 120 },
    { name: 'Your Investment', width: 110 },
  ];

  return (
    <section className="py-12 bg-gray-50 border-y border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-gray-500 mb-8">AS FEATURED IN</p>

        {/* Logo Carousel */}
        <div className="relative overflow-hidden">
          <div className="flex items-center justify-center gap-12 flex-wrap">
            {logos.map((logo, index) => (
              <div
                key={index}
                className="grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
              >
                {/* Placeholder for actual logos */}
                <div
                  className="h-8 bg-gray-300 rounded flex items-center justify-center px-4"
                  style={{ width: logo.width }}
                >
                  <span className="text-xs text-gray-600 font-medium whitespace-nowrap">{logo.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
