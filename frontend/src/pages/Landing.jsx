import { Link } from 'react-router-dom';
import { FaLeaf, FaChartLine, FaBrain, FaRecycle, FaArrowRight } from 'react-icons/fa';
import { HiOutlineLightningBolt, HiOutlineShieldCheck, HiOutlineCube } from 'react-icons/hi';

const features = [
  {
    icon: <FaBrain className="text-2xl" />,
    title: 'AI Attendance Prediction',
    desc: 'XGBoost ML model predicts next-day attendance with high accuracy.',
    color: 'from-purple-500 to-indigo-600',
    shadow: 'shadow-purple-500/20',
  },
  {
    icon: <FaChartLine className="text-2xl" />,
    title: 'Smart Analytics',
    desc: 'Real-time charts and insights for food consumption and waste patterns.',
    color: 'from-blue-500 to-cyan-500',
    shadow: 'shadow-blue-500/20',
  },
  {
    icon: <FaRecycle className="text-2xl" />,
    title: 'Waste Reduction',
    desc: 'Track, analyze, and optimize food waste across every meal.',
    color: 'from-green-500 to-emerald-500',
    shadow: 'shadow-green-500/20',
  },
  {
    icon: <HiOutlineLightningBolt className="text-2xl" />,
    title: 'Smart Procurement',
    desc: 'AI-driven suggestions for optimal food procurement based on predictions.',
    color: 'from-amber-500 to-orange-500',
    shadow: 'shadow-amber-500/20',
  },
  {
    icon: <HiOutlineCube className="text-2xl" />,
    title: 'Inventory Management',
    desc: 'Real-time stock tracking with expiry alerts and low-stock notifications.',
    color: 'from-pink-500 to-rose-500',
    shadow: 'shadow-pink-500/20',
  },
  {
    icon: <HiOutlineShieldCheck className="text-2xl" />,
    title: 'Role-Based Access',
    desc: 'Secure JWT authentication with Admin and Mess Manager roles.',
    color: 'from-teal-500 to-green-500',
    shadow: 'shadow-teal-500/20',
  },
];

const stats = [
  { value: '40%', label: 'Waste Reduction' },
  { value: '95%', label: 'Prediction Accuracy' },
  { value: '500+', label: 'Meals Optimized' },
  { value: '₹2L+', label: 'Cost Saved' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50 overflow-hidden">
      {/* Navbar */}
      <nav className="relative z-20 px-6 md:px-12 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
            <FaLeaf className="text-white text-lg" />
          </div>
          <span className="font-bold text-xl text-gray-800">MessWaste<span className="text-primary-600">AI</span></span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="px-5 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-100 transition-colors" id="landing-login">
            Log in
          </Link>
          <Link to="/register" className="btn-primary" id="landing-register">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 md:px-12 pt-12 pb-20 md:pt-20 md:pb-32">
        {/* Decorative elements */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-300/15 rounded-full blur-3xl" />
        <div className="absolute top-40 left-1/3 w-48 h-48 bg-yellow-200/20 rounded-full blur-2xl" />

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100/80 text-primary-700 text-sm font-semibold mb-8 backdrop-blur-sm">
            <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse-soft" />
            AI-Powered Sustainability Solution
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-tight mb-6">
            Smart Mess Waste
            <span className="block bg-gradient-to-r from-primary-600 via-primary-500 to-emerald-500 bg-clip-text text-transparent animate-gradient">
              Management System
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Reduce food waste by up to 40% using AI-powered attendance prediction, 
            smart procurement, and real-time analytics for mess facilities.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="btn-primary flex items-center gap-2 text-lg px-8 py-3.5 shadow-xl shadow-primary-500/20"
              id="hero-cta"
            >
              Start Managing <FaArrowRight />
            </Link>
            <Link
              to="/login"
              className="btn-outline text-lg px-8 py-3.5"
            >
              View Demo
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative z-10 max-w-4xl mx-auto mt-16 md:mt-24">
          <div className="glass-card p-6 md:p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <p className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-primary-600 to-emerald-500 bg-clip-text text-transparent">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-500 mt-1 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 md:px-12 py-20 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for
              <span className="text-primary-600"> Sustainable</span> Management
            </h2>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">
              Everything you need to minimize waste and maximize efficiency in your mess facility.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            {features.map((feat, i) => (
              <div
                key={i}
                className="glass-card p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-default"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feat.color} ${feat.shadow} shadow-lg flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                  {feat.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{feat.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 md:px-12 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-600 via-primary-500 to-emerald-500 p-10 md:p-16 text-center animate-gradient">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to reduce food waste?
              </h2>
              <p className="text-primary-100 text-lg mb-8 max-w-lg mx-auto">
                Join the sustainability revolution. Start predicting, tracking, and optimizing today.
              </p>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-primary-700 font-bold rounded-xl text-lg hover:bg-primary-50 transition-colors shadow-xl"
                id="cta-register"
              >
                Get Started Free <FaArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-8 border-t border-gray-200 text-center">
        <p className="text-gray-400 text-sm">
          © 2024 MessWasteAI. Built with 🌱 for a sustainable future.
        </p>
      </footer>
    </div>
  );
}
