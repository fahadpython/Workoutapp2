
import React, { useRef, useEffect } from 'react';
import { PacerConfig } from '../types';

interface Props {
  progress: number; // 0 to 1
  phase: string;
  isPaused: boolean;
  pacerConfig: PacerConfig;
}

const GamePacer: React.FC<Props> = ({ progress, phase, isPaused, pacerConfig }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef(0);
  
  // Calculate ideal path based on tempo
  // We need to map time -> ideal progress (0 to 1)
  const getIdealProgress = (time: number) => {
      const totalDur = pacerConfig.phases.reduce((acc, p) => acc + p.duration, 0) * 1000;
      const t = time % totalDur;
      let elapsed = 0;
      
      for (const p of pacerConfig.phases) {
          const dur = p.duration * 1000;
          if (t < elapsed + dur) {
              const localT = (t - elapsed) / dur;
              const action = p.action.toUpperCase();
              
              // 0=Top/Start, 1=Bottom/Deep
              // Eccentric (Down): 0 -> 1
              if (['LOWER', 'DOWN', 'SIT'].some(k => action.includes(k))) return localT;
              
              // Concentric (Up): 1 -> 0
              if (['UP', 'PRESS', 'DRIVE', 'PULL', 'CURL'].some(k => action.includes(k))) return 1 - localT;
              
              // Holds
              if (['STRETCH', 'BOTTOM'].some(k => action.includes(k))) return 1;
              return 0;
          }
          elapsed += dur;
      }
      return 0;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const startTime = Date.now();

    const draw = () => {
      if (!canvas) return;
      const width = canvas.width;
      const height = canvas.height;
      const now = Date.now();
      
      if (!isPaused) {
          scrollRef.current += 2; // Speed of scroll
      }

      // Clear
      ctx.fillStyle = '#1e293b'; // Gym-800
      ctx.fillRect(0, 0, width, height);

      // Draw Tunnel (The Path)
      ctx.beginPath();
      ctx.lineWidth = 40; // Tunnel width
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#334155'; // Gym-700

      // Draw future path points
      const pointsToDraw = 50; // How far ahead
      const spacing = 10;
      
      for (let i = 0; i < pointsToDraw; i++) {
          const futureTime = now + (i * 100); // look ahead time
          const idealP = getIdealProgress(futureTime);
          
          // Map progress 0-1 to Height
          // 0 = Top of Screen (10% padding), 1 = Bottom (90% padding)
          const y = (height * 0.1) + (idealP * (height * 0.8));
          const x = (width * 0.2) + (i * spacing); // Player is at 20% width
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw Target (Ghost)
      const currentTargetP = getIdealProgress(now);
      const targetY = (height * 0.1) + (currentTargetP * (height * 0.8));
      const playerX = width * 0.2;
      
      ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'; // Blue ghost
      ctx.beginPath();
      ctx.arc(playerX, targetY, 15, 0, Math.PI * 2);
      ctx.fill();

      // Draw Player
      const playerY = (height * 0.1) + (progress * (height * 0.8));
      
      // Determine color based on error
      const diff = Math.abs(playerY - targetY);
      let playerColor = '#4ade80'; // Green
      if (diff > 40) playerColor = '#ef4444'; // Red (Fail)
      else if (diff > 20) playerColor = '#facc15'; // Yellow (Warning)

      ctx.fillStyle = playerColor;
      ctx.shadowBlur = 10;
      ctx.shadowColor = playerColor;
      ctx.beginPath();
      ctx.arc(playerX, playerY, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Labels
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText("TOP / START", 5, 15);
      ctx.fillText("BOTTOM / DEEP", 5, height - 5);

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [progress, isPaused, pacerConfig]);

  return (
    <div className="relative w-full h-64 rounded-xl overflow-hidden border border-gym-600 shadow-inner">
       <canvas ref={canvasRef} width={350} height={256} className="w-full h-full" />
       {/* Overlay Text */}
       <div className="absolute top-2 right-2 text-xs font-bold text-white bg-black/50 px-2 py-1 rounded">
           GAME MODE
       </div>
    </div>
  );
};

export default GamePacer;
