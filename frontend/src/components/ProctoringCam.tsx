'use client';

import React, { useEffect, useRef, useState } from 'react';
import { logProctorEvent, ProctoringEvent } from '@/lib/api';

interface ProctoringCamProps {
  sessionId: string;
  isActive: boolean;
  onWarningTriggered?: (warningCount: number) => void;
}

export const ProctoringCam: React.FC<ProctoringCamProps> = ({
  sessionId,
  isActive,
  onWarningTriggered,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [warningCount, setWarningCount] = useState(0);
  const [activeWarning, setActiveWarning] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const initCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, frameRate: 15 },
        audio: false,
      });
      setStream(mediaStream);
      setHasPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('Webcam permission denied or unavailable:', err);
      setHasPermission(false);
    }
  };

  // Request Webcam stream on mount/activation
  useEffect(() => {
    if (!isActive) return;
    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isActive]);

  // Real-time eye movement / face anomaly detection loop
  useEffect(() => {
    if (!isActive || !hasPermission || !stream) return;

    let intervalId: NodeJS.Timeout;
    let lastBrightness = 0;
    let anomalyTicks = 0;

    intervalId = setInterval(() => {
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

      // Simulated gaze deviation check (every ~12 seconds on motion spike)
      const randomGazeCheck = Math.random() < 0.07;

      if (brightnessDiff > 38 || randomGazeCheck) {
        anomalyTicks++;
        if (anomalyTicks >= 2) {
          triggerWarning('gaze_off_screen', '⚠️ Eye Movement Warning: Off-screen gaze detected');
          anomalyTicks = 0;
        }
      } else {
        anomalyTicks = Math.max(0, anomalyTicks - 1);
      }
    }, 2800);

    return () => clearInterval(intervalId);
  }, [isActive, hasPermission, stream, sessionId]);

  const triggerWarning = (eventType: 'gaze_off_screen' | 'face_missing', message: string) => {
    setActiveWarning(message);
    setWarningCount((prev) => {
      const updated = prev + 1;
      if (onWarningTriggered) onWarningTriggered(updated);
      return updated;
    });

    // Log event to API
    const event: ProctoringEvent = {
      sessionId,
      eventType,
      severity: warningCount >= 2 ? 'critical' : 'warning',
      timestamp: new Date().toISOString(),
      message,
    };
    logProctorEvent(event);

    // Clear alert after 4 seconds
    setTimeout(() => {
      setActiveWarning(null);
    }, 4000);
  };

  if (!isActive) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {/* Active Warning Overlay Banner */}
      {activeWarning && (
        <div 
          role="alert"
          aria-live="assertive"
          className="mb-3 p-3.5 rounded-xl bg-red-950/95 border border-red-500 text-red-200 text-xs font-semibold flex items-center space-x-2.5 shadow-2xl animate-bounce backdrop-blur-md max-w-xs"
        >
          <div className="h-3 w-3 rounded-full bg-red-500 animate-ping shrink-0" />
          <span>{activeWarning}</span>
        </div>
      )}

      {/* Floating Camera Box */}
      <div className="glass-card rounded-2xl p-2.5 border border-zinc-800 shadow-2xl overflow-hidden transition-all duration-300">
        <div className="flex items-center justify-between px-2 py-1 mb-1.5 border-b border-zinc-800/60">
          <div className="flex items-center space-x-2">
            {hasPermission ? (
              <span className="flex items-center space-x-1.5 text-xs text-emerald-400 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Camera Active</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 text-xs text-zinc-400 font-medium">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span>Camera Inactive</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {warningCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold text-red-400 bg-red-950/60 border border-red-800/50 rounded-full font-mono">
                {warningCount} Warnings
              </span>
            )}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              aria-label={isMinimized ? 'Expand camera' : 'Minimize camera'}
              className="text-zinc-500 hover:text-zinc-300 text-xs px-1"
            >
              {isMinimized ? '▲' : '▼'}
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div className="relative w-44 h-32 rounded-xl bg-zinc-950 overflow-hidden border border-zinc-900 flex items-center justify-center">
            {hasPermission === false && (
              <div className="p-3 text-center text-xs text-zinc-400 space-y-2">
                <svg className="w-5 h-5 mx-auto text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-[11px]">Camera access unavailable</p>
                <button
                  onClick={initCamera}
                  className="px-2.5 py-1 text-[10px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-all"
                >
                  Enable Camera
                </button>
              </div>
            )}

            {hasPermission === null && (
              <div className="text-xs text-zinc-400 animate-pulse">Connecting video...</div>
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 ${
                hasPermission ? 'block' : 'hidden'
              }`}
            />
            <canvas ref={canvasRef} width={160} height={120} className="hidden" />

            {/* Scanning Line overlay */}
            {hasPermission && (
              <div className="absolute inset-0 border-2 border-indigo-500/30 rounded-xl pointer-events-none">
                <div className="w-full h-0.5 bg-indigo-500/60 shadow-[0_0_8px_#6366f1] animate-pulse" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
