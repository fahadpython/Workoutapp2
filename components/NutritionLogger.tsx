
import React, { useState, useMemo } from 'react';
import { X, Utensils, Flame, Plus, Minus, Search, Layers, CheckCircle } from 'lucide-react';
import { INDIAN_FOOD_DB, PORTION_MULTIPLIERS, FoodItemDef } from '../constants';

interface Props {
  onLog: (calories: number, name: string) => void;
  onClose: () => void;
}

const NutritionLogger: React.FC<Props> = ({ onLog, onClose }) => {
  const [activeTab, setActiveTab] = useState<string>(Object.keys(INDIAN_FOOD_DB)[0]);
  const [selectedItem, setSelectedItem] = useState<FoodItemDef | null>(null);
  const [size, setSize] = useState<'SMALL' | 'MEDIUM' | 'LARGE'>('MEDIUM');
  const [quantity, setQuantity] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleAdd = () => {
      if (!selectedItem) return;
      
      const sizeLabel = size === 'MEDIUM' ? '' : `(${size.charAt(0).toUpperCase() + size.slice(1).toLowerCase()})`;
      const fullName = `${selectedItem.name} ${sizeLabel} x${quantity} [${totalProtein}g Prot]`;
      
      onLog(totalCalories, fullName);
  };

  // Filter Logic
  const filteredItems = useMemo(() => {
      if (searchTerm) {
          // Search across all categories
          const allItems = Object.values(INDIAN_FOOD_DB).flat();
          return allItems.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      return INDIAN_FOOD_DB[activeTab];
  }, [activeTab, searchTerm]);

  return (
    <div className="fixed inset-0 z-[80] bg-gym-900/95 backdrop-blur flex flex-col items-center justify-center p-4 animate-in fade-in">
        <div className="bg-gym-800 w-full max-w-md rounded-2xl border border-gym-700 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            
            {/* HEADER */}
            <div className="p-4 border-b border-gym-700 flex justify-between items-center bg-gym-800 z-10">
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Utensils className="text-gym-accent" /> Log Meal
                </h3>
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                    <X size={24} />
                </button>
            </div>

            {/* SEARCH BAR (Optional Override) */}
            <div className="px-4 pt-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search food..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gym-900 border border-gym-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-gym-accent focus:outline-none"
                    />
                </div>
            </div>

            {/* CATEGORY TABS (Hidden if searching) */}
            {!searchTerm && (
                <div className="flex overflow-x-auto no-scrollbar gap-2 p-4 pb-2">
                    {Object.keys(INDIAN_FOOD_DB).map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveTab(cat)}
                            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                                activeTab === cat 
                                ? 'bg-gym-accent text-white border-gym-accent' 
                                : 'bg-gym-900 text-gray-400 border-gym-700'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            )}

            {/* FOOD GRID */}
            <div className="flex-1 overflow-y-auto p-4 pt-2 grid grid-cols-2 gap-3 content-start">
                {filteredItems.map((item) => (
                    <button
                        key={item.name}
                        onClick={() => selectFood(item)}
                        className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                            selectedItem?.name === item.name 
                            ? 'bg-gym-accent/20 border-gym-accent shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                            : 'bg-gym-900 border-gym-700 hover:bg-gym-800'
                        }`}
                    >
                        <p className={`font-bold text-sm mb-1 ${selectedItem?.name === item.name ? 'text-white' : 'text-gray-300'}`}>
                            {item.name}
                        </p>
                        <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono">
                            <span>{item.unit}</span>
                            <span>{item.baseCals} cal</span>
                        </div>
                        {selectedItem?.name === item.name && (
                            <div className="absolute top-2 right-2 text-gym-accent">
                                <CheckCircle size={16} fill="currentColor" className="text-white" />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* CONTROLS (Only if item selected) */}
            {selectedItem && (
                <div className="p-4 bg-gym-900 border-t border-gym-700 animate-in slide-in-from-bottom-10">
                    
                    {/* SIZE SELECTOR */}
                    <div className="flex bg-gym-800 rounded-xl p-1 mb-4 border border-gym-700">
                        <button 
                            onClick={() => setSize('SMALL')}
                            className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${size === 'SMALL' ? 'bg-gym-700 text-white shadow' : 'text-gray-500'}`}
                        >
                            Small <span className="block text-[9px] opacity-60">Diet (0.75x)</span>
                        </button>
                        <button 
                            onClick={() => setSize('MEDIUM')}
                            className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${size === 'MEDIUM' ? 'bg-gym-accent text-white shadow' : 'text-gray-500'}`}
                        >
                            Medium <span className="block text-[9px] opacity-60">Std (1.0x)</span>
                        </button>
                        <button 
                            onClick={() => setSize('LARGE')}
                            className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${size === 'LARGE' ? 'bg-gym-700 text-white shadow' : 'text-gray-500'}`}
                        >
                            Large <span className="block text-[9px] opacity-60">Heap (1.5x)</span>
                        </button>
                    </div>

                    {/* QUANTITY & ADD */}
                    <div className="flex gap-4 items-center">
                        {/* QTY COUNTER */}
                        <div className="flex items-center bg-gym-800 rounded-xl border border-gym-700 h-14">
                            <button 
                                onClick={() => setQuantity(Math.max(0.5, quantity - 0.5))}
                                className="w-12 h-full flex items-center justify-center text-gray-400 hover:text-white"
                            >
                                <Minus size={18} />
                            </button>
                            <span className="w-10 text-center font-bold text-white text-lg">{quantity}</span>
                            <button 
                                onClick={() => setQuantity(quantity + 0.5)}
                                className="w-12 h-full flex items-center justify-center text-gray-400 hover:text-white"
                            >
                                <Plus size={18} />
                            </button>
                        </div>

                        {/* ADD BUTTON */}
                        <button 
                            onClick={handleAdd}
                            className="flex-1 bg-gym-success hover:bg-green-600 text-white h-14 rounded-xl font-bold text-lg shadow-lg flex flex-col items-center justify-center leading-tight transition-all active:scale-95"
                        >
                            <span className="flex items-center gap-1">
                                <Plus size={16} /> Add Log
                            </span>
                            <span className="text-[10px] opacity-80 font-normal">
                                {totalCalories} kcal • {totalProtein}g Prot
                            </span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default NutritionLogger;
