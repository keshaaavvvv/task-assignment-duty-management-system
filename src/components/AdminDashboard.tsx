import React, { useState, useRef } from 'react';
import { Task, AppUser, Notification } from '../types';
import { dbService } from '../lib/firebase';
import TimelineView from './TimelineView';
import ReportsView from './ReportsView';
import * as XLSX from 'xlsx';
import { 
  Users, 
  Plus, 
  Calendar, 
  Clock, 
  AlertOctagon, 
  Bell, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Timer,
  Upload,
  User,
  Trash2,
  Edit2,
  Volume2,
  FileSpreadsheet,
  X,
  Sparkles,
  PieChart as LucidePie,
  Grid,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  LayoutDashboard,
  CalendarDays,
  Activity,
  History
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: AppUser;
  onLogout: () => void;
  isDark: boolean;
  setIsDark: (val: boolean) => void;
}

export default function AdminDashboard({ currentUser, onLogout, isDark, setIsDark }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'timeline' | 'reports'>('overview');
  
  // Data State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Form State for creating/editing tasks
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('12:00');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [department, setDepartment] = useState('Operations');

  // Manual Urgent Alert State
  const [alertTarget, setAlertTarget] = useState('all');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSuccess, setAlertSuccess] = useState('');

  // Excel Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load live DB data
  const loadData = async () => {
    try {
      const uList = await dbService.getUsers();
      const tList = await dbService.getTasks();
      const nList = await dbService.getNotifications(currentUser.uid);
      
      setUsers(uList);
      setTasks(tList);
      setNotifications(nList);
    } catch (err) {
      console.warn("DB fetch error in Admin, using local fallbacks", err);
    }
  };

  React.useEffect(() => {
    loadData();
    // Set first personnel as default assigned user in form
    const interval = setInterval(loadData, 5000); // Poll database updates
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    const personnel = users.filter(u => u.role === 'person');
    if (personnel.length > 0 && !assignedTo) {
      setAssignedTo(personnel[0].uid);
    }
  }, [users]);

  // Calculations
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'Completed').length,
    pending: tasks.filter(t => t.status === 'Pending').length,
    incomplete: tasks.filter(t => t.status === 'Incomplete').length,
    notCompleted: tasks.filter(t => t.status === 'Not Completed').length,
  };

  const complianceRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  // Handle Create / Edit Submit
  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !assignedTo || !dueDate) {
      alert("Please specify a title, designated personnel, and deadline.");
      return;
    }

    const assignedUser = users.find(u => u.uid === assignedTo);
    if (!assignedUser) return;

    const taskObj: Task = {
      id: editingTask ? editingTask.id : `task-${Date.now()}`,
      title: taskTitle,
      description: taskDesc,
      assignedTo,
      assignedToName: assignedUser.name,
      assignedBy: currentUser.uid,
      priority,
      dueDate,
      dueTime,
      status: editingTask ? editingTask.status : 'Pending',
      remarks: editingTask ? editingTask.remarks : '',
      department: assignedUser.department || department,
      createdAt: editingTask ? editingTask.createdAt : new Date().toISOString(),
      aiReport: editingTask ? editingTask.aiReport : undefined
    };

    await dbService.saveTask(taskObj);

    // Send a notification to the assigned worker
    if (!editingTask) {
      const notif: Notification = {
        id: `notif-assign-${Date.now()}`,
        sender: currentUser.name,
        receiver: assignedTo,
        message: `New duty assigned: "${taskTitle}" scheduled for ${dueDate} at ${dueTime}.`,
        type: 'reminder',
        createdAt: new Date().toISOString(),
        read: false,
        taskId: taskObj.id
      };
      await dbService.addNotification(notif);
    }

    setTaskTitle('');
    setTaskDesc('');
    setDueDate('');
    setDueTime('12:00');
    setEditingTask(null);
    setIsFormOpen(false);
    loadData();
  };

  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description);
    setAssignedTo(task.assignedTo);
    setDueDate(task.dueDate);
    setDueTime(task.dueTime);
    setPriority(task.priority);
    setDepartment(task.department);
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (taskId: string) => {
    if (confirm("Are you certain you wish to delete this duty?")) {
      await dbService.deleteTask(taskId);
      loadData();
    }
  };

  // Dispatch Manual Urgent Alert
  const handleDispatchAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertMessage.trim()) return;

    if (alertTarget === 'all') {
      // Send to all staff members
      const personnel = users.filter(u => u.role === 'person');
      for (const p of personnel) {
        await dbService.addNotification({
          id: `alert-${Date.now()}-${p.uid}`,
          sender: `System Alert (${currentUser.name})`,
          receiver: p.uid,
          message: `🚨 URGENT: ${alertMessage}`,
          type: 'alert',
          createdAt: new Date().toISOString(),
          read: false
        });
      }
    } else {
      // Send to specific worker
      await dbService.addNotification({
        id: `alert-${Date.now()}`,
        sender: `System Alert (${currentUser.name})`,
        receiver: alertTarget,
        message: `🚨 URGENT: ${alertMessage}`,
        type: 'alert',
        createdAt: new Date().toISOString(),
        read: false
      });
    }

    setAlertMessage('');
    setAlertSuccess('Urgent alert was dispatched successfully to specified team members.');
    setTimeout(() => setAlertSuccess(''), 4000);
    loadData();
  };

  // Excel Import Handler
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const rawData = XLSX.utils.sheet_to_json(worksheet) as any[];
        let importedCount = 0;

        for (const row of rawData) {
          // Columns requested: Name, Task, Date, Time, Priority, Department
          const personName = row['Name'] || row['name'];
          const taskTitleVal = row['Task'] || row['task'] || row['Title'] || row['title'];
          const rawDate = row['Date'] || row['date'];
          const rawTime = row['Time'] || row['time'] || '12:00';
          const priorityVal = (row['Priority'] || row['priority'] || 'medium').toLowerCase() as Task['priority'];
          const deptVal = row['Department'] || row['department'] || 'Operations';

          if (!taskTitleVal) continue;

          // Attempt to match personName to existing users
          let matchedUser = users.find(u => u.name.toLowerCase().includes((personName || '').toLowerCase()));
          
          if (!matchedUser && personName) {
            // Create a temporary placeholder personnel profile if name doesn't match
            const uid = `user-imported-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            matchedUser = {
              uid,
              name: personName,
              email: `${personName.replace(/\s+/g, '').toLowerCase()}@duty.com`,
              role: 'person',
              department: deptVal
            };
            await dbService.saveUser(matchedUser);
            // Refresh users list local scope
            users.push(matchedUser);
          }

          const targetUid = matchedUser ? matchedUser.uid : (users.filter(u => u.role === 'person')[0]?.uid || 'user-1');
          const targetName = matchedUser ? matchedUser.name : 'Alex Carter';

          // Standardize date to YYYY-MM-DD
          let finalDate = new Date().toISOString().split('T')[0];
          if (rawDate) {
            try {
              // Handle potential excel serial dates
              if (typeof rawDate === 'number') {
                const parsedDate = new Date((rawDate - 25569) * 86400 * 1000);
                finalDate = parsedDate.toISOString().split('T')[0];
              } else {
                finalDate = new Date(rawDate).toISOString().split('T')[0];
              }
            } catch (err) {
              // fall back
            }
          }

          const taskObj: Task = {
            id: `task-excel-${Date.now()}-${importedCount}`,
            title: taskTitleVal,
            description: row['Description'] || row['description'] || `Imported duty for ${deptVal}.`,
            assignedTo: targetUid,
            assignedToName: targetName,
            assignedBy: currentUser.uid,
            priority: ['high', 'medium', 'low'].includes(priorityVal) ? priorityVal : 'medium',
            dueDate: finalDate,
            dueTime: String(rawTime),
            status: 'Pending',
            department: deptVal,
            createdAt: new Date().toISOString()
          };

          await dbService.saveTask(taskObj);

          // Add notification
          await dbService.addNotification({
            id: `notif-excel-${Date.now()}-${importedCount}`,
            sender: currentUser.name,
            receiver: targetUid,
            message: `New duty assigned via Excel: "${taskTitleVal}" scheduled for ${finalDate}.`,
            type: 'reminder',
            createdAt: new Date().toISOString(),
            read: false,
            taskId: taskObj.id
          });

          importedCount++;
        }

        alert(`Successfully imported and assigned ${importedCount} tasks from the Excel file.`);
        loadData();
      } catch (err) {
        console.error(err);
        alert("Failed to parse Excel file. Please ensure columns are: Name, Task, Date, Time, Priority, Department.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const personnelUsers = users.filter(u => u.role === 'person');

  return (
    <div className={`min-h-screen font-sans ${isDark ? 'bg-zinc-950 text-white' : 'bg-slate-50 text-zinc-900'}`}>
      
      {/* Upper Navigation Banner */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md px-6 py-4 flex items-center justify-between transition-colors ${
        isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-white/80 border-slate-200'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-display tracking-tight flex items-center gap-1.5 leading-none">
              DUTY<span className="text-indigo-500">SYNC</span>
              <span className="text-[10px] bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded-full font-mono uppercase font-bold tracking-wider">
                ADMIN
              </span>
            </h1>
            <p className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              AUTHORIZED ACCESS: {currentUser.name}
            </p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-2 rounded-xl border hover:scale-105 transition-all cursor-pointer ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-amber-400' : 'bg-white border-zinc-200 text-zinc-600'
            }`}
            title="Toggle theme mode"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side Navigation Sidebar */}
        <aside className="lg:col-span-3 space-y-4">
          <div className={`p-5 rounded-2xl border ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
          }`}>
            <p className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase mb-4 font-bold">NAVIGATIONAL HUB</p>
            <nav className="space-y-1">
              {[
                { id: 'overview', label: 'Admin Dashboard', icon: <Activity className="w-4 h-4" /> },
                { id: 'tasks', label: 'Duty Allocator', icon: <Plus className="w-4 h-4" /> },
                { id: 'timeline', label: 'Active Timeline', icon: <CalendarDays className="w-4 h-4" /> },
                { id: 'reports', label: 'Compliance Reports', icon: <History className="w-4 h-4" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    activeTab === tab.id
                      ? isDark 
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                        : 'bg-indigo-50 text-indigo-700'
                      : isDark
                      ? 'text-zinc-400 hover:bg-zinc-950/40 hover:text-white border border-transparent'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {tab.icon}
                    <span>{tab.label}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>
              ))}
            </nav>
          </div>

          {/* Quick Stats Summary panel */}
          <div className={`p-5 rounded-2xl border ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
          }`}>
            <p className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-zinc-500 uppercase mb-3 font-bold">COMPLIANCE RATING</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 font-display">{complianceRate}%</span>
              <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-zinc-500 uppercase">SUCCESS RATE</span>
            </div>
            
            {/* Visual Mini Progress Bar */}
            <div className={`w-full h-1 mt-3 overflow-hidden rounded-full ${isDark ? 'bg-zinc-950' : 'bg-slate-100'}`}>
              <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${complianceRate}%` }} />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800/50 text-[10px] font-mono">
              <div>
                <span className="text-slate-400 dark:text-zinc-500">DONE: </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{stats.completed}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-zinc-500">PENDING: </span>
                <span className="font-bold text-slate-500 dark:text-zinc-400">{stats.pending}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-zinc-500">MISSED: </span>
                <span className="font-bold text-orange-500 dark:text-orange-400">{stats.incomplete}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-zinc-500">FAILED: </span>
                <span className="font-bold text-red-500 dark:text-red-400">{stats.notCompleted}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Side Content Canvas */}
        <main className="lg:col-span-9 space-y-8">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              
              {/* Analytics Counters */}
              <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Total Duties', value: stats.total, color: 'text-slate-900 dark:text-white', icon: <Grid className="w-4 h-4 text-indigo-500" /> },
                  { label: 'Completed', value: stats.completed, color: 'text-emerald-600 dark:text-emerald-400', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
                  { label: 'Pending', value: stats.pending, color: 'text-slate-500 dark:text-zinc-400', icon: <Timer className="w-4 h-4 text-slate-400" /> },
                  { label: 'Incomplete', value: stats.incomplete, color: 'text-orange-600 dark:text-orange-400', icon: <AlertTriangle className="w-4 h-4 text-orange-500" /> },
                  { label: 'Not Done', value: stats.notCompleted, color: 'text-red-600 dark:text-red-400', icon: <XCircle className="w-4 h-4 text-red-500" /> }
                ].map((st, i) => (
                  <div 
                    key={i} 
                    className={`p-4 rounded-2xl border flex flex-col justify-between ${
                      isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between text-slate-400 dark:text-zinc-500">
                      <span className="text-[10px] font-mono uppercase tracking-wider font-bold">{st.label}</span>
                      {st.icon}
                    </div>
                    <span className={`text-2xl font-bold tracking-tight mt-2 ${st.color}`}>{st.value}</span>
                  </div>
                ))}
              </section>

              {/* Main Actions Panel: Form opener + Excel import + Alerts */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Duties Allocation Quick Card */}
                <div className={`p-6 rounded-2xl border flex flex-col justify-between ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Duty Schedulers</h3>
                    <p className={`text-xs mt-1 mb-4 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                      Schedule new tasks for registered personnel or upload a spreadsheet directory.
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => {
                        setEditingTask(null);
                        setTaskTitle('');
                        setTaskDesc('');
                        setDueDate('');
                        setIsFormOpen(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Manually Assign Task</span>
                    </button>

                    {/* Excel Uploader Button */}
                    <div className="flex-1 relative">
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        accept=".xlsx, .xls"
                        onChange={handleExcelImport}
                        className="hidden" 
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isDark 
                            ? 'bg-zinc-950 border-zinc-800 text-zinc-300' 
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                        <span>Import Excel Sheet</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Urgent alert form */}
                <div className={`p-6 rounded-2xl border ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <h3 className="text-sm font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
                    <Volume2 className="w-4.5 h-4.5 text-red-500" />
                    Urgent Alert Dispatcher
                  </h3>
                  <p className={`text-xs mt-1 mb-4 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                    Instantly broadcast high-priority, red-alert reminders to designated personnel.
                  </p>

                  <form onSubmit={handleDispatchAlert} className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={alertTarget}
                        onChange={(e) => setAlertTarget(e.target.value)}
                        className={`px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                          isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-zinc-900'
                        }`}
                      >
                        <option value="all">Broadcast (All Staff)</option>
                        {personnelUsers.map(p => (
                          <option key={p.uid} value={p.uid}>{p.name}</option>
                        ))}
                      </select>
                      
                      <input
                        type="text"
                        required
                        value={alertMessage}
                        onChange={(e) => setAlertMessage(e.target.value)}
                        placeholder="Please update pending tasks immediately."
                        className={`flex-1 px-4 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-red-500 ${
                          isDark ? 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-500' : 'bg-slate-50 border-slate-200 text-zinc-900 placeholder-slate-400'
                        }`}
                      />
                      
                      <button
                        type="submit"
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                      >
                        Send
                      </button>
                    </div>

                    {alertSuccess && (
                      <p className="text-[10px] font-mono text-emerald-500 font-bold">{alertSuccess}</p>
                    )}
                  </form>
                </div>

              </section>

              {/* Tasks table / List section with edit/delete */}
              <div className={`p-6 rounded-2xl border ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Duty Assignments</h3>
                  <span className="text-xs font-mono text-slate-400 dark:text-zinc-500">{tasks.length} Assigned Duties</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className={`border-b font-mono text-[10px] uppercase tracking-wider ${
                        isDark ? 'text-zinc-500 border-zinc-800' : 'text-zinc-400 border-zinc-200'
                      }`}>
                        <th className="pb-3">Duty Name</th>
                        <th className="pb-3">Assigned To</th>
                        <th className="pb-3">Deadline</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/40">
                      {tasks.map((task) => (
                        <tr key={task.id} className="hover:bg-slate-500/5 group">
                          <td className="py-3.5 pr-2">
                            <span className="font-bold text-slate-900 dark:text-white">{task.title}</span>
                            <span className={`block text-[10px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{task.department}</span>
                          </td>
                          <td className="py-3.5 pr-2 font-medium text-slate-700 dark:text-zinc-300">{task.assignedToName}</td>
                          <td className="py-3.5 pr-2 font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                            {task.dueDate} @ {task.dueTime || '12:00'}
                          </td>
                          <td className="py-3.5 pr-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider font-bold border ${
                              task.status === 'Completed' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                                : task.status === 'Not Completed'
                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                                : task.status === 'Incomplete'
                                ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20'
                                : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/20'
                            }`}>
                              {task.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-right space-x-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditClick(task)}
                              className={`p-1.5 rounded-lg border hover:scale-105 transition-all cursor-pointer ${
                                isDark ? 'bg-zinc-950 border-zinc-800 text-indigo-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-indigo-600 hover:text-indigo-800'
                              }`}
                              title="Edit assigned task"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(task.id)}
                              className={`p-1.5 rounded-lg border hover:scale-105 transition-all cursor-pointer ${
                                isDark ? 'bg-zinc-950 border-zinc-800 text-red-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-red-600 hover:text-red-800'
                              }`}
                              title="Delete task assignment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Registered Team Members Directory grouped by Department */}
              <div className={`p-6 rounded-2xl border ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
              }`} id="team-directory">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                      <Users className="w-4 h-4 text-indigo-500" />
                      Registered Team Directory (By Department)
                    </h3>
                    <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                      Instantly review authenticated company personnel mapped to operational divisions and dispatch duties.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 bg-indigo-500/10 text-indigo-500 rounded-full font-bold uppercase tracking-wider self-start sm:self-center">
                    {personnelUsers.length} Members Active
                  </span>
                </div>

                {personnelUsers.length === 0 ? (
                  <div className={`p-8 text-center rounded-xl border border-dashed ${
                    isDark ? 'border-zinc-800 text-zinc-500' : 'border-slate-200 text-slate-400'
                  }`}>
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="text-xs">No personnel registered in the workspace yet.</p>
                    <p className="text-[10px] mt-1">Once team members sign in via Google, their profiles will populate here automatically.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(
                      personnelUsers.reduce((acc, u) => {
                        const dept = u.department || 'General Operations';
                        if (!acc[dept]) acc[dept] = [];
                        acc[dept].push(u);
                        return acc;
                      }, {} as Record<string, AppUser[]>)
                    ).map(([dept, deptUsers]) => {
                      const usersList = deptUsers as AppUser[];
                      return (
                        <div key={dept} className={`p-4 rounded-xl border ${
                          isDark ? 'bg-zinc-950/40 border-zinc-800/80' : 'bg-slate-50/60 border-slate-200/80'
                        }`}>
                          <div className="flex items-center justify-between border-b pb-2 mb-3 border-slate-200/40 dark:border-zinc-800/40">
                            <span className="text-xs font-bold font-mono tracking-wide uppercase text-indigo-600 dark:text-indigo-400">
                              {dept}
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-slate-200/50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 px-1.5 py-0.5 rounded-md">
                              {usersList.length}
                            </span>
                          </div>
                          <div className="space-y-3">
                            {usersList.map((u) => {
                              // Find active / pending duties count for this member
                              const pendingCount = tasks.filter(t => t.assignedTo === u.uid && t.status === 'Pending').length;
                              return (
                                <div key={u.uid} className="flex items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-slate-100 dark:border-zinc-800/50">
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold truncate text-slate-900 dark:text-white flex items-center gap-1.5">
                                      {u.name}
                                      {pendingCount > 0 && (
                                        <span className="text-[9px] font-mono px-1 bg-amber-500/10 text-amber-500 rounded-sm font-semibold">
                                          {pendingCount} active
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate mt-0.5">{u.email}</p>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setAssignedTo(u.uid);
                                      setDepartment(u.department || 'Operations');
                                      setEditingTask(null);
                                      setTaskTitle('');
                                      setTaskDesc('');
                                      setDueDate('');
                                      setActiveTab('tasks');
                                    }}
                                    className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold shadow-xs transition-all cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Assign Duty</span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* AI Audit summary block */}
              <div className={`p-6 rounded-2xl border relative overflow-hidden ${
                isDark ? 'bg-indigo-950/10 border-indigo-900/30' : 'bg-indigo-50/50 border border-indigo-100 shadow-sm'
              }`}>
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm">
                    <Sparkles className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight flex items-center gap-1.5 text-indigo-950 dark:text-indigo-300">
                      AI Duty Compliance Auditor
                    </h3>
                    <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                      Select or click on any task in the **Compliance Reports** or **Timeline** tab to instantly generate, audit, and inspect automated AI-generated report insights, performance logs, and risk recommendations.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: TASK ALLOCATOR FORM */}
          {activeTab === 'tasks' && (
            <div className={`p-8 rounded-2xl border ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <h3 className="text-sm font-bold tracking-tight mb-1 text-slate-900 dark:text-white">Manual Task Assignment</h3>
              <p className={`text-xs mb-6 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                Fill in the direct parameters below to schedule and allocate standard organizational duties to registered personnel.
              </p>

              <form onSubmit={handleTaskSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-zinc-500 mb-2">Duty Title</label>
                    <input
                      type="text"
                      required
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="e.g. Server Room Thermal Inspection"
                      className={`w-full px-4 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isDark ? 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-500' : 'bg-slate-50 border-slate-200 text-zinc-900 placeholder-slate-400'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-zinc-500 mb-2">Designated Personnel</label>
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className={`w-full px-4 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-zinc-900'
                      }`}
                    >
                      {personnelUsers.map(p => (
                        <option key={p.uid} value={p.uid}>{p.name} ({p.department})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-zinc-500 mb-2">Due Date</label>
                    <input
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className={`w-full px-4 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-zinc-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-zinc-500 mb-2">Due Time</label>
                    <input
                      type="time"
                      required
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                      className={`w-full px-4 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-zinc-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-zinc-500 mb-2">Priority Level</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className={`w-full px-4 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-zinc-900'
                      }`}
                    >
                      <option value="high">HIGH PRIORITY</option>
                      <option value="medium">MEDIUM PRIORITY</option>
                      <option value="low">LOW PRIORITY</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-zinc-500 mb-2">Default Department category</label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className={`w-full px-4 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-zinc-900'
                      }`}
                    >
                      {['Operations', 'Engineering', 'Safety & Compliance', 'Facilities', 'Administration'].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-zinc-500 mb-2">Detailed Instructions</label>
                  <textarea
                    rows={4}
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    placeholder="Provide step-by-step procedure parameters for the designated personnel..."
                    className={`w-full px-4 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-500' : 'bg-slate-50 border-slate-200 text-zinc-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  >
                    Allocate Assignment
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className={`p-8 rounded-2xl border ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Active Duty Chronological Timeline</h3>
              <p className={`text-xs mb-8 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                Visualizes active duty schedule distributions organized as colored events.
              </p>
              
              <TimelineView 
                tasks={tasks} 
                isDark={isDark} 
                onSelectTask={(task) => {
                  alert(`Task: ${task.title}\nStatus: ${task.status}\nAssigned to: ${task.assignedToName}\nRemarks: ${task.remarks || 'None'}`);
                }}
              />
            </div>
          )}

          {/* TAB 4: COMPLIANCE REPORTS */}
          {activeTab === 'reports' && (
            <div className={`p-8 rounded-2xl border ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <ReportsView tasks={tasks} users={users} isDark={isDark} />
            </div>
          )}

        </main>

      </div>

      {/* Manual Task Edit Modal Form */}
      {isFormOpen && editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className={`w-full max-w-xl p-6 rounded-2xl border shadow-sm relative ${
            isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <button 
              onClick={() => {
                setEditingTask(null);
                setIsFormOpen(false);
              }}
              className={`absolute top-4 right-4 p-1.5 rounded-lg border transition-all cursor-pointer ${
                isDark ? 'bg-zinc-950 border-zinc-800 hover:bg-zinc-900 text-zinc-400' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500'
              }`}
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold tracking-tight mb-4 text-slate-900 dark:text-white">Edit Assigned Task Settings</h3>
            
            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-zinc-500 mb-1.5">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className={`w-full px-4 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-zinc-500 mb-1.5">Description Instructions</label>
                <textarea
                  rows={3}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className={`w-full px-4 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-450'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-zinc-500 mb-1.5">Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={`w-full px-4 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-zinc-500 mb-1.5">Due Time</label>
                  <input
                    type="time"
                    required
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className={`w-full px-4 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTask(null);
                    setIsFormOpen(false);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
                    isDark ? 'bg-zinc-950 border-zinc-800 hover:bg-zinc-900 text-zinc-400' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
