
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { getUsers, createUser, switchUser, deleteUser } from '../services/storageService';
import { UserCircle2, PlusCircle, Trash2, ArrowRight, Dumbbell, Cloud, LogIn } from 'lucide-react';
import { supabase } from '../services/supabase';

interface Props {
  onLogin: () => void;
}

const LoginScreen: React.FC<Props> = ({ onLogin }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [newUserName, setNewUserName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [mode, setMode] = useState<'LOCAL' | 'CLOUD'>('LOCAL');

  // Cloud Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cloudError, setCloudError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setUsers(getUsers());
  }, []);

  const handleCreateLocal = () => {
    if (!newUserName.trim()) return;
    const user = createUser(newUserName.trim());
    switchUser(user.id);
    onLogin();
  };

  const handleSelectLocal = (userId: string) => {
    switchUser(userId);
    onLogin();
  };

  const handleDeleteLocal = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure? This will delete all data for this user permanently.")) {
      deleteUser(userId);
      setUsers(getUsers());
    }
  };

  const handleCloudSignIn = async () => {
      setCloudError('');
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
          setIsLoading(false);
          setCloudError(error.message);
      } else if (data.user) {
          // Check if local profile exists for this ID, otherwise create one
          let user = getUsers().find(u => u.id === data.user!.id);
          if (!user) {
             const usersDb = getUsers();
             user = { id: data.user.id, name: data.user.email?.split('@')[0] || 'Cloud Athlete', created: Date.now() };
             usersDb.push(user);
             localStorage.setItem('iron_guide_users_registry', JSON.stringify(usersDb));
          }
          switchUser(data.user.id);
          
          try {
             // Import dynamically to avoid circular dependency issues if any
             const { fetchFromSupabase, restoreFromSupabaseData } = await import('../services/storageService');
             const result = await fetchFromSupabase();
             if (result.success && result.data) {
                 restoreFromSupabaseData(result.data);
             }
          } catch (e) {
             console.error("Failed to auto-restore from cloud on login:", e);
          }
          
          setIsLoading(false);
          onLogin();
      }
  };

  const handleCloudSignUp = async () => {
      setCloudError('');
      setIsLoading(true);
      const { data, error } = await supabase.auth.signUp({ email, password });
      setIsLoading(false);

      if (error) {
          setCloudError(error.message);
      } else if (data.user) {
          alert('Sign up successful! Please sign in.');
      }
  };

  return (
    <div className="min-h-screen bg-gym-900 flex flex-col items-center justify-center p-6 animate-in fade-in">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black italic tracking-tighter text-white mb-2">
          IRON<span className="text-gym-accent">GUIDE</span>
        </h1>
        <p className="text-gray-500 font-mono text-sm tracking-[0.3em] uppercase">Who is lifting today?</p>
      </div>

      <div className="w-full max-w-sm mb-6 flex bg-gym-800 p-1 rounded-lg border border-gym-700">
          <button 
             onClick={() => setMode('LOCAL')}
             className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${mode === 'LOCAL' ? 'bg-gym-700 text-white' : 'text-gray-500'}`}
          >
              Local Profiles
          </button>
          <button 
             onClick={() => setMode('CLOUD')}
             className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-md transition-colors ${mode === 'CLOUD' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}
          >
              <Cloud size={16} /> Cloud Auth
          </button>
      </div>

      {mode === 'LOCAL' ? (
        <div className="w-full max-w-sm space-y-4">
            {users.map(user => (
            <div 
                key={user.id}
                onClick={() => handleSelectLocal(user.id)}
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
                onClick={(e) => handleDeleteLocal(e, user.id)}
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
                <PlusCircle size={20} /> Add Local Profile
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
                onKeyDown={e => e.key === 'Enter' && handleCreateLocal()}
                />
                <div className="flex gap-2">
                <button 
                    onClick={() => setIsCreating(false)} 
                    className="flex-1 py-2 bg-gym-700 text-gray-300 rounded-lg font-bold hover:bg-gym-600"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleCreateLocal} 
                    className="flex-1 py-2 bg-gym-accent text-white rounded-lg font-bold hover:bg-blue-600"
                >
                    Create
                </button>
                </div>
            </div>
            )}
            
            <p className="mt-8 text-gray-600 text-xs text-center">
               Data is stored locally on this device.
            </p>
        </div>
      ) : (
        <div className="w-full max-w-sm bg-gym-800 border border-gym-700 rounded-xl p-6 animate-in slide-in-from-bottom-2">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
               <Cloud className="text-blue-400" /> Supabase Login
            </h3>
            
            {cloudError && <div className="p-3 mb-4 rounded bg-red-900/30 border border-red-500/50 text-red-400 text-xs">{cloudError}</div>}

            <div className="space-y-4 mb-6">
               <div>
                  <label className="text-xs text-gray-500 font-bold uppercase ml-1 mb-1 block">Email</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-gym-900 border border-gym-600 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                    placeholder="athlete@example.com"
                  />
               </div>
               <div>
                  <label className="text-xs text-gray-500 font-bold uppercase ml-1 mb-1 block">Password</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-gym-900 border border-gym-600 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                    placeholder="••••••••"
                  />
               </div>
            </div>

            <div className="flex flex-col gap-3">
               <button 
                 onClick={handleCloudSignIn} 
                 disabled={isLoading || !email || !password}
                 className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-bold flex items-center justify-center gap-2"
               >
                 <LogIn size={18} /> {isLoading ? 'Authenticating...' : 'Sign In'}
               </button>
               <button 
                 onClick={handleCloudSignUp} 
                 disabled={isLoading || !email || !password}
                 className="w-full py-3 bg-gym-700 hover:bg-gym-600 disabled:opacity-50 text-white rounded-lg font-bold"
               >
                 Create Cloud Account
               </button>
            </div>
            
            <p className="mt-6 text-gray-500 text-xs text-center leading-relaxed">
               Cloud accounts sync your data across devices using Supabase. Requires configuration in `.env`.
            </p>
        </div>
      )}
    </div>
  );
};

export default LoginScreen;

