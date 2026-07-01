import React, { useState, useEffect } from 'react';
import { Task, AppUser, Notification, AiReport } from '../types';
import { dbService } from '../lib/firebase';
import TimelineView from './TimelineView';
import { 
  CheckCircle2, 
  XCircle, 
  Timer, 
  AlertTriangle, 
  Clock, 
  Bell, 
  CalendarDays, 
  Sparkles, 
  ArrowRight,
  LogOut,
  Moon,
  Sun,
  Award,
  BookOpen,
  MessageSquareCode,
  Activity,
  History,
  Info
} from 'lucide-react';

interface UserDashboardProps {
  currentUser: AppUser;
  onLogout: () => void;
  isDark: boolean;
  setIsDark: (val: boolean) => void;
}

export default function UserDashboard({ currentUser, onLogout, isDark, setIsDark }: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'timeline'>('today');
  
  // Data state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Submission Form State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [submitStatus, setSubmitStatus] = useState<'Completed' | 'Not Completed'>('Completed');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastGeneratedReport, setLastGeneratedReport] = useState<AiReport | null>(null);

  const loadUserData = async () => {
    try {
      const allTasks = await dbService.getTasks();
      const userTasks = allTasks.filter(t => t.assignedTo === currentUser.uid);
      setTasks(userTasks);

      const userNotifs = await dbService.getNotifications(currentUser.uid);
      setNotifications(userNotifs);
    } catch (err) {
      console.warn("DB fetch error in User, using local fallback", err);
    }
  };

  useEffect(() => {
    loadUserData();
    const interval = setInterval(loadUserData, 4000); // Live poll database
    return () => clearInterval(interval);
  }, []);

  // Filter tasks
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => t.dueDate === todayStr || t.status === 'Pending');
  const historyTasks = tasks.filter(t => t.status !== 'Pending');

  // Calculations
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'Completed').length,
    notCompleted: tasks.filter(t => t.status === 'Not Completed').length,
    incomplete: tasks.filter(t => t.status === 'Incomplete').length,
    pending: tasks.filter(t => t.status === 'Pending').length,
  };

  const personalCompletionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  // Handle Mark Status Submit with immediate server AI analysis
  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    
    if (submitStatus === 'Not Completed' && !remarks.trim()) {
      alert("Please provide the specific remarks or reasons for this incomplete duty.");
      return;
    }

    setSubmitting(true);
    setLastGeneratedReport(null);

    try {
      // Call server side Gemini endpoint for live audit assessment
      const response = await fetch('/api/gemini-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedTask.title,
          description: selectedTask.description,
          status: submitStatus,
          remarks: remarks,
          userName: currentUser.name,
          department: currentUser.department
        })
      });

      let aiReportData: AiReport;
      if (response.ok) {
        aiReportData = await response.json();
      } else {
        throw new Error("Failed to contact server AI assistant");
      }

      const updatedTask: Task = {
        ...selectedTask,
        status: submitStatus,
        remarks: remarks,
        aiReport: aiReportData
      };

      // Save task status & AI Report to DB
      await dbService.saveTask(updatedTask);
      setLastGeneratedReport(aiReportData);

      // Create Admin Notifications
      await dbService.addNotification({
        id: `notif-user-sub-${Date.now()}`,
        sender: currentUser.name,
        receiver: selectedTask.assignedBy, // Notify admin
        message: `${currentUser.name} updated status of "${selectedTask.title}" to ${submitStatus}. Remarks: "${remarks || 'None'}"`,
        type: 'status_change',
        createdAt: new Date().toISOString(),
        read: false,
        taskId: selectedTask.id
      });

      // Clear states
      setRemarks('');
      setSubmitting(false);
      setSelectedTask(null);
      loadUserData();
    } catch (err: any) {
      console.error(err);
      alert("Submission succeeded, but AI analysis report timed out. Updating status.");
      
      const backupTask: Task = {
        ...selectedTask,
        status: submitStatus,
        remarks: remarks
      };
      await dbService.saveTask(backupTask);
      setSubmitting(false);
      setSelectedTask(null);
      loadUserData();
    }
  };

  const handleMarkAsRead = async (notifId: string) => {
    await dbService.markNotificationRead(notifId);
    loadUserData();
  };

  const getUrgentAlerts = () => notifications.filter(n => n.type === 'alert' && !n.read);

  return (
    <div className={`min-h-screen font-sans ${isDark ? 'bg-zinc-950 text-white' : 'bg-slate-50 text-zinc-900'}`}>
      
      {/* Upper Navigation Header Banner */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md px-6 py-4 flex items-center justify-between transition-colors ${
        isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-white/80 border-slate-200'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight flex items-center gap-1.5 leading-none text-slate-900 dark:text-white">
              DUTY<span className="text-indigo-500">SYNC</span>
              <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 px-2 py-0.5 rounded-full font-mono uppercase font-bold tracking-wider">
                Personnel
              </span>
            </h1>
            <p className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
              AUTHORIZED WORKSPACE • DEPT: {currentUser.department}
            </p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-2 rounded-xl border hover:scale-105 transition-all cursor-pointer ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-amber-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onLogout}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold border transition-all cursor-pointer ${
              isDark 
                ? 'bg-zinc-900 border-zinc-800 text-red-400 hover:bg-zinc-800' 
                : 'bg-red-50 border-red-100 text-red-700 hover:bg-red-100'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Hand Quick Metrics Profile Sidebar */}
        <aside className="lg:col-span-3 space-y-5">
          <div className={`p-5 rounded-2xl border ${
            isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
          }`}>
            <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-3">WORKER PROFILE</p>
            <h3 className="text-lg font-bold leading-none">{currentUser.name}</h3>
            <span className="text-xs text-indigo-400 font-medium block mt-1">{currentUser.email}</span>
            <span className="text-[10px] text-zinc-500 font-mono block mt-2 uppercase">{currentUser.department}</span>

            <div className="pt-4 mt-4 border-t border-zinc-800/50 flex items-center justify-between">
              <span className="text-xs text-zinc-500">Compliance score:</span>
              <span className="text-sm font-extrabold text-emerald-400 font-display">{personalCompletionRate}%</span>
            </div>
            
            {/* Completion indicator */}
            <div className={`w-full h-1.5 rounded-full overflow-hidden mt-2 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${personalCompletionRate}%` }} />
            </div>
          </div>

          {/* Urgent alert notice banners */}
          {getUrgentAlerts().length > 0 && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/25 space-y-3">
              <div className="flex items-center gap-2 text-red-500 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 animate-bounce" />
                <span>URGENT SYSTEM DISPATCH</span>
              </div>
              <p className={`text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                {getUrgentAlerts()[0].message}
              </p>
              <button
                onClick={() => handleMarkAsRead(getUrgentAlerts()[0].id)}
                className="w-full py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-mono uppercase font-bold tracking-wider transition-all cursor-pointer"
              >
                Acknowledge Alert
              </button>
            </div>
          )}

          {/* Navigation Links */}
          <div className={`p-5 rounded-2xl border ${
            isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
          }`}>
            <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-3">YOUR ASSIGNMENTS</p>
            <nav className="space-y-1">
              {[
                { id: 'today', label: "Today's Schedule", count: todayTasks.length, icon: <Clock className="w-4 h-4" /> },
                { id: 'history', label: 'Duty Logs', count: historyTasks.length, icon: <History className="w-4 h-4" /> },
                { id: 'timeline', label: 'Duty Calendar Timeline', count: null, icon: <CalendarDays className="w-4 h-4" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setLastGeneratedReport(null);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-sm font-bold'
                      : isDark
                      ? 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {tab.icon}
                    <span>{tab.label}</span>
                  </div>
                  {tab.count !== null && (
                    <span className="text-[10px] font-mono bg-zinc-500/20 px-1.5 py-0.5 rounded-md font-bold">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Right Hand Duty Submission Workspace */}
        <main className="lg:col-span-9 space-y-8">
          
          {/* Real-time Notification reminder updates */}
          {notifications.filter(n => n.type === 'reminder' && !n.read).length > 0 && (
            <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
              isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-indigo-50 border-indigo-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <span className="font-semibold block text-indigo-400">Automated Reminder Notice</span>
                  <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>
                    {notifications.filter(n => n.type === 'reminder' && !n.read)[0].message}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleMarkAsRead(notifications.filter(n => n.type === 'reminder' && !n.read)[0].id)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-mono border hover:scale-105 transition-all cursor-pointer shrink-0 ${
                  isDark ? 'border-zinc-800 bg-zinc-950 text-zinc-300' : 'border-zinc-200 bg-white text-zinc-700'
                }`}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* TAB 1: TODAY'S DUTIES */}
          {activeTab === 'today' && (
            <div className="space-y-6">
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Today's Duty Allocations</h3>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                    Duties assigned for today or currently pending your verification.
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-400 dark:text-zinc-500 font-bold uppercase">{todayTasks.length} Assigned</span>
              </div>

              {todayTasks.length === 0 ? (
                <div className={`p-12 text-center rounded-2xl border ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                  <p className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Excellent! All your scheduled duties have been reviewed or completed.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {todayTasks.map((task) => (
                    <div 
                      key={task.id} 
                      className={`p-6 rounded-2xl border flex flex-col justify-between hover:shadow-md transition-all duration-300 ${
                        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className={`px-2.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold border ${
                            task.priority === 'high' 
                              ? 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400' 
                              : task.priority === 'medium'
                              ? 'bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400'
                              : 'bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400'
                          }`}>
                            {task.priority} Priority
                          </span>
                          
                          <div className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-500 text-[10px] font-mono font-bold">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{task.dueTime || '12:00'}</span>
                          </div>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight mb-1.5">{task.title}</h4>
                        <p className={`text-xs line-clamp-3 mb-4 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>{task.description}</p>
                      </div>

                      <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/40 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 font-bold">DUE: {task.dueDate}</span>
                        
                        {task.status === 'Pending' ? (
                          <button
                            onClick={() => {
                              setSelectedTask(task);
                              setRemarks('');
                              setSubmitStatus('Completed');
                              setLastGeneratedReport(null);
                            }}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                          >
                            <span>Verify Duty</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider font-bold border ${
                            task.status === 'Completed' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                              : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                          }`}>
                            {task.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Real-time AI Summary Report Presentation Panel */}
              {lastGeneratedReport && (
                <div className={`p-6 rounded-2xl border space-y-4 relative overflow-hidden ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl animate-pulse" />
                  
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">AI Duty Summary Assessment</h4>
                      <p className="text-[10px] font-mono text-indigo-500">AUDITED INSTANTLY VIA GEMINI FLASH</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <h5 className="text-[10px] font-bold font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 uppercase">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        PROS & MERITS
                      </h5>
                      <ul className="list-disc list-inside text-xs space-y-1 text-slate-600 dark:text-zinc-400">
                        {lastGeneratedReport.pros.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <h5 className="text-[10px] font-bold font-mono text-red-600 dark:text-red-400 flex items-center gap-1.5 uppercase">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        LIMITS, RISKS & IMPROVEMENTS
                      </h5>
                      <ul className="list-disc list-inside text-xs space-y-1 text-slate-600 dark:text-zinc-400">
                        {lastGeneratedReport.cons.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/50 space-y-2">
                    <h5 className="text-[10px] font-bold font-mono text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 uppercase">
                      <BookOpen className="w-3.5 h-3.5" />
                      RECOMMENDED NEXT ACTIONS & REMEDIES
                    </h5>
                    <ul className="list-disc list-inside text-xs space-y-1 text-slate-600 dark:text-zinc-400 pl-1">
                      {lastGeneratedReport.recommendations.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: DUTY LOGS */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold font-display tracking-tight">Your Duty Verification History</h3>
                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Historical log of all verified, missed, or uncompleted assignments.
                  </p>
                </div>
                <span className="text-xs font-mono text-zinc-500">{historyTasks.length} Records</span>
              </div>

              {historyTasks.length === 0 ? (
                <div className={`p-12 text-center rounded-3xl border ${
                  isDark ? 'bg-zinc-900/20 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
                }`}>
                  <History className="w-12 h-12 text-zinc-500 mx-auto mb-3" />
                  <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>No history logs found on this account yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyTasks.map((task) => (
                    <div 
                      key={task.id} 
                      className={`p-5 rounded-2xl border transition-all hover:translate-x-0.5 ${
                        isDark ? 'bg-zinc-900/20 border-zinc-800/80' : 'bg-white border-zinc-200 shadow-sm'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <h4 className="text-sm font-semibold tracking-tight">{task.title}</h4>
                        
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                            task.priority === 'high' ? 'bg-red-500/10 text-red-400' : 'bg-zinc-500/10 text-zinc-400'
                          }`}>
                            {task.priority}
                          </span>
                          
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold ${
                            task.status === 'Completed' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : task.status === 'Not Completed'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                          }`}>
                            {task.status}
                          </span>
                        </div>
                      </div>

                      <p className={`text-xs mb-3 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{task.description}</p>
                      
                      {task.remarks && (
                        <div className={`p-3 rounded-xl text-xs mb-3 ${isDark ? 'bg-zinc-950/50 text-zinc-400' : 'bg-zinc-50 text-zinc-600'}`}>
                          <span className="font-semibold block text-[10px] uppercase font-mono text-zinc-500">Your remarks:</span>
                          "{task.remarks}"
                        </div>
                      )}

                      {task.aiReport && (
                        <div className="pt-3 border-t border-zinc-800/50 flex items-center justify-between">
                          <div className="flex items-center gap-1 text-[10px] font-mono text-indigo-400">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>AI report generated</span>
                          </div>
                          <button
                            onClick={() => {
                              setLastGeneratedReport(task.aiReport || null);
                              setActiveTab('today');
                            }}
                            className="text-[10px] font-mono text-indigo-400 hover:underline cursor-pointer"
                          >
                            View AI Summary report
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className={`p-8 rounded-3xl border ${
              isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
            }`}>
              <h3 className="text-xl font-bold font-display tracking-tight mb-2">Chronological Duty Log Timeline</h3>
              <p className={`text-xs mb-8 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Visualizes active duty schedule distributions organized as colored events.
              </p>
              
              <TimelineView 
                tasks={tasks} 
                isDark={isDark} 
              />
            </div>
          )}

        </main>

      </div>

      {/* Verify Duty Submission Modal form */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`w-full max-w-xl p-6 rounded-2xl border shadow-2xl relative ${
            isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="text-sm font-bold tracking-tight mb-1 text-slate-900 dark:text-white">Verify Duty Submission</h3>
            <p className={`text-xs mb-4 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
              Verify execution status for: <span className="font-bold text-indigo-500">{selectedTask.title}</span>
            </p>

            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <div className={`flex gap-3 p-1 rounded-xl ${isDark ? 'bg-zinc-950' : 'bg-slate-100'}`}>
                <button
                  type="button"
                  onClick={() => setSubmitStatus('Completed')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    submitStatus === 'Completed' 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Completed
                </button>
                <button
                  type="button"
                  onClick={() => setSubmitStatus('Not Completed')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    submitStatus === 'Not Completed' 
                      ? 'bg-red-600 text-white shadow-xs' 
                      : isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  Not Completed
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold font-mono uppercase text-slate-400 dark:text-zinc-500 mb-1.5">
                  Remarks / Observations {submitStatus === 'Not Completed' && <span className="text-red-500">* (Reason Required)</span>}
                </label>
                <textarea
                  rows={3}
                  required={submitStatus === 'Not Completed'}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={submitStatus === 'Completed' ? "Optionally provide observations or load logs..." : "Please detail the specific reason/blocker explaining why this task was uncompleted..."}
                  className={`w-full px-4 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Informative micro note */}
              <div className={`p-3 rounded-xl text-[10px] leading-relaxed flex items-start gap-2 border ${
                isDark ? 'bg-zinc-950/60 text-zinc-400 border-zinc-800/50' : 'bg-slate-50 text-slate-600 border-slate-100'
              }`}>
                <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <span>
                  <strong>A.I. Dispatch Note:</strong> Upon submission, our Gemini neural engine will audit your report metrics instantly to construct compliance summaries, operational hazard analysis, and recommended next-actions.
                </span>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setSelectedTask(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold font-mono border uppercase tracking-wider cursor-pointer ${
                    isDark 
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2 rounded-xl text-xs font-bold font-mono border uppercase tracking-wider text-white shadow-xs transition-all cursor-pointer ${
                    submitStatus === 'Completed' 
                      ? 'bg-emerald-600 border-emerald-500 hover:bg-emerald-500' 
                      : 'bg-red-600 border-red-500 hover:bg-red-500'
                  }`}
                >
                  {submitting ? 'Auditing Report...' : 'Verify Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
