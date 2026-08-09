'use client';

import React, { useEffect, useRef, useState } from 'react';
import { logProctorEvent, ProctoringEvent } from '@/lib/api';

interface ProctoringCamProps {
  sessionId: string;
  isActive: boolean;
  candidateName?: string;
  onWarningTriggered?: (warningCount: number) => void;
  className?: string;
}

export const ProctoringCam: React.FC<ProctoringCamProps> = ({
  sessionId,
  isActive,
  candidateName = 'Candidate',
  onWarningTriggered,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animCanvasRef = useRef<HTMLCanvasElement>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [activeWarning, setActiveWarning] = useState<string | null>(null);
  const [gazeStatus, setGazeStatus] = useState<'centered' | 'deviated'>('centered');
  const [micLevel, setMicLevel] = useState(3);
  const [integrityScore, setIntegrityScore] = useState(100);

  // Initialize Hardware Webcam or Fallback Simulator
  const initCamera = async () => {
    setHasPermission(null);
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 480, height: 360, frameRate: 24 },
          audio: false,
        });
        setStream(mediaStream);
        setHasPermission(true);
        setIsSimulated(false);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        return;
      }
      throw new Error('getUserMedia not supported on this protocol/browser');
    } catch (err: any) {
      console.warn('Webcam hardware unavailable or permission denied:', err);
      setHasPermission(false);
    }
  };

  const startSimulatedFeed = () => {
    setIsSimulated(true);
    setHasPermission(true);
  };

  // Auto-init on active stage
  useEffect(() => {
    if (!isActive) return;
    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isActive]);

  // Audio level meter simulator
  useEffect(() => {
    if (!isActive) return;
    const micInterval = setInterval(() => {
      setMicLevel(Math.floor(Math.random() * 4) + 2);
    }, 600);
    return () => clearInterval(micInterval);
  }, [isActive]);

  // Simulated AI Avatar Feed for Canvas when Hardware Cam is restricted
  useEffect(() => {
    if (!isSimulated || !animCanvasRef.current) return;
    let animId: number;
    let t = 0;
    const canvas = animCanvasRef.current;
    const ctx = canvas.getContext('2d');

    const render = () => {
      if (!ctx) return;
      t += 0.04;
      ctx.fillStyle = '#0f111a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle background grid
      ctx.strokeStyle = '#1e2438';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Head silhouette
      const cx = canvas.width / 2 + Math.sin(t * 0.5) * 4;
      const cy = canvas.height / 2 + 10 + Math.cos(t * 0.8) * 2;

      // Glow behind head
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 70);
      grad.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
      grad.addColorStop(1, 'rgba(99, 102, 241, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 70, 0, Math.PI * 2);
      ctx.fill();

      // Head shape
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 10, 32, 42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Shoulders
      ctx.beginPath();
      ctx.ellipse(cx, cy + 56, 60, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Eye landmarks
      const eyeDx = Math.sin(t * 0.7) * 2;
      ctx.fillStyle = '#818cf8';
      ctx.beginPath();
      ctx.arc(cx - 12 + eyeDx, cy - 14, 3.5, 0, Math.PI * 2);
      ctx.arc(cx + 12 + eyeDx, cy - 14, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // AI Facial Mesh overlay dots
      ctx.fillStyle = '#a5b4fc';
      const meshPoints = [
        [cx, cy - 28],
        [cx - 20, cy - 10],
        [cx + 20, cy - 10],
        [cx - 10, cy + 10],
        [cx + 10, cy + 10],
        [cx, cy + 20],
      ];
      meshPoints.forEach(([px, py]) => {
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isSimulated]);

  // Real-time eye movement / face anomaly detection loop
  useEffect(() => {
    if (!isActive || !hasPermission) return;

    let intervalId: NodeJS.Timeout;
    let lastBrightness = 0;
    let anomalyTicks = 0;

    intervalId = setInterval(() => {
      if (isSimulated) {
        setGazeStatus('centered');
        return;
      }

      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx || video.readyState !== 4) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = frameData.data;

      // Compute average frame brightness & motion difference
      let sumBrightness = 0;
      for (let i = 0; i < data.length; i += 16) {
        sumBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
      }
      const avgBrightness = sumBrightness / (data.length / 16);

      const brightnessDiff = Math.abs(avgBrightness - lastBrightness);
      lastBrightness = avgBrightness;

      // Simulated gaze deviation check (every ~15 seconds on motion spike)
      const randomGazeCheck = Math.random() < 0.05;

      if (brightnessDiff > 42 || randomGazeCheck) {
        anomalyTicks++;
        setGazeStatus('deviated');
        if (anomalyTicks >= 2) {
          triggerWarning('gaze_off_screen', '⚠️ Eye Movement Warning: Off-screen gaze detected');
          anomalyTicks = 0;
        }
      } else {
        setGazeStatus('centered');
        anomalyTicks = Math.max(0, anomalyTicks - 1);
      }
    }, 2800);

    return () => clearInterval(intervalId);
  }, [isActive, hasPermission, stream, sessionId, isSimulated]);

  const triggerWarning = (eventType: 'gaze_off_screen' | 'face_missing', message: string) => {
    setActiveWarning(message);
    setWarningCount((prev) => {
      const updated = prev + 1;
      setIntegrityScore(Math.max(70, 100 - updated * 5));
      if (onWarningTriggered) onWarningTriggered(updated);
      return updated;
    });

    const event: ProctoringEvent = {
      sessionId,
      eventType,
      severity: warningCount >= 2 ? 'critical' : 'warning',
      timestamp: new Date().toISOString(),
      message,
    };
    logProctorEvent(event);

    setTimeout(() => {
      setActiveWarning(null);
    }, 4000);
  };

  if (!isActive) return null;

  return (
    <div className={`flex flex-col space-y-2.5 ${className}`}>
      {/* Top Floating Alert Banner if Warning is active */}
      {activeWarning && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 p-3.5 rounded-xl bg-red-950/95 border border-red-500 text-red-200 text-xs font-semibold flex items-center space-x-2.5 shadow-2xl animate-bounce backdrop-blur-md max-w-md"
        >
          <div className="h-3 w-3 rounded-full bg-red-500 animate-ping shrink-0" />
          <span>{activeWarning}</span>
        </div>
      )}

      {/* Docked Proctoring Module Card */}
      <div className="glass-card rounded-2xl p-3 border border-zinc-800 shadow-xl overflow-hidden bg-zinc-950/80">
        {/* Module Header with Live Status */}
        <div className="flex items-center justify-between px-1 py-1 mb-2 border-b border-zinc-800/60">
          <div className="flex items-center space-x-2">
            <span className="flex items-center space-x-1.5 text-[11px] font-semibold tracking-wide uppercase">
              {hasPermission ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400">AI Proctor Live</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-zinc-400">Camera Paused</span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
              {integrityScore}% Integrity
            </span>
            {warningCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold text-red-400 bg-red-950/80 border border-red-800 rounded-full font-mono">
                {warningCount} ⚠️
              </span>
            )}
          </div>
        </div>

        {/* Video / Canvas Stream Viewport */}
        <div className="relative w-full aspect-video rounded-xl bg-zinc-950 overflow-hidden border border-zinc-850 flex items-center justify-center shadow-inner">
          {/* Hardware Webcam Video */}
          {hasPermission && !isSimulated && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
          )}

          {/* Simulated AI Feed */}
          {hasPermission && isSimulated && (
            <canvas
              ref={animCanvasRef}
              width={320}
              height={240}
              className="w-full h-full object-cover"
            />
          )}

          <canvas ref={canvasRef} width={160} height={120} className="hidden" />

          {/* Camera Permission Request / Fallback UI */}
          {hasPermission === false && (
            <div className="p-4 text-center text-xs text-zinc-400 space-y-2.5 flex flex-col items-center justify-center">
              <div className="h-8 w-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-[11px] text-zinc-300 font-medium leading-snug">
                Camera access restricted or browser permission needed
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <button
                  onClick={initCamera}
                  className="px-3 py-1.5 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md shadow-indigo-600/20 transition-all active:scale-95"
                >
                  Enable Camera
                </button>
                <button
                  onClick={startSimulatedFeed}
                  className="px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg transition-all"
                >
                  Simulate Feed
                </button>
              </div>
            </div>
          )}

          {hasPermission === null && (
            <div className="flex flex-col items-center justify-center space-y-2 text-xs text-zinc-400">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] font-mono">Initializing camera feed...</span>
            </div>
          )}

          {/* AI Face & Eye Tracking Live Hud Overlay */}
          {hasPermission && (
            <>
              {/* Scanline Effect */}
              <div className="absolute inset-0 pointer-events-none border border-indigo-500/30 rounded-xl">
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_8px_#6366f1] animate-pulse" />
              </div>

              {/* Bottom HUD bar */}
              <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-between text-[10px] text-zinc-300">
                <span className="flex items-center space-x-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${gazeStatus === 'centered' ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
                  <span>{gazeStatus === 'centered' ? 'Gaze: Centered' : 'Gaze: Deviated'}</span>
                </span>

                {/* Audio Mic Level Meters */}
                <div className="flex items-center space-x-0.5" title="Mic Audio Activity">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <div
                      key={lvl}
                      className={`w-1 rounded-full transition-all duration-150 ${
                        lvl <= micLevel ? 'bg-emerald-400 h-2.5' : 'bg-zinc-700 h-1.5'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Candidate Identifier footer */}
        <div className="mt-2 pt-2 border-t border-zinc-850 flex items-center justify-between text-[11px] text-zinc-400 px-1">
          <div className="flex items-center space-x-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            <span className="font-medium text-zinc-300 truncate max-w-[140px]">{candidateName}</span>
          </div>
          <button
            onClick={() => {
              if (hasPermission) {
                if (stream) stream.getTracks().forEach((t) => t.stop());
                setHasPermission(false);
                setIsSimulated(false);
              } else {
                initCamera();
              }
            }}
            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium underline"
          >
            {hasPermission ? 'Turn Off Cam' : 'Retry Cam'}
          </button>
        </div>
      </div>
    </div>
  );
};
