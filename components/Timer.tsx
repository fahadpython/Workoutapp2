import React, { useState, useEffect } from 'react';
import { Play, Pause, X } from 'lucide-react';
import { ActiveTimer } from '../types';

interface TimerProps {
  activeTimer: ActiveTimer;
  onCancel: () => void;
  onComplete: () => void;
}

const Timer: React.FC<TimerProps> = ({ activeTimer, onCancel, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Calculate remaining time based on current time vs stored end time
  const calculateTimeLeft = () => {
    const now = Date.now();
    const remaining = Math.ceil((activeTimer.endTime - now) / 1000);
    return remaining > 0 ? remaining : 0;
  };

  useEffect(() => {
    // Initial check
    const remaining = calculateTimeLeft();
    setTimeLeft(remaining);

    if (remaining <= 0) {
      onComplete();
      return;
    }

    const interval = setInterval(() => {
      const currentRemaining = calculateTimeLeft();
      setTimeLeft(currentRemaining);
      
      if (currentRemaining <= 0) {
        clearInterval(interval);
        onComplete();
      }
    }, 200); // Check more frequently than 1s for smoother UI updates if needed, though 1s is fine

    return () => clearInterval(interval);
  }, [activeTimer.endTime, onComplete]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progress = Math.min(100, Math.max(0, (timeLeft / activeTimer.duration) * 100));

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-gym-800 border border-gym-700 rounded-xl shadow-2xl p-4 z-50 flex items-center justify-between animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-4">
        <div className="relative w-12 h-12 flex items-center justify-center">
          {/* Circular Progress Background */}
          <svg className="absolute w-full h-full transform -rotate-90">
            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gym-700" />
            <circle 
              cx="24" cy="24" r="20" 
              stroke="currentColor" strokeWidth="4" 
              fill="transparent" 
              strokeDasharray={125.6} 
              strokeDashoffset={125.6 - (125.6 * progress) / 100}
              className="text-gym-accent transition-all duration-1000 ease-linear"
            />
          </svg>
          <span className="text-xs font-bold font-mono text-white">{formatTime(timeLeft)}</span>
        </div>
        
        <div>
          <p className="text-xs text-gray-400 uppercase font-bold">Resting</p>
          <p className="text-sm font-medium text-white">Next Set Coming Up</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={onCancel}
          className="p-2 rounded-full bg-gym-700/50 text-gray-400 hover:text-white hover:bg-gym-700"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default Timer;
