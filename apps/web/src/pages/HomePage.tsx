import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full filter blur-3xl opacity-20 animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl opacity-20 animate-pulse" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              EMDR-AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">Therapy</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-3xl mx-auto">
              Revolutionary virtual therapy platform combining EMDR techniques with AI-powered emotion recognition
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/session"
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-full hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
              >
                Start Free Session
              </Link>
              <Link
                to="/about"
                className="px-8 py-4 bg-white/10 backdrop-blur-md text-white font-semibold rounded-full hover:bg-white/20 transition-all duration-200"
              >
                Learn More
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-4xl font-bold text-white text-center mb-12"
          >
            Why Choose EMDR-AI?
          </motion.h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon="🧠"
              title="Privacy-First"
              description="All emotion processing happens locally on your device. Your data never leaves your computer."
            />
            <FeatureCard
              icon="🎯"
              title="Adaptive Therapy"
              description="AI adjusts patterns and intensity based on your real-time emotional responses."
            />
            <FeatureCard
              icon="🎵"
              title="Multi-Sensory"
              description="Combines visual EMDR with binaural beats and ASMR for enhanced therapeutic effect."
            />
            <FeatureCard
              icon="📊"
              title="Track Progress"
              description="Monitor your emotional journey with detailed analytics and session history."
            />
            <FeatureCard
              icon="🏆"
              title="Gamified Healing"
              description="Achievement system and interactive scenarios make therapy engaging."
            />
            <FeatureCard
              icon="🔒"
              title="Clinically Informed"
              description="Based on proven EMDR protocols with safety mechanisms built-in."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Begin Your Healing Journey?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Join thousands who have found relief through our innovative therapy platform
          </p>
          <Link
            to="/register"
            className="inline-block px-12 py-5 bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold text-lg rounded-full hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: string; title: string; description: string }> = ({ icon, title, description }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/10 backdrop-blur-md rounded-2xl p-6 hover:bg-white/20 transition-all duration-200"
    >
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-white/70">{description}</p>
    </motion.div>
  );
};

export default HomePage;