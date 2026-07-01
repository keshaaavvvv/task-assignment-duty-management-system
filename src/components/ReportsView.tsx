import { useState } from 'react';
import { Task, AppUser } from '../types';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { 
  Search, 
  Filter, 
  Download, 
  FileText, 
  TrendingUp, 
  Grid,
  RefreshCw,
  CalendarDays,
  FileSpreadsheet
} from 'lucide-react';

interface ReportsViewProps {
  tasks: Task[];
  users: AppUser[];
  isDark: boolean;
}

export default function ReportsView({ tasks, users, isDark }: ReportsViewProps) {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerson, setSelectedPerson] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState('all'); // all, today, week, month

  const departments = ['all', 'Operations', 'Engineering', 'Safety & Compliance', 'Facilities', 'Administration', 'Logistics'];
  const priorities = ['all', 'high', 'medium', 'low'];
  const statuses = ['all', 'Pending', 'Completed', 'Not Completed', 'Incomplete'];

  // Apply filters
  const filteredTasks = tasks.filter(task => {
    // Search Term match (title, description, remarks)
    const matchesSearch = 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.remarks || '').toLowerCase().includes(searchTerm.toLowerCase());

    // Person match
    const matchesPerson = selectedPerson === 'all' || task.assignedTo === selectedPerson;

    // Department match
    const matchesDept = selectedDepartment === 'all' || task.department === selectedDepartment;

    // Priority match
    const matchesPriority = selectedPriority === 'all' || task.priority === selectedPriority;

    // Status match
    const matchesStatus = selectedStatus === 'all' || task.status === selectedStatus;

    // Date range match
    let matchesDate = true;
    const taskDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDateFilter === 'today') {
      const taskDay = new Date(task.dueDate);
      taskDay.setHours(0, 0, 0, 0);
      matchesDate = taskDay.getTime() === today.getTime();
    } else if (selectedDateFilter === 'week') {
      const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesDate = taskDate >= oneWeekAgo;
    } else if (selectedDateFilter === 'month') {
      const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      matchesDate = taskDate >= oneMonthAgo;
    }

    return matchesSearch && matchesPerson && matchesDept && matchesPriority && matchesStatus && matchesDate;
  });

  // Export handlers
  const handleExportCSV = () => {
    const headers = ['Task Title', 'Description', 'Assigned To', 'Department', 'Priority', 'Due Date', 'Due Time', 'Status', 'Personnel Remarks', 'Created At'];
    const rows = filteredTasks.map(t => [
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      `"${t.assignedToName.replace(/"/g, '""')}"`,
      `"${t.department.replace(/"/g, '""')}"`,
      t.priority.toUpperCase(),
      t.dueDate,
      t.dueTime || '12:00',
      t.status,
      `"${(t.remarks || '').replace(/"/g, '""')}"`,
      t.createdAt
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `DutySync_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    const formattedData = filteredTasks.map(t => ({
      'Task Title': t.title,
      'Description': t.description,
      'Assigned To': t.assignedToName,
      'Department': t.department,
      'Priority': t.priority.toUpperCase(),
      'Due Date': t.dueDate,
      'Due Time': t.dueTime || '12:00',
      'Status': t.status,
      'Personnel Remarks': t.remarks || '',
      'Created At': t.createdAt
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Duty Report");
    
    // Write out workbook
    XLSX.writeFile(workbook, `DutySync_ExcelReport_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // PDF Branding Header
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("DUTY SYNC REPORT", 14, 25);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);
    doc.text(`Filter criteria: Dept: ${selectedDepartment}, Status: ${selectedStatus}`, 110, 34);

    let y = 50;
    
    // Stats section
    const completed = filteredTasks.filter(t => t.status === 'Completed').length;
    const total = filteredTasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    doc.setFillColor(243, 244, 246); // gray-100
    doc.rect(14, y, 182, 18, 'F');
    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Filtered Task Count: ${total}`, 20, y + 11);
    doc.text(`Compliance Rate: ${completionRate}% (${completed}/${total} completed)`, 110, y + 11);
    
    y += 30;

    // Draw table headers
    doc.setFillColor(79, 70, 229); // Indigo-600
    doc.rect(14, y, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Task Title", 16, y + 6);
    doc.text("Assigned To", 70, y + 6);
    doc.text("Priority", 120, y + 6);
    doc.text("Due Date", 145, y + 6);
    doc.text("Status", 175, y + 6);

    y += 14;

    doc.setTextColor(55, 65, 81);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    filteredTasks.forEach((task, idx) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
        // re-draw table headers on new page
        doc.setFillColor(79, 70, 229);
        doc.rect(14, y, 182, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("Task Title", 16, y + 6);
        doc.text("Assigned To", 70, y + 6);
        doc.text("Priority", 120, y + 6);
        doc.text("Due Date", 145, y + 6);
        doc.text("Status", 175, y + 6);
        y += 14;
        doc.setTextColor(55, 65, 81);
        doc.setFont("helvetica", "normal");
      }

      // Draw horizontal separator lines
      doc.setDrawColor(229, 231, 235);
      doc.line(14, y + 1, 196, y + 1);

      // Truncate strings to prevent PDF overlaps
      const title = task.title.length > 32 ? task.title.substring(0, 32) + "..." : task.title;
      const assigned = task.assignedToName.length > 25 ? task.assignedToName.substring(0, 25) + "..." : task.assignedToName;

      doc.text(title, 16, y);
      doc.text(assigned, 70, y);
      doc.text(task.priority.toUpperCase(), 120, y);
      doc.text(`${task.dueDate} ${task.dueTime || ''}`, 145, y);
      
      // Color-coded statuses
      if (task.status === 'Completed') doc.setTextColor(16, 185, 129);
      else if (task.status === 'Not Completed') doc.setTextColor(239, 68, 68);
      else if (task.status === 'Incomplete') doc.setTextColor(249, 115, 22);
      else doc.setTextColor(107, 114, 128);

      doc.setFont("helvetica", "bold");
      doc.text(task.status, 175, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);

      y += 8;
    });

    // Save report
    doc.save(`DutySync_ComplianceReport_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedPerson('all');
    setSelectedDepartment('all');
    setSelectedPriority('all');
    setSelectedStatus('all');
    setSelectedDateFilter('all');
  };

  return (
    <div className="space-y-6" id="reports-module">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
            <TrendingUp className="w-4.5 h-4.5 text-indigo-500" />
            Duty Compliance & Reports
          </h3>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
            Examine and export full activity tables, compliance analytics, and task completion audits.
          </p>
        </div>

        {/* Exports Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportPDF}
            disabled={filteredTasks.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 text-[10px] font-mono font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF Export</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={filteredTasks.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 text-[10px] font-mono font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel Export</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredTasks.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400 text-[10px] font-mono font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV Export</span>
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className={`p-6 rounded-2xl border ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          
          {/* Search Box */}
          <div className="md:col-span-2">
            <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-zinc-500 mb-1.5">Search Duties</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search title, details, remarks..."
                className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                  isDark ? 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-500' : 'bg-slate-50 border-slate-200 text-zinc-900 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          {/* Person Filter */}
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-zinc-500 mb-1.5">Assigned Person</label>
            <select
              value={selectedPerson}
              onChange={(e) => setSelectedPerson(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-zinc-900'
              }`}
            >
              <option value="all">All Personnel</option>
              {users.filter(u => u.role === 'person').map(u => (
                <option key={u.uid} value={u.uid}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-zinc-500 mb-1.5">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-zinc-900'
              }`}
            >
              {departments.map(dept => (
                <option key={dept} value={dept === 'all' ? 'all' : dept}>
                  {dept === 'all' ? 'All Departments' : dept}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-zinc-500 mb-1.5">Priority</label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-zinc-900'
              }`}
            >
              {priorities.map(prio => (
                <option key={prio} value={prio}>
                  {prio === 'all' ? 'All Priorities' : prio.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-zinc-500 mb-1.5">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-zinc-900'
              }`}
            >
              {statuses.map(st => (
                <option key={st} value={st}>
                  {st === 'all' ? 'All Statuses' : st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Filter Quick Options */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-5 pt-4 border-t border-slate-100 dark:border-zinc-800/50">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-zinc-500">Date Filter:</span>
            <div className={`flex items-center gap-1 p-1 rounded-lg ${isDark ? 'bg-zinc-950' : 'bg-slate-100'}`}>
              {['all', 'today', 'week', 'month'].map((range) => (
                <button
                  key={range}
                  onClick={() => setSelectedDateFilter(range)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono capitalize transition-all cursor-pointer ${
                    selectedDateFilter === range 
                      ? 'bg-indigo-600 text-white shadow-xs font-bold' 
                      : isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={resetFilters}
            className={`flex items-center gap-1 text-[10px] font-mono hover:underline font-bold transition-all cursor-pointer ${
              isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <RefreshCw className="w-3 h-3" />
            Reset Filters
          </button>
        </div>
      </div>

      {/* Tabular data representation */}
      <div className={`overflow-x-auto rounded-2xl border ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className={`border-b font-mono text-[10px] uppercase tracking-wider ${
              isDark ? 'bg-zinc-900/60 border-zinc-800 text-zinc-500' : 'bg-slate-50 border-slate-100 text-slate-500'
            }`}>
              <th className="p-4 font-bold">Duty / Task</th>
              <th className="p-4 font-bold">Assigned Person</th>
              <th className="p-4 font-bold">Department</th>
              <th className="p-4 font-bold">Priority</th>
              <th className="p-4 font-bold">Due DateTime</th>
              <th className="p-4 font-bold text-center">Status</th>
              <th className="p-4 font-bold">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/40">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-500 font-sans">
                  No duties matched your exact filter parameters.
                </td>
              </tr>
            ) : (
              filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-slate-500/5 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-sm text-slate-900 dark:text-white">{task.title}</div>
                    <div className={`text-[11px] line-clamp-1 mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{task.description}</div>
                  </td>
                  <td className="p-4 font-sans font-medium text-slate-700 dark:text-zinc-300">{task.assignedToName}</td>
                  <td className="p-4 font-sans">
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-mono dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400">
                      {task.department}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                      task.priority === 'high' 
                        ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' 
                        : task.priority === 'medium'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20'
                    }`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-[11px]">
                    <div className="font-bold text-slate-800 dark:text-zinc-300">{task.dueDate}</div>
                    <div className="text-slate-400 dark:text-zinc-500 mt-0.5">{task.dueTime || '12:00'}</div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider font-bold border ${
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
                  <td className={`p-4 max-w-xs truncate ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    {task.remarks || <span className="text-slate-400 dark:text-zinc-500 italic">No remarks submitted</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
