'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function ProgressPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold text-white mb-2">Progress</h1>
        <p className="text-white/70 mb-8">Track your therapy journey</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-white/50 text-center py-16"
      >
        Progress data will appear here once you start sessions.
      </motion.div>
    </div>
  );
}
