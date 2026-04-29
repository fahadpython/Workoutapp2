
import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Utensils, Flame, Plus, Minus, Search, Layers, CheckCircle, Camera, Loader2, Image as ImageIcon, Sparkles } from 'lucide-react';
import { INDIAN_FOOD_DB, PORTION_MULTIPLIERS, FoodItemDef } from '../constants';
import { analyzeFoodQuery, analyzeFoodImage, ParsedFood } from '../services/aiService';

interface Props {
  onLog: (calories: number, name: string, protein?: number, carbs?: number, fat?: number) => void;
  onClose: () => void;
}

const NutritionLogger: React.FC<Props> = ({ onLog, onClose }) => {
  const [activeTab, setActiveTab] = useState<string>('AI Smart Log');
  const [selectedItem, setSelectedItem] = useState<FoodItemDef | null>(null);
  const [size, setSize] = useState<'SMALL' | 'MEDIUM' | 'LARGE'>('MEDIUM');
  const [quantity, setQuantity] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState('');
  
  // AI State
  const [aiQuery, setAiQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<ParsedFood | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset modifiers when item changes
  const selectFood = (item: FoodItemDef) => {
      setSelectedItem(item);
      setSize('MEDIUM');
      setQuantity(1);
  };

  // Calculations
  const multiplier = PORTION_MULTIPLIERS[size];
  const totalCalories = selectedItem ? Math.round(selectedItem.baseCals * multiplier * quantity) : 0;
  const totalProtein = selectedItem ? Math.round(selectedItem.baseProtein * multiplier * quantity) : 0;

  const handleAddManual = () => {
      if (!selectedItem) return;
      
      const sizeLabel = size === 'MEDIUM' ? '' : `(${size.charAt(0).toUpperCase() + size.slice(1).toLowerCase()})`;
      const fullName = `${selectedItem.name} ${sizeLabel} x${quantity} [${totalProtein}g Prot]`;
      
      onLog(totalCalories, fullName, totalProtein);
  };

  const handleAddAi = () => {
       if (!aiResult) return;
       const fullName = `${aiResult.name} (${aiResult.portionSize}) [${aiResult.protein || 0}g Prot${aiResult.creatine ? `, ${aiResult.creatine}mg Crea` : ''}]`;
       onLog(aiResult.calories, fullName, aiResult.protein, aiResult.carbs, aiResult.fat);
  };

  const handleAiTextSearch = async () => {
       if (!aiQuery.trim()) return;
       setIsAiLoading(true);
       setAiError(null);
       setAiResult(null);
       try {
           const result = await analyzeFoodQuery(aiQuery);
           setAiResult(result);
       } catch (e: any) {
           setAiError(e.message || "Failed to analyze food.");
       } finally {
           setIsAiLoading(false);
       }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsAiLoading(true);
      setAiError(null);
      setAiResult(null);

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const base64 = event.target?.result as string;
              const result = await analyzeFoodImage(base64);
              setAiResult(result);
          } catch (e: any) {
              setAiError(e.message || "Failed to analyze image.");
          } finally {
              setIsAiLoading(false);
          }
      };
      reader.onerror = () => {
          setAiError("Failed to read file.");
          setIsAiLoading(false);
      };
      reader.readAsDataURL(file);
  };

  // Filter Logic
  const filteredItems = useMemo(() => {
      if (searchTerm) {
          // Search across all categories
          const allItems = Object.values(INDIAN_FOOD_DB).flat();
          return allItems.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      return INDIAN_FOOD_DB[activeTab] || [];
  }, [activeTab, searchTerm]);

  return (
    <motion.div 
       initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
       className="fixed inset-0 z-[80] grid-bg bg-gym-900/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
    >
        <motion.div 
            initial={{ y: 50, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 50, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-black w-full max-w-md brutal-border brutal-shadow flex flex-col max-h-[85vh] overflow-hidden"
        >
            
            {/* HEADER */}
            <div className="p-4 brutal-border border-b-2 flex justify-between items-center bg-gym-accent text-black z-10">
                <h3 className="text-3xl font-display uppercase tracking-wider flex items-center gap-2">
                    <Utensils className="text-black" /> Log Meal
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-black hover:text-gym-accent transition-colors">
                    <X size={28} />
                </button>
            </div>

            {/* CATEGORY TABS */}
            <div className="flex overflow-x-auto no-scrollbar gap-2 p-4 pb-4 brutal-border border-b-2 bg-gym-800">
                <button
                    onClick={() => { setActiveTab('AI Smart Log'); setSearchTerm(''); }}
                    className={`px-4 py-2 flex items-center gap-2 text-sm font-mono font-bold uppercase whitespace-nowrap brutal-border transition-colors ${
                        activeTab === 'AI Smart Log' 
                        ? 'bg-purple-500 text-black shadow-[4px_4px_0_#000]' 
                        : 'bg-black text-purple-400 hover:bg-purple-900'
                    }`}
                >
                    <Sparkles size={16} /> Smart Log
                </button>
                {Object.keys(INDIAN_FOOD_DB).map(cat => (
                    <button
                        key={cat}
                        onClick={() => { setActiveTab(cat); setSearchTerm(''); }}
                        className={`px-4 py-2 text-sm font-mono font-bold uppercase whitespace-nowrap brutal-border transition-colors ${
                            activeTab === cat 
                            ? 'bg-white text-black shadow-[4px_4px_0_#000]' 
                            : 'bg-black text-gray-400 hover:text-white'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {activeTab === 'AI Smart Log' ? (
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 bg-black">
                    <div className="bg-gym-800 brutal-border p-6 text-sm text-gray-300 relative">
                        <div className="absolute top-0 right-0 p-2 bg-purple-500 brutal-border brutal-shadow m-2"><Sparkles size={16} className="text-black" /></div>
                        <p className="mb-4 font-display text-2xl text-white uppercase tracking-wider">AI Recognition</p>
                        <p className="text-xs font-mono text-gray-400 mb-6 uppercase leading-relaxed">Describe what you ate or snap a photo. We extract calories and macros instantly.</p>
                        
                        <div className="flex gap-2">
                           <input 
                              type="text" 
                              placeholder='e.g., "3 eggs and toast"' 
                              value={aiQuery}
                              onChange={(e) => setAiQuery(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAiTextSearch()}
                              disabled={isAiLoading}
                              className="flex-1 bg-black brutal-border px-4 py-3 text-white font-mono text-sm outline-none focus:border-purple-500"
                           />
                           <button 
                               onClick={handleAiTextSearch}
                               disabled={isAiLoading || !aiQuery.trim()}
                               className="bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-black p-3 brutal-border brutal-shadow transition-all"
                           >
                               <Search size={20} />
                           </button>
                        </div>
                        
                        <div className="flex items-center gap-4 my-6">
                           <div className="flex-1 h-0.5 bg-gym-700"></div>
                           <span className="text-[12px] text-gray-500 font-display uppercase tracking-widest">OR</span>
                           <div className="flex-1 h-0.5 bg-gym-700"></div>
                        </div>
                        
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isAiLoading}
                            className="w-full py-4 bg-gym-900 border-2 border-dashed border-gym-600 hover:border-purple-500 text-purple-400 font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-colors disabled:opacity-50"
                        >
                            <Camera size={24} /> Snap a Photo
                        </button>
                        <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                    </div>

                    {isAiLoading && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-10 text-purple-400">
                            <Loader2 size={48} className="animate-spin mb-4" />
                            <p className="font-mono font-bold text-sm uppercase tracking-widest animate-pulse">Analyzing Meal</p>
                        </motion.div>
                    )}

                    {aiError && (
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-gym-warning border-4 border-black p-4 text-black font-mono font-bold text-xs uppercase brutal-shadow">
                            ERROR: {aiError}
                        </motion.div>
                    )}

                    {aiResult && !isAiLoading && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gym-800 brutal-border brutal-shadow p-6">
                            <h4 className="font-display text-3xl text-white mb-2 uppercase">{aiResult.name}</h4>
                            <p className="text-xs font-mono font-bold text-gym-accent mb-6 flex items-center gap-2 uppercase"><ImageIcon size={14}/> {aiResult.portionSize}</p>
                            
                            <div className="grid grid-cols-4 gap-2 mb-6">
                                <div className="bg-black p-3 brutal-border text-center">
                                    <p className="text-[10px] text-gray-500 font-mono uppercase font-bold mb-1">Cals</p>
                                    <p className="font-display text-gym-warning text-xl">{aiResult.calories}</p>
                                </div>
                                <div className="bg-black p-3 brutal-border text-center">
                                    <p className="text-[10px] text-gray-500 font-mono uppercase font-bold mb-1">Pro</p>
                                    <p className="font-display text-white text-xl">{aiResult.protein || 0}g</p>
                                </div>
                                <div className="bg-black p-3 brutal-border text-center">
                                    <p className="text-[10px] text-gray-500 font-mono uppercase font-bold mb-1">Carb</p>
                                    <p className="font-display text-white text-xl">{aiResult.carbs || 0}g</p>
                                </div>
                                <div className="bg-black p-3 brutal-border text-center">
                                    <p className="text-[10px] text-gray-500 font-mono uppercase font-bold mb-1">Fat</p>
                                    <p className="font-display text-white text-xl">{aiResult.fat || 0}g</p>
                                </div>
                            </div>

                            {aiResult.creatine ? (
                                <div className="mb-6 bg-black brutal-border p-3 flex justify-between items-center text-gray-300 font-mono text-xs uppercase font-bold">
                                    <span>🏋️ Creatine</span>
                                    <span className="text-gym-accent text-lg">{aiResult.creatine} mg</span>
                                </div>
                            ) : null}

                            <button 
                                onClick={handleAddAi}
                                className="w-full bg-gym-success hover:bg-green-400 text-black py-4 font-display text-xl uppercase tracking-widest flex items-center justify-center gap-3 brutal-border brutal-shadow transition-colors"
                            >
                                <CheckCircle size={24} /> Confirm & Log
                            </button>
                        </motion.div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col flex-1 overflow-hidden bg-black">
                    {/* MANUAL DATABASE SEARCH BAR */}
                    <div className="p-4 bg-gym-800 brutal-border-b-2">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                            <input 
                                type="text" 
                                placeholder="SEARCH..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-black brutal-border pl-12 pr-4 py-4 font-mono text-white focus:border-gym-accent outline-none uppercase font-bold placeholder-gray-600"
                            />
                        </div>
                    </div>

                    {/* FOOD GRID */}
                    <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3 content-start">
                        {filteredItems.map((item) => (
                            <button
                                key={item.name}
                                onClick={() => selectFood(item)}
                                className={`p-4 brutal-border text-left transition-colors relative group ${
                                    selectedItem?.name === item.name 
                                    ? 'bg-gym-accent text-black brutal-shadow' 
                                    : 'bg-gym-800 text-gray-400 hover:text-white hover:border-white'
                                }`}
                            >
                                <p className={`font-display text-xl uppercase leading-tight mb-2 ${selectedItem?.name === item.name ? 'text-black' : 'text-white'}`}>
                                    {item.name}
                                </p>
                                <div className="flex justify-between items-center text-[10px] font-mono font-bold uppercase mt-4">
                                    <span className={selectedItem?.name === item.name ? 'text-black/60' : 'text-gray-500'}>{item.unit}</span>
                                    <span className={`bg-black px-2 py-1 ${selectedItem?.name === item.name ? 'text-gym-accent' : 'text-white'}`}>{item.baseCals} cal</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* CONTROLS (Only if manual item selected) */}
                    <AnimatePresence>
                    {selectedItem && (
                        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="p-4 bg-gym-800 brutal-border border-t-2">
                            
                            {/* SIZE SELECTOR */}
                            <div className="flex gap-2 mb-4">
                                <button 
                                    onClick={() => setSize('SMALL')}
                                    className={`flex-1 py-3 text-xs font-mono font-bold uppercase brutal-border transition-colors ${size === 'SMALL' ? 'bg-white text-black brutal-shadow' : 'bg-black text-gray-500'}`}
                                >
                                    Small
                                </button>
                                <button 
                                    onClick={() => setSize('MEDIUM')}
                                    className={`flex-1 py-3 text-xs font-mono font-bold uppercase brutal-border transition-colors ${size === 'MEDIUM' ? 'bg-gym-accent text-black brutal-shadow' : 'bg-black text-gray-500'}`}
                                >
                                    Medium
                                </button>
                                <button 
                                    onClick={() => setSize('LARGE')}
                                    className={`flex-1 py-3 text-xs font-mono font-bold uppercase brutal-border transition-colors ${size === 'LARGE' ? 'bg-white text-black brutal-shadow' : 'bg-black text-gray-500'}`}
                                >
                                    Large
                                </button>
                            </div>

                            {/* QUANTITY & ADD */}
                            <div className="flex gap-4 items-center">
                                {/* QTY COUNTER */}
                                <div className="flex items-center bg-black brutal-border h-16 w-32">
                                    <button 
                                        onClick={() => setQuantity(Math.max(0.5, quantity - 0.5))}
                                        className="w-10 h-full flex items-center justify-center text-gray-400 hover:text-white"
                                    >
                                        <Minus size={20} />
                                    </button>
                                    <span className="flex-1 text-center font-display text-2xl text-white">{quantity}</span>
                                    <button 
                                        onClick={() => setQuantity(quantity + 0.5)}
                                        className="w-10 h-full flex items-center justify-center text-gray-400 hover:text-white"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>

                                {/* ADD BUTTON */}
                                <button 
                                    onClick={handleAddManual}
                                    className="flex-1 bg-gym-success hover:bg-green-400 text-black h-16 brutal-border brutal-shadow flex flex-col items-center justify-center leading-tight transition-colors"
                                >
                                    <span className="font-display text-2xl uppercase tracking-widest flex items-center gap-2">
                                        <Plus size={20} /> Add
                                    </span>
                                    <span className="text-[10px] font-mono font-bold uppercase opacity-80 mt-1">
                                        {totalCalories} kcal | {totalProtein}g Pro
                                    </span>
                                </button>
                            </div>
                        </motion.div>
                    )}
                    </AnimatePresence>
                </div>
            )}
        </motion.div>
    </motion.div>
  );
};

export default NutritionLogger;
