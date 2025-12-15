
import React, { useState, useRef } from 'react';
import { ReceiptData } from '../services/storageService';
import { Share2, RotateCcw, Camera, Image as ImageIcon, X } from 'lucide-react';

interface Props {
  data: ReceiptData;
  onClose: () => void;
}

const WorkoutReceipt: React.FC<Props> = ({ data, onClose }) => {
  const [bgImage, setBgImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'IronGuide Workout Receipt',
          text: `Just crushed a workout on IronGuide.\nVolume: ${data.totalVolume}kg\nDuration: ${data.duration}`,
        });
      } catch (err) {
        console.log('Error sharing', err);
      }
    } else {
      alert("Screenshot this receipt to share!");
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
              if (e.target?.result) {
                  setBgImage(e.target.result as string);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const triggerCamera = () => {
      if (fileInputRef.current) {
          fileInputRef.current.click();
      }
  };

  return (
    <div className="min-h-screen bg-gym-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
       
       <input 
         type="file" 
         ref={fileInputRef} 
         className="hidden" 
         accept="image/*" 
         capture="environment" // prefers back camera on mobile
         onChange={handleImageUpload}
       />

       {/* RECEIPT CONTAINER */}
       <div 
         className={`w-full max-w-sm relative animate-in slide-in-from-bottom-10 duration-700 overflow-hidden shadow-2xl transition-all
            ${bgImage ? 'aspect-[9/16] rounded-xl border-4 border-white' : 'bg-white text-black font-mono transform rotate-1 hover:rotate-0'}
         `}
         style={bgImage ? {
             backgroundImage: `url(${bgImage})`,
             backgroundSize: 'cover',
             backgroundPosition: 'center'
         } : {}}
       >
          {/* PHOTO MODE OVERLAY */}
          {bgImage && (
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent p-6 flex flex-col justify-end">
                  
                  <div className="mb-auto pt-4 flex justify-end">
                      <button onClick={() => setBgImage(null)} className="p-2 bg-black/50 text-white rounded-full"><X size={20}/></button>
                  </div>

                  <div className="text-white drop-shadow-md">
                      <h1 className="text-5xl font-black italic tracking-tighter mb-2">IRON GUIDE</h1>
                      <div className="flex justify-between items-end border-b-2 border-white/50 pb-4 mb-4">
                          <p className="font-bold text-sm tracking-widest">{data.date}</p>
                          <p className="font-bold text-3xl">{data.duration}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                           <div>
                               <p className="text-[10px] uppercase font-bold text-white/70">Volume</p>
                               <p className="text-2xl font-black">{data.totalVolume.toLocaleString()}kg</p>
                           </div>
                           <div>
                               <p className="text-[10px] uppercase font-bold text-white/70">Exercises</p>
                               <p className="text-2xl font-black">{data.exercises.length}</p>
                           </div>
                      </div>

                      <div className="space-y-1 mb-6">
                          {data.exercises.slice(0, 5).map((ex, i) => (
                              <div key={i} className="flex justify-between text-xs font-bold border-b border-white/20 pb-1">
                                  <span className="truncate w-40">{ex.name}</span>
                                  <span>{ex.isPR && '🏆 '}{ex.bestWeight}{ex.isCardio ? 'km' : 'kg'}</span>
                              </div>
                          ))}
                          {data.exercises.length > 5 && <p className="text-[10px] text-white/50 italic">...and {data.exercises.length - 5} more</p>}
                      </div>

                      <p className="text-center font-black italic uppercase text-sm opacity-90">"{data.quote}"</p>
                  </div>
              </div>
          )}
          
          {/* PAPER MODE (Default) */}
          {!bgImage && (
              <>
                {/* RIPPED TOP EDGE EFFECT */}
                <div className="absolute -top-3 left-0 right-0 h-4 bg-white" style={{ clipPath: 'polygon(0% 100%, 5% 0%, 10% 100%, 15% 0%, 20% 100%, 25% 0%, 30% 100%, 35% 0%, 40% 100%, 45% 0%, 50% 100%, 55% 0%, 60% 100%, 65% 0%, 70% 100%, 75% 0%, 80% 100%, 85% 0%, 90% 100%, 95% 0%, 100% 100%)' }}></div>

                <div className="p-6 pt-8">
                    {/* HEADER */}
                    <div className="text-center border-b-2 border-dashed border-black pb-4 mb-4">
                        <h1 className="text-4xl font-black italic tracking-tighter mb-1">IRON GUIDE</h1>
                        <p className="text-xs font-bold tracking-[0.2em]">OFFICIAL TRAINING LOG</p>
                        <p className="text-[10px] mt-1">LOCATION: THE IRON TEMPLE</p>
                    </div>

                    {/* META DATA */}
                    <div className="text-xs space-y-1 mb-4 border-b-2 border-dashed border-black pb-4">
                        <div className="flex justify-between">
                            <span>DATE:</span>
                            <span className="font-bold">{data.date}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>TIME:</span>
                            <span className="font-bold">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>DURATION:</span>
                            <span className="font-bold">{data.duration}</span>
                        </div>
                    </div>

                    {/* EXERCISE LIST */}
                    <div className="mb-4">
                        <div className="flex justify-between text-[10px] font-bold border-b border-black mb-2 pb-1">
                            <span>ITEM</span>
                            <span>BEST</span>
                        </div>
                        <div className="space-y-2">
                            {data.exercises.map((ex, i) => (
                                <div key={i} className="flex justify-between items-baseline text-xs group">
                                    <div className="flex-1">
                                        <span className="font-bold uppercase block truncate w-40">{ex.name}</span>
                                        <span className="text-[10px] text-gray-500">{ex.sets} SETS</span>
                                    </div>
                                    <div className="text-right">
                                        {ex.isPR && (
                                            <span className="mr-2 px-1 bg-black text-white text-[9px] font-bold">PR</span>
                                        )}
                                        <span className="font-mono text-sm">{ex.bestWeight}{ex.isCardio ? 'km' : 'kg'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* TOTALS */}
                    <div className="border-t-2 border-dashed border-black pt-2 mb-6">
                        <div className="flex justify-between items-end">
                            <span className="text-sm font-bold">TOTAL VOLUME</span>
                            <span className="text-3xl font-black tracking-tighter">{data.totalVolume.toLocaleString()}</span>
                        </div>
                        <div className="text-right text-[10px] font-bold">KILOGRAMS LIFTED</div>
                    </div>

                    {/* FOOTER */}
                    <div className="text-center space-y-4">
                        <div className="border-2 border-black p-2 transform -rotate-1">
                            <p className="text-sm font-black italic uppercase">"{data.quote}"</p>
                        </div>
                        
                        <div className="flex justify-center py-2 opacity-80">
                            {/* CSS Barcode Simulation */}
                            <div className="flex h-12 w-48 items-stretch justify-center gap-[2px]">
                                {[...Array(40)].map((_, i) => (
                                    <div key={i} className={`bg-black ${Math.random() > 0.5 ? 'w-[2px]' : 'w-[4px]'}`}></div>
                                ))}
                            </div>
                        </div>
                        
                        <p className="text-[10px] font-bold">THANK YOU FOR YOUR HARD WORK</p>
                        <p className="text-[8px]">NO RETURNS ON GAINS. ALL SALES FINAL.</p>
                    </div>
                </div>

                {/* RIPPED BOTTOM EDGE */}
                <div className="absolute -bottom-3 left-0 right-0 h-4 bg-white transform rotate-180" style={{ clipPath: 'polygon(0% 100%, 5% 0%, 10% 100%, 15% 0%, 20% 100%, 25% 0%, 30% 100%, 35% 0%, 40% 100%, 45% 0%, 50% 100%, 55% 0%, 60% 100%, 65% 0%, 70% 100%, 75% 0%, 80% 100%, 85% 0%, 90% 100%, 95% 0%, 100% 100%)' }}></div>
              </>
          )}
       </div>

       {/* ACTIONS */}
       <div className="mt-8 flex gap-4 animate-in fade-in delay-500 z-10">
           {!bgImage && (
               <button 
                 onClick={triggerCamera}
                 className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-full shadow-lg hover:bg-blue-500 transition-colors"
               >
                   <Camera size={20} /> Photo Mode
               </button>
           )}
           <button 
             onClick={handleShare}
             className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-full shadow-lg hover:bg-gray-200 transition-colors"
           >
               <Share2 size={20} /> Share
           </button>
           <button 
             onClick={onClose}
             className="flex items-center gap-2 px-6 py-3 bg-gym-800 text-white font-bold rounded-full border border-gym-700 hover:bg-gym-700 transition-colors"
           >
               <RotateCcw size={20} /> Done
           </button>
       </div>

    </div>
  );
};

export default WorkoutReceipt;
