import React, { useState } from 'react';
import { motion } from 'motion/react';
import { dbService, auth, googleProvider } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { 
  UserCheck, 
  LogIn, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2,
  Building,
  User,
  Briefcase
} from 'lucide-react';
import { AppUser } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: AppUser) => void;
  isDark: boolean;
}

export default function LoginView({ onLoginSuccess, isDark }: LoginViewProps) {
  // Onboarding States
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [role, setRole] = useState<'admin' | 'person'>('person');
  const [department, setDepartment] = useState('Operations');
  
  // Feedback states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const departments = ['Operations', 'Engineering', 'Safety & Compliance', 'Facilities', 'Administration', 'Logistics'];

  // Handle Google Login Trigger
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      if (user) {
        // Check if user has an existing profile in Firestore
        const existingProfile = await dbService.getUser(user.uid);
        if (existingProfile) {
          setSuccess(`Logged in successfully as ${existingProfile.name}!`);
          setTimeout(() => {
            onLoginSuccess(existingProfile);
            setLoading(false);
          }, 800);
        } else {
          // New user: Trigger profile setup
          setGoogleUser(user);
          setShowProfileSetup(true);
          setLoading(false);
        }
      }
    } catch (err: any) {
      console.error("Google login failed:", err);
      setError(err.message || "Failed to authenticate with Google.");
      setLoading(false);
    }
  };

  // Complete profile setup and save user
  const handleProfileSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleUser) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const newUser: AppUser = {
        uid: googleUser.uid,
        name: googleUser.displayName || 'Authorized Member',
        email: googleUser.email || '',
        role: role,
        department: role === 'admin' ? 'Administration' : department
      };

      await dbService.saveUser(newUser);
      setSuccess("Profile registered successfully! Logging you in...");
      
      setTimeout(() => {
        onLoginSuccess(newUser);
        setLoading(false);
      }, 1000);
    } catch (err: any) {
      console.error("Profile setup failed:", err);
      setError(err.message || "Failed to finalize profile registry.");
      setLoading(false);
    }
  };

  return (
    <div 
      className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-500 ${
        isDark ? 'bg-zinc-950 text-white' : 'bg-slate-50 text-slate-900'
      }`}
      id="login-page"
    >
      <div className="w-full max-w-md z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-3 text-white shadow-sm">
            <Building className="w-4 h-4" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            DUTY<span className="text-indigo-600">SYNC</span>
          </h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
            {showProfileSetup ? 'Finalize your authorization credentials' : 'Duty Assignment & Automated AI Auditing'}
          </p>
        </div>

        {/* Main Interface */}
        <div className={`p-8 rounded-2xl border shadow-sm ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
        }`}>
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {showProfileSetup ? (
            /* ONBOARDING USER PROFILE SETUP */
            <form onSubmit={handleProfileSetupSubmit} className="space-y-4">
              <div className="text-center mb-2">
                <p className="text-xs font-mono text-indigo-500 uppercase font-semibold">Account Setup Required</p>
                <h3 className="text-base font-bold tracking-tight mt-1 text-slate-900 dark:text-white">
                  Welcome, {googleUser?.displayName || 'Team Member'}!
                </h3>
                <p className={`text-[11px] mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Specify your company workspace access details to finalize registration.
                </p>
              </div>

              {/* Role Picker */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider mb-2 text-slate-400 dark:text-zinc-500">
                  Select Authorization Role
                </label>
                <div className={`flex gap-2 p-1 rounded-xl ${isDark ? 'bg-zinc-950/70' : 'bg-slate-100'}`}>
                  <button
                    type="button"
                    onClick={() => setRole('person')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      role === 'person' 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Personnel
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      role === 'admin' 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Administrator
                  </button>
                </div>
              </div>

              {/* Department Option - Filtered on Role */}
              {role === 'person' ? (
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider mb-1.5 text-slate-400 dark:text-zinc-500">
                    Assigned Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-zinc-900'
                    }`}
                  >
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className={`p-3 rounded-xl border text-[11px] leading-relaxed ${
                  isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-400' : 'bg-indigo-50/40 border-indigo-100 text-indigo-700'
                }`}>
                  <p className="font-semibold flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" /> Administrative Rights Enabled
                  </p>
                  <p className="mt-1 text-[10px] opacity-90">
                    Your profile will automatically map to the Administration department, enabling comprehensive task assignment, timeline tracking, and AI audits.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>{loading ? 'Registering Workspace...' : 'Complete Profile Registry'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* SECURE GOOGLE LOGIN INTERFACE */
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Workspace Sign In</h3>
                <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Authorized credentials must be matched with Google Workspace directory authentication to proceed.
                </p>
              </div>

              {/* Google Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className={`w-full py-3 px-4 rounded-xl border font-sans flex items-center justify-center gap-3 transition-all cursor-pointer ${
                  isDark 
                    ? 'bg-zinc-950 hover:bg-zinc-800/80 border-zinc-800 text-white' 
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                {/* Visual Google Branding Representation */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.113-5.136 4.113A5.807 5.807 0 0 1 8.1 12.7a5.807 5.807 0 0 1 5.89-5.815c1.47 0 2.8.5 3.84 1.433l3.1-3.1C18.96 3.328 16.59 2 13.99 2 8.47 2 4 6.47 4 12s4.47 10 9.99 10c6.04 0 9.87-4.24 9.87-10.02 0-.62-.07-1.26-.22-1.695H12.24Z"
                  />
                </svg>
                <span className="text-xs font-semibold">
                  {loading ? 'Connecting Directory...' : 'Continue with Google'}
                </span>
              </button>

              <div className={`p-3 rounded-xl border text-[10px] leading-relaxed flex items-start gap-2 ${
                isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-500' : 'bg-slate-50 border-slate-100 text-slate-400'
              }`}>
                <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-500 shrink-0">
                  <Building className="w-3.5 h-3.5" />
                </div>
                <span>
                  <strong>Information Security Policy:</strong> Logging in establishes an encrypted connection. If you are a new team member, you will choose your departmental permissions immediately following authentication.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
