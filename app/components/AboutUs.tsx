export default function AboutUs() {
  const stats = [
    { value: '5,000+', label: 'Metrics per suburb', icon: '📊' },
    { value: 'Billions', label: 'Data points analysed', icon: '📈' },
    { value: 'Weekly', label: 'Forecast updates', icon: '🔄' },
    { value: 'ML-Powered', label: 'Predictive analytics', icon: '🧠' },
  ];

  const philosophy = [
    {
      title: 'Street-Level Analysis',
      description: 'We go beyond suburb averages to reveal the hidden patterns that drive property value.',
      icon: '🔬'
    },
    {
      title: 'Unbiased Insights',
      description: "We don't sell property. We sell information. Our only incentive is accuracy.",
      icon: '⚖️'
    },
    {
      title: 'Cutting-Edge ML',
      description: 'Machine learning models trained on decades of Australian property data.',
      icon: '🤖'
    },
  ];

  return (
    <section className="py-20 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-[#4475e6] text-sm font-medium uppercase tracking-wider">
            Who we are
          </span>
          <h2 className="mt-4 text-3xl lg:text-4xl font-bold text-[#383941]">
            We're Real Estate Data Geeks, Not Salesmen
          </h2>
          <p className="mt-4 text-lg text-[#898787] max-w-3xl mx-auto">
            Microburbs was built by data scientists who believe property decisions should be
            driven by evidence, not emotion.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Founder Section */}
          <div className="bg-[#f8fafc] rounded-2xl p-8 border border-gray-100">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-24 h-24 bg-gradient-to-br from-[#4475e6] to-[#3361d1] rounded-full flex items-center justify-center text-3xl">
                  👨‍💻
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#383941]">Luke Metcalfe</h3>
                <p className="text-[#4475e6] text-sm font-medium">
                  Founder & Real Estate Data Scientist
                </p>
                <p className="mt-4 text-[#898787] leading-relaxed">
                  With a background in quantitative analysis and a passion for real estate,
                  Luke built Microburbs to give everyday investors access to the same
                  data-driven insights that were previously only available to institutional
                  players and top buyer's agents.
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-[#f8fafc] rounded-xl p-6 text-center border border-gray-100"
              >
                <div className="text-3xl mb-2">{stat.icon}</div>
                <div className="text-2xl font-bold text-[#4475e6]">{stat.value}</div>
                <div className="text-sm text-[#898787]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Philosophy Cards */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {philosophy.map((item, index) => (
            <div
              key={index}
              className="bg-[#f8fafc] rounded-xl p-6 border border-gray-100 hover:border-[#4475e6]/50 transition-colors"
            >
              <div className="text-3xl mb-4">{item.icon}</div>
              <h3 className="text-lg font-semibold mb-2 text-[#383941]">{item.title}</h3>
              <p className="text-[#898787] text-sm leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
