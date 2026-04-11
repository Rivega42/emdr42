'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { EmotionRecognitionService, EmotionData } from '@emdr42/core';

declare const faceapi: any;

type Status = 'idle' | 'loading' | 'ready' | 'running' | 'error';

export default function EmotionTestPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const serviceRef = useRef<EmotionRecognitionService | null>(null);

  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [emotionData, setEmotionData] = useState<EmotionData | null>(null);
  const [fps, setFps] = useState(0);
  const frameTimesRef = useRef<number[]>([]);

  // ------- handlers -------

  const handleEmotionUpdate = useCallback((data: EmotionData) => {
    setEmotionData(data);

    // FPS counter
    const now = performance.now();
    frameTimesRef.current.push(now);
    frameTimesRef.current = frameTimesRef.current.filter(t => now - t < 1000);
    setFps(frameTimesRef.current.length);
  }, []);

  const handleDetections = useCallback((detections: any[]) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detections.length > 0 && typeof faceapi !== 'undefined') {
      const resized = faceapi.resizeResults(detections, {
        width: canvas.width,
        height: canvas.height,
      });
      faceapi.draw.drawDetections(canvas, resized);
      faceapi.draw.drawFaceLandmarks(canvas, resized);
    }
  }, []);

  // ------- actions -------

  const start = useCallback(async () => {
    if (!videoRef.current) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const service = new EmotionRecognitionService({ updateFrequency: 150 });
      service.on('emotionUpdate', handleEmotionUpdate);
      service.on('faceDetections', handleDetections);
      serviceRef.current = service;

      await service.initialize(videoRef.current);
      service.startTracking();
      setStatus('running');
    } catch (err: any) {
      console.error('Failed to start emotion test', err);
      setStatus('error');
      setErrorMsg(err?.message ?? 'Unknown error');
    }
  }, [handleEmotionUpdate, handleDetections]);

  const stop = useCallback(() => {
    serviceRef.current?.stopTracking();
    serviceRef.current?.releaseCamera();
    setStatus('ready');
  }, []);

  const reset = useCallback(() => {
    serviceRef.current?.destroy();
    serviceRef.current = null;
    setEmotionData(null);
    setFps(0);
    frameTimesRef.current = [];
    setStatus('idle');
  }, []);

  useEffect(() => {
    return () => {
      serviceRef.current?.destroy();
      serviceRef.current = null;
    };
  }, []);

  // ------- derived data -------

  const basicEmotions: [string, number][] = emotionData?.basicExpressions
    ? Object.entries(emotionData.basicExpressions)
    : [];

  const topAffects: [string, number][] = emotionData?.affects98
    ? Object.entries(emotionData.affects98)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];

  const confidence = emotionData?.confidence ?? 0;
  const arousal = emotionData?.dimensions.arousal ?? 0;
  const valence = emotionData?.dimensions.valence ?? 0;
  const attention = emotionData?.behavioral.attention ?? 0;
  const positivity = emotionData?.behavioral.positivity ?? 0;

  // ------- render -------

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Emotion Recognition Test</h1>
        <p className="text-white/60 text-sm">
          Real-time face-api.js emotion detection with 98 affects circumplex mapping
        </p>
      </div>

      {/* Controls */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={start}
          disabled={status === 'running' || status === 'loading'}
          className="px-5 py-2.5 bg-white text-gray-900 rounded-lg font-medium text-sm hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {status === 'loading' ? 'Loading models...' : 'Start'}
        </button>
        <button
          onClick={stop}
          disabled={status !== 'running'}
          className="px-5 py-2.5 bg-white/10 text-white rounded-lg font-medium text-sm hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Stop
        </button>
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-white/10 text-white rounded-lg font-medium text-sm hover:bg-white/20 transition-colors"
        >
          Reset
        </button>

        {/* Status badge */}
        <div className="ml-auto flex items-center gap-2">
          {status === 'running' && (
            <span className="flex items-center gap-2 text-sm text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Analyzing ({fps} fps)
            </span>
          )}
          {status === 'loading' && (
            <span className="flex items-center gap-2 text-sm text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Loading...
            </span>
          )}
          {status === 'error' && (
            <span className="text-sm text-red-400">{errorMsg}</span>
          )}
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Arousal" value={arousal.toFixed(2)} sub="Energy Level" />
        <MetricCard label="Valence" value={valence.toFixed(2)} sub="Pleasantness" />
        <MetricCard label="Attention" value={`${Math.round(attention * 100)}%`} sub="Focus Level" />
        <MetricCard label="Positivity" value={`${Math.round(positivity * 100)}%`} sub="Overall Mood" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video feed — takes 2 cols */}
        <div className="lg:col-span-2">
          <div className="bg-black/30 border border-white/10 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h2 className="text-sm font-semibold text-white">Live Feed</h2>
              <p className="text-xs text-white/50 mt-0.5">Real-time emotion detection</p>
            </div>
            <div className="relative aspect-video bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
              />
              {status === 'idle' && (
                <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">
                  Click "Start" to begin analysis
                </div>
              )}
            </div>
          </div>

          {/* Confidence indicator */}
          {status === 'running' && (
            <div className="mt-4 bg-black/30 border border-white/10 rounded-xl p-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-white/50 uppercase tracking-wider">Face Detection Confidence</span>
                <span className="text-sm font-semibold text-white">{Math.round(confidence * 100)}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${confidence * 100}%`,
                    backgroundColor: confidence > 0.7 ? '#10b981' : confidence > 0.4 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Basic emotions bar chart */}
          <div className="bg-black/30 border border-white/10 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-1">Basic Emotions</h2>
            <p className="text-xs text-white/50 mb-4">7 fundamental expressions</p>
            <div className="space-y-3">
              {basicEmotions.map(([name, value]) => (
                <div key={name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/70 capitalize">{name}</span>
                    <span className="text-white/50">{Math.round(value * 100)}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-300"
                      style={{ width: `${value * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {basicEmotions.length === 0 && (
                <p className="text-xs text-white/30 text-center py-4">No data yet</p>
              )}
            </div>
          </div>

          {/* Top 5 affects */}
          <div className="bg-black/30 border border-white/10 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-1">Top Emotional States</h2>
            <p className="text-xs text-white/50 mb-4">Most prominent affects</p>
            <div className="space-y-3">
              {topAffects.map(([name, value]) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-xs text-white/70 w-24 truncate">{name}</span>
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-300"
                      style={{ width: `${value * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/50 w-10 text-right">
                    {Math.round(value * 100)}%
                  </span>
                </div>
              ))}
              {topAffects.length === 0 && (
                <p className="text-xs text-white/30 text-center py-4">No data yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------- Sub-components -------

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-black/30 border border-white/10 rounded-xl p-4">
      <div className="text-xs text-white/50 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="text-xs text-white/40 mt-1">{sub}</div>
    </div>
  );
}
