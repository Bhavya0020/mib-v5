import Header from './components/Header';
import Hero from './components/Hero';
import FeaturedIn from './components/FeaturedIn';
import OurApproach from './components/OurApproach';
import PricingTable from './components/PricingTable';
import Testimonials from './components/Testimonials';
import FAQ from './components/FAQ';
import AboutUs from './components/AboutUs';
import Footer from './components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Hero />
        <FeaturedIn />
        <OurApproach />
        <PricingTable />
        <Testimonials />
        <FAQ />
        <AboutUs />
      </main>
      <Footer />
    </div>
  );
}
