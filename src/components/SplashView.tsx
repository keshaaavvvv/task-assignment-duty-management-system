import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Activity } from 'lucide-react';

interface SplashViewProps {
  onComplete: () => void;
  isDark: boolean;
}

export default function SplashView({ onComplete, isDark }: SplashViewProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 500); // Small transition buffer
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div 
      className={`min-h-screen flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500 ${
        isDark ? 'bg-zinc-950 text-white' : 'bg-slate-50 text-zinc-950'
      }`}
      id="splash-screen"
    >
      {/* Background ambient glowing circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pulse-slow" />

      <div className="z-10 flex flex-col items-center text-center max-w-md px-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="mb-6 w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 dark:shadow-indigo-950/20"
        >
          <ShieldCheck className="w-6 h-6" />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-2xl font-bold tracking-tight leading-none mb-2"
        >
          DUTY<span className="text-indigo-600">SYNC</span>
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className={`text-xs mb-8 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}
        >
          Enterprise Task Assignment & AI Duty Audit
        </motion.p>

        {/* Loading Progress Bar */}
        <div className={`w-64 h-1 overflow-hidden relative mb-4 rounded-full ${isDark ? 'bg-zinc-900' : 'bg-slate-100'}`}>
          <motion.div 
            className="h-full bg-indigo-600 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Progress percent & status */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          <span>Initializing... {progress}%</span>
        </div>
      </div>

      {/* Humble branding credits in page margins as requested (Clean, literal, humble) */}
      <div className="absolute bottom-6 text-center">
        <p className={`text-[10px] font-mono tracking-widest uppercase ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
          DUTY SYNC • SECURED SESSION
        </p>
      </div>
    </div>
  );
}
