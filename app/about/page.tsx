'use client';

import React from 'react';
import Link from 'next/link';

const FeatureDetail: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
    <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-500 text-sm">{description}</p>
  </div>
);

const Step: React.FC<{ number: string; title: string; description: string }> = ({ number, title, description }) => (
  <div className="flex gap-4">
    <div className="flex-shrink-0 w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
      <span className="text-white font-bold">{number}</span>
    </div>
    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500">{description}</p>
    </div>
  </div>
);

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-gray-500 hover:text-gray-900 transition-colors text-sm sm:text-base">
              &larr; Home
            </Link>
            <nav className="flex gap-3 sm:gap-6">
              <Link href="/session" className="text-gray-500 hover:text-gray-900 text-sm sm:text-base">Session</Link>
              <Link href="/register" className="text-gray-500 hover:text-gray-900 text-sm sm:text-base">Sign Up</Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-6">About EMDR-AI Therapy</h1>
          <p className="text-xl text-gray-500">Revolutionizing mental health care through technology and compassion</p>
        </div>

        <section className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">What is EMDR?</h2>
          <div className="text-gray-600 space-y-4">
            <p>EMDR (Eye Movement Desensitization and Reprocessing) is a psychotherapy treatment originally designed to alleviate distress associated with traumatic memories. Developed by Francine Shapiro in the late 1980s, EMDR has been extensively researched and proven effective for treating trauma and PTSD.</p>
            <p>During EMDR therapy, the client attends to emotionally disturbing material in brief sequential doses while simultaneously focusing on an external stimulus. This bilateral stimulation (typically eye movements) is thought to help the brain process and integrate traumatic memories.</p>
            <p>EMDR is recognized as an effective treatment by organizations including:</p>
            <ul className="list-disc list-inside ml-4">
              <li>World Health Organization (WHO)</li>
              <li>American Psychiatric Association</li>
              <li>Department of Veterans Affairs</li>
              <li>International Society for Traumatic Stress Studies</li>
            </ul>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Innovation</h2>
          <div className="text-gray-600 space-y-4">
            <p>EMDR-AI combines traditional EMDR techniques with cutting-edge technology to make this powerful therapy more accessible and personalized:</p>
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <FeatureDetail title="AI-Powered Adaptation" description="Our system uses emotion recognition to adjust patterns and intensity in real-time, ensuring optimal therapeutic effect while maintaining comfort." />
              <FeatureDetail title="Privacy-First Design" description="All emotion processing happens locally on your device. Your facial data never leaves your computer, ensuring complete privacy." />
              <FeatureDetail title="Multi-Sensory Integration" description="We enhance traditional eye movement with binaural beats, ASMR, and spatial audio for a more immersive therapeutic experience." />
              <FeatureDetail title="Clinical Safety" description="Built-in safety protocols monitor for signs of dissociation or distress, automatically adjusting or pausing sessions when needed." />
            </div>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">How It Works</h2>
          <div className="space-y-6">
            <Step number="1" title="Initial Calibration" description="The system calibrates to your unique emotional baseline using privacy-preserving facial analysis. This helps personalize your experience." />
            <Step number="2" title="Pattern Selection" description="Choose from various movement patterns or let the AI select the most appropriate one based on your current emotional state." />
            <Step number="3" title="Guided Session" description="Follow the moving object while focusing on your target issue. The system adapts in real-time to maintain optimal therapeutic conditions." />
            <Step number="4" title="Integration" description="After the bilateral stimulation, you'll be guided through integration exercises to help process and consolidate the experience." />
            <Step number="5" title="Progress Tracking" description="Review your emotional journey with detailed analytics, helping you and your therapist understand your progress over time." />
          </div>
        </section>

        <section className="bg-amber-50 border border-amber-200 rounded-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Safety &amp; Ethics</h2>
          <div className="text-gray-700 space-y-4">
            <p className="font-semibold text-gray-900">Warning: EMDR-AI is a wellness tool, not a replacement for professional therapy.</p>
            <p>While our platform can be helpful for stress reduction and emotional regulation, it should not be used as the sole treatment for serious mental health conditions. We strongly recommend:</p>
            <ul className="list-disc list-inside ml-4">
              <li>Consulting with a mental health professional before starting</li>
              <li>Using our platform as a complement to, not replacement for, therapy</li>
              <li>Stopping immediately if you experience increased distress</li>
              <li>Seeking immediate help if you have thoughts of self-harm</li>
            </ul>
            <p>If you are in crisis, please contact:</p>
            <ul className="list-none ml-4">
              <li>US National Suicide Prevention Lifeline: 988</li>
              <li>UK Samaritans: 116 123</li>
              <li>International: findahelpline.com</li>
            </ul>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
          <div className="text-gray-600 space-y-4">
            <p>We believe that mental health care should be accessible to everyone, regardless of geography, finances, or circumstances. Our mission is to democratize access to evidence-based therapeutic techniques while maintaining the highest standards of safety and privacy.</p>
            <p>EMDR-AI is built by a team of technologists, clinicians, and mental health advocates united by the vision of a world where healing is within everyone&apos;s reach.</p>
          </div>
        </section>

        <div className="text-center mt-12">
          <Link
            href="/session"
            className="inline-block px-12 py-5 bg-gray-900 hover:bg-gray-800 text-white font-bold text-lg rounded-md transition-colors"
          >
            Try Your First Session Free
          </Link>
        </div>
      </div>
    </div>
  );
}
