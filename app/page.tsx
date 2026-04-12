'use client';

import React from 'react';
import Link from 'next/link';

const FeatureCard: React.FC<{ icon: string; title: string; description: string }> = ({ icon, title, description }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500">{description}</p>
    </div>
  );
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
              EMDR-AI <span className="text-gray-900">Therapy</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-500 mb-8 max-w-3xl mx-auto">
              Revolutionary virtual therapy platform combining EMDR techniques with AI-powered emotion recognition
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/session"
                className="px-8 py-4 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-md transition-colors"
              >
                Start Free Session
              </Link>
              <Link
                href="/about"
                className="px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold rounded-md transition-colors"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-12">
            Why Choose EMDR-AI?
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard icon="🧠" title="Privacy-First" description="All emotion processing happens locally on your device. Your data never leaves your computer." />
            <FeatureCard icon="🎯" title="Adaptive Therapy" description="AI adjusts patterns and intensity based on your real-time emotional responses." />
            <FeatureCard icon="🎵" title="Multi-Sensory" description="Combines visual EMDR with binaural beats and ASMR for enhanced therapeutic effect." />
            <FeatureCard icon="📊" title="Track Progress" description="Monitor your emotional journey with detailed analytics and session history." />
            <FeatureCard icon="🏆" title="Gamified Healing" description="Achievement system and interactive scenarios make therapy engaging." />
            <FeatureCard icon="🔒" title="Clinically Informed" description="Based on proven EMDR protocols with safety mechanisms built-in." />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Begin Your Healing Journey?
          </h2>
          <p className="text-xl text-gray-500 mb-8">
            Join thousands who have found relief through our innovative therapy platform
          </p>
          <Link
            href="/register"
            className="inline-block px-12 py-5 bg-gray-900 hover:bg-gray-800 text-white font-bold text-lg rounded-md transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  );
}
