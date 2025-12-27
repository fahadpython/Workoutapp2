
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
  const getIdealProgress = (time: number) => {
      const totalDur = pacerConfig.phases.reduce((acc, p) => acc + p.duration, 0) * 1000;
      const t = time % totalDur;
      let elapsed = 0;
      
      for (const p of pacerConfig.phases) {
          const dur = p.duration * 1000;
          if (t < elapsed + dur) {
              const localT = (t - elapsed) / dur;
              const action = p.action.toUpperCase();
              
              if (['LOWER', 'DOWN', 'SIT', 'ECCENTRIC'].some(k => action.includes(k))) return localT;
              if (['UP', 'PRESS', 'DRIVE', 'PULL', 'CURL', 'CONCENTRIC'].some(k => action.includes(k))) return 1 - localT;
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
    // Don't restart start time on every render, but we need it relative to scroll
    
    const draw = () => {
      if (!canvas) return;
      const width = canvas.width;
      const height = canvas.height;
      const now = Date.now();
      
      if (!isPaused) {
          scrollRef.current += 3; // Speed
      }

      // 1. Background
      ctx.fillStyle = '#0f172a'; // Gym-900
      ctx.fillRect(0, 0, width, height);
      
      // Grid lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for(let i=0; i<height; i+=40) { ctx.moveTo(0,i); ctx.lineTo(width,i); }
      ctx.stroke();

      // 2. Draw Tunnel (Future Path)
      ctx.beginPath();
      ctx.lineWidth = 60; // Tunnel width
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#334155'; // Gym-700 (Tunnel Walls)

      const pointsToDraw = 60; 
      const spacing = 8;
      
      // Draw path center line
      const pathPoints: {x:number, y:number}[] = [];

      for (let i = 0; i < pointsToDraw; i++) {
          // Look ahead based on scroll speed simulation
          // 1 pixel scroll ~= X ms? simple factor:
          const futureTime = now + (i * 80); 
          const idealP = getIdealProgress(futureTime);
          
          const y = (height * 0.15) + (idealP * (height * 0.7)); // 15% padding
          const x = (width * 0.15) + (i * spacing); 
          
          pathPoints.push({x, y});
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
      }
      ctx.stroke();
      
      // Inner "Perfect Line"
      ctx.beginPath();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#3b82f6'; // Gym-Accent
      ctx.setLineDash([5, 5]);
      pathPoints.forEach((p, i) => {
          if (i===0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Draw Player
      const targetY = pathPoints[0].y;
      const playerY = (height * 0.15) + (progress * (height * 0.7));
      const playerX = width * 0.15;
      
      // Error calc
      const diff = Math.abs(playerY - targetY);
      let playerColor = '#4ade80'; // Green
      let glowColor = 'rgba(74, 222, 128, 0.5)';
      
      if (diff > 50) { playerColor = '#ef4444'; glowColor = 'rgba(239, 68, 68, 0.5)'; } // Red
      else if (diff > 25) { playerColor = '#facc15'; glowColor = 'rgba(250, 204, 21, 0.5)'; } // Yellow

      // Ghost (Target)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.arc(playerX, targetY, 20, 0, Math.PI * 2);
      ctx.fill();

      // Real Player
      ctx.fillStyle = playerColor;
      ctx.shadowBlur = 20;
      ctx.shadowColor = glowColor;
      ctx.beginPath();
      ctx.arc(playerX, playerY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Connector line if far off
      if (diff > 15) {
          ctx.beginPath();
          ctx.moveTo(playerX, playerY);
          ctx.lineTo(playerX, targetY);
          ctx.strokeStyle = playerColor;
          ctx.lineWidth = 2;
          ctx.stroke();
      }

      // Labels
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.fillText("TOP", 5, 20);
      ctx.fillText("BOTTOM", 5, height - 10);

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [progress, isPaused, pacerConfig]);

  return (
    <div className="relative w-full h-64 rounded-xl overflow-hidden border border-gym-600 shadow-inner bg-gym-900">
       <canvas ref={canvasRef} width={350} height={256} className="w-full h-full" />
       
       <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
           <div className="text-[10px] font-bold text-white bg-black/50 px-2 py-1 rounded border border-white/10">
               STAY ON THE LINE
           </div>
       </div>
    </div>
  );
};

export default GamePacer;
