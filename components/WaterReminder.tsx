
import React from 'react';
import { Droplets, X, CheckCircle } from 'lucide-react';

interface Props {
  amount: number; // in ml
  reason: string;
  onLog: () => void;
  onSkip: () => void;
}

const WaterReminder: React.FC<Props> = ({ amount, reason, onLog, onSkip }) => {
  const getLabel = () => {
      if (amount <= 50) return { title: "Take a Sip", icon: "💧" };
      if (amount <= 150) return { title: "Take a Gulp", icon: "💧💧" };
      return { title: "Drink a Glass", icon: "🥤" };
  };

  const { title, icon } = getLabel();

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center pointer-events-none p-4">
      <div className="bg-blue-900/95 backdrop-blur-md border border-blue-500/30 rounded-2xl p-5 shadow-2xl w-full max-w-sm pointer-events-auto animate-in slide-in-from-bottom-5">
         
         <div className="flex justify-between items-start mb-4">
             <div className="flex items-center gap-3">
                 <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center text-2xl border border-blue-400/30 animate-pulse">
                     {icon}
                 </div>
                 <div>
                     <h3 className="text-white font-bold text-lg leading-none mb-1">{title}</h3>
                     <p className="text-blue-200 text-xs">{reason}</p>
                 </div>
             </div>
             <button onClick={onSkip} className="text-blue-300 hover:text-white">
                 <X size={20} />
             </button>
         </div>

         <div className="bg-blue-950/50 rounded-lg p-3 mb-4 flex justify-between items-center border border-blue-800">
             <span className="text-xs text-blue-300 font-bold uppercase tracking-wider">Calculated Loss</span>
             <span className="text-xl font-black text-white">~{amount}ml</span>
         </div>

         <div className="flex gap-3">
             <button 
                onClick={onSkip}
                className="flex-1 py-3 bg-blue-900 border border-blue-700 text-blue-300 font-bold rounded-xl text-xs hover:bg-blue-800"
             >
                Skip
             </button>
             <button 
                onClick={onLog}
                className="flex-[2] py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2"
             >
                <Droplets size={16} fill="currentColor" /> Drink & Log
             </button>
         </div>
      </div>
    </div>
  );
};

export default WaterReminder;
