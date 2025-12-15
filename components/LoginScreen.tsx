
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { getUsers, createUser, switchUser, deleteUser } from '../services/storageService';
import { UserCircle2, PlusCircle, Trash2, ArrowRight, Dumbbell } from 'lucide-react';

interface Props {
  onLogin: () => void;
}

const LoginScreen: React.FC<Props> = ({ onLogin }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [newUserName, setNewUserName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    setUsers(getUsers());
  }, []);

  const handleCreate = () => {
    if (!newUserName.trim()) return;
    const user = createUser(newUserName.trim());
    switchUser(user.id);
    onLogin();
  };

  const handleSelect = (userId: string) => {
    switchUser(userId);
    onLogin();
  };

  const handleDelete = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure? This will delete all data for this user permanently.")) {
      deleteUser(userId);
      setUsers(getUsers());
    }
  };

  return (
    <div className="min-h-screen bg-gym-900 flex flex-col items-center justify-center p-6 animate-in fade-in">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black italic tracking-tighter text-white mb-2">
          IRON<span className="text-gym-accent">GUIDE</span>
        </h1>
        <p className="text-gray-500 font-mono text-sm tracking-[0.3em] uppercase">Who is lifting today?</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {users.map(user => (
          <div 
            key={user.id}
            onClick={() => handleSelect(user.id)}
            className="group relative bg-gym-800 border border-gym-700 hover:border-gym-accent rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all hover:bg-gym-700 active:scale-95"
          >
            <div className="bg-gym-900 p-3 rounded-full text-gym-accent">
              <UserCircle2 size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-lg">{user.name}</h3>
              <p className="text-gray-500 text-xs">Last active: Recently</p>
            </div>
            <button 
              onClick={(e) => handleDelete(e, user.id)}
              className="p-2 text-gray-600 hover:text-red-500 transition-colors z-10"
            >
              <Trash2 size={18} />
            </button>
            <div className="absolute right-4 text-gray-600 group-hover:text-white transition-colors">
               <ArrowRight size={20} />
            </div>
          </div>
        ))}

        {!isCreating ? (
          <button 
            onClick={() => setIsCreating(true)}
            className="w-full py-4 border-2 border-dashed border-gym-700 rounded-xl text-gray-400 font-bold hover:text-white hover:border-gym-500 hover:bg-gym-800/50 flex items-center justify-center gap-2 transition-all"
          >
            <PlusCircle size={20} /> Add Profile
          </button>
        ) : (
          <div className="bg-gym-800 border border-gym-700 rounded-xl p-4 animate-in slide-in-from-bottom-2">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <Dumbbell size={16} className="text-gym-accent"/> New Athlete
            </h3>
            <input 
              type="text" 
              placeholder="Enter name..." 
              autoFocus
              className="w-full bg-gym-900 border border-gym-600 rounded-lg p-3 text-white mb-3 focus:outline-none focus:border-gym-accent"
              value={newUserName}
              onChange={e => setNewUserName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <div className="flex gap-2">
              <button 
                onClick={() => setIsCreating(false)} 
                className="flex-1 py-2 bg-gym-700 text-gray-300 rounded-lg font-bold hover:bg-gym-600"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreate} 
                className="flex-1 py-2 bg-gym-accent text-white rounded-lg font-bold hover:bg-blue-600"
              >
                Create
              </button>
            </div>
          </div>
        )}
      </div>
      
      <p className="mt-10 text-gray-600 text-xs text-center max-w-xs">
        Data is stored locally on this device. Create separate profiles for multiple users sharing this phone.
      </p>
    </div>
  );
};

export default LoginScreen;
