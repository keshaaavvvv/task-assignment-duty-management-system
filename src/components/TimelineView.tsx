import { Task } from '../types';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  HelpCircle,
  CalendarDays,
  Tag
} from 'lucide-react';

interface TimelineViewProps {
  tasks: Task[];
  isDark: boolean;
  onSelectTask?: (task: Task) => void;
}

export default function TimelineView({ tasks, isDark, onSelectTask }: TimelineViewProps) {
  // Sort tasks chronologically: future/closest first, or past first. Let's show most recent scheduled first.
  const sortedTasks = [...tasks].sort((a, b) => {
    const aTime = new Date(`${a.dueDate}T${a.dueTime || '00:00'}:00`).getTime();
    const bTime = new Date(`${b.dueDate}T${b.dueTime || '00:00'}:00`).getTime();
    return bTime - aTime; // descending
  });

  const getStatusConfig = (status: Task['status']) => {
    switch (status) {
      case 'Completed':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500',
          dot: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]',
          icon: <CheckCircle className="w-4 h-4" />,
          label: 'Completed'
        };
      case 'Not Completed':
        return {
          bg: 'bg-red-500/10 border-red-500/30 text-red-500',
          dot: 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]',
          icon: <XCircle className="w-4 h-4" />,
          label: 'Not Completed'
        };
      case 'Incomplete':
        return {
          bg: 'bg-orange-500/10 border-orange-500/30 text-orange-500',
          dot: 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.5)]',
          icon: <AlertTriangle className="w-4 h-4" />,
          label: 'Incomplete'
        };
      case 'Pending':
      default:
        return {
          bg: 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400',
          dot: 'bg-zinc-400 shadow-[0_0_12px_rgba(156,163,175,0.3)]',
          icon: <HelpCircle className="w-4 h-4" />,
          label: 'Pending'
        };
    }
  };

  const getPriorityBadge = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/15 text-red-400 border border-red-500/20';
      case 'medium':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/20';
      case 'low':
      default:
        return 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20';
    }
  };

  const formatDay = (dateStr: string) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const date = new Date(dateStr);
    const dayName = days[date.getDay()];
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return {
      dayName,
      formattedDate: date.toLocaleDateString('en-US', options)
    };
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarDays className="w-12 h-12 text-zinc-500 mx-auto mb-3" />
        <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>No scheduled events found to render in the timeline.</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6 border-l border-zinc-800 space-y-8 py-2">
      {sortedTasks.map((task) => {
        const { dayName, formattedDate } = formatDay(task.dueDate);
        const config = getStatusConfig(task.status);

        return (
          <div 
            key={task.id} 
            className="relative group cursor-pointer"
            onClick={() => onSelectTask && onSelectTask(task)}
            id={`timeline-event-${task.id}`}
          >
            {/* Dot Indicator on timeline line */}
            <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-4 ${
              isDark ? 'border-zinc-950' : 'border-white'
            } ${config.dot} transition-transform duration-300 group-hover:scale-125`} />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Chronological Label */}
              <div className="md:col-span-1">
                <span className={`text-xs font-mono font-bold uppercase tracking-wider ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}>
                  {dayName}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span className={`text-xs font-mono ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                    {task.dueTime || '12:00'}
                  </span>
                </div>
                <div className={`text-[11px] font-mono mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {formattedDate}
                </div>
              </div>

              {/* Task Details Card */}
              <div className={`md:col-span-3 p-5 rounded-2xl border transition-all duration-300 hover:translate-x-1 ${
                isDark 
                  ? 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900' 
                  : 'bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-md'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h4 className="text-sm font-semibold tracking-tight">{task.title}</h4>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-wider uppercase font-medium flex items-center gap-1 ${config.bg}`}>
                      {config.icon}
                      {config.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono tracking-wider uppercase font-bold ${getPriorityBadge(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>

                <p className={`text-xs line-clamp-2 mb-3 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {task.description}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-800/50 text-[10px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-400" />
                    <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>{task.department}</span>
                  </div>
                  <div className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>
                    Assigned: <span className="font-semibold text-indigo-400">{task.assignedToName}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
