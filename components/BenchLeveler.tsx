
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, ArrowUp, ArrowDown, Smartphone, X } from 'lucide-react';

interface Props {
  targetAngle: number;
  onClose: () => void;
}

const BenchLeveler: React.FC<Props> = ({ targetAngle, onClose }) => {
  const [currentAngle, setCurrentAngle] = useState<number | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermission = async () => {
    // iOS 13+ requires specific permission for DeviceOrientation
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          setPermissionGranted(true);
        } else {
          setError('Permission denied. Please allow motion sensors in settings.');
        }
      } catch (e) {
        setError('Error requesting sensor permission.');
      }
    } else {
      // Non-iOS or older devices usually allow by default
      setPermissionGranted(true);
    }
  };

  useEffect(() => {
    if (!permissionGranted) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      // Beta represents front-to-back tilt (-180 to 180)
      // When phone is lying flat (screen up), beta is 0.
      // When lying on an incline bench (screen up), beta reflects the incline.
      if (event.beta !== null) {
        setCurrentAngle(Math.round(event.beta));
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [permissionGranted]);

  const getFeedback = () => {
    if (currentAngle === null) return { status: 'waiting', message: 'Waiting for sensor data...' };
    
    const diff = currentAngle - targetAngle;
    
    // Tolerance: +/- 5 degrees
    if (Math.abs(diff) <= 5) {
      return { status: 'perfect', message: 'PERFECT', color: 'text-green-500', icon: <CheckCircle size={48} /> };
    }
    
    if (diff < -5) {
      // Current is less than target (e.g., 20 vs 30) -> Need to raise
      return { status: 'low', message: 'RAISE BENCH', color: 'text-orange-500', icon: <ArrowUp size={48} className="animate-bounce" /> };
    }
    
    if (diff > 5) {
      // Current is more than target (e.g., 50 vs 30) -> Need to lower
      return { status: 'high', message: 'LOWER BENCH', color: 'text-orange-500', icon: <ArrowDown size={48} className="animate-bounce" /> };
    }

    return { status: 'unknown', message: 'Adjusting...' };
  };

  const feedback = getFeedback();

  return (
    <div className="fixed inset-0 z-[60] bg-gym-900 flex flex-col items-center justify-center p-6 animate-in zoom-in-95">
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-2 bg-gym-800 rounded-full text-gray-400 hover:text-white"
      >
        <X size={24} />
      </button>

      <div className="text-center mb-8">
         <h2 className="text-2xl font-bold text-white mb-2">Bench Calibration</h2>
         <p className="text-gray-400 text-sm">Target Angle: <span className="text-gym-accent font-bold text-lg">{targetAngle}°</span></p>
      </div>

      {!permissionGranted ? (
        <div className="text-center max-w-xs">
          <Smartphone size={64} className="mx-auto text-gray-500 mb-6" />
          <p className="text-gray-300 mb-6">We need access to your phone's gyroscope to measure the bench angle.</p>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <button 
            onClick={requestPermission}
            className="w-full py-3 bg-gym-accent text-white font-bold rounded-xl shadow-lg"
          >
            Start Measurement
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center w-full">
           
           {/* Visual Bubble Level */}
           <div className="relative w-64 h-64 bg-gym-800 rounded-full border-4 border-gym-700 flex items-center justify-center mb-8 shadow-inner overflow-hidden">
               {/* Center Target Line */}
               <div className="absolute w-full h-1 bg-gym-700/50"></div>
               
               {/* Moving Bubble */}
               <div 
                  className={`absolute w-full h-1 transition-all duration-300 ${feedback.status === 'perfect' ? 'bg-green-500 shadow-[0_0_15px_#22c55e]' : 'bg-orange-500'}`}
                  style={{ 
                      transform: `translateY(${Math.max(-120, Math.min(120, (currentAngle || 0) - targetAngle)) * -2}px) rotate(${(currentAngle || 0) - targetAngle}deg)` 
                  }}
               ></div>
               
               <div className="z-10 text-center bg-gym-900/80 p-4 rounded-xl backdrop-blur-sm">
                   <span className="text-5xl font-black font-mono text-white block">
                       {currentAngle !== null ? Math.round(currentAngle) : '--'}°
                   </span>
                   <span className="text-[10px] text-gray-500 uppercase font-bold">Current Angle</span>
               </div>
           </div>

           <div className={`text-center mb-8 ${feedback.color || 'text-white'}`}>
               <div className="flex justify-center mb-2">{feedback.icon}</div>
               <h3 className="text-3xl font-black uppercase tracking-wider">{feedback.message}</h3>
           </div>
           
           <div className="bg-gym-800 p-4 rounded-xl border border-gym-700 text-sm text-gray-400 text-center max-w-sm">
              <p className="flex items-center justify-center gap-2 mb-2 font-bold text-white">
                  <Smartphone size={16} /> Instructions
              </p>
              Place your phone flat on the bench backrest.
              <br/>Screen facing up. Camera at the top.
           </div>

           {feedback.status === 'perfect' && (
               <button 
                 onClick={onClose}
                 className="mt-8 px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-full animate-in slide-in-from-bottom-4 shadow-lg shadow-green-900/50"
               >
                 Lock In Angle
               </button>
           )}
        </div>
      )}
    </div>
  );
};

export default BenchLeveler;
