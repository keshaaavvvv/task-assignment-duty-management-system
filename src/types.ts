export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'person';
  department: string;
}

export interface AiReport {
  pros: string[];
  cons: string[];
  recommendations: string[];
  generatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // User UID
  assignedToName: string; // User Name
  assignedBy: string; // Admin UID
  priority: 'high' | 'medium' | 'low';
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:MM
  status: 'Pending' | 'Completed' | 'Not Completed' | 'Incomplete';
  remarks?: string;
  department: string;
  createdAt: string;
  aiReport?: AiReport;
}

export interface Notification {
  id: string;
  sender: string; // Name or "System"
  receiver: string; // User UID or "all" for announcement
  message: string;
  type: 'reminder' | 'alert' | 'status_change';
  createdAt: string;
  read: boolean;
  taskId?: string;
}
