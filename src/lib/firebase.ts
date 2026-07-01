import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  deleteDoc,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { Task, AppUser, Notification } from '../types';

// Web App Firebase Configuration (from firebase-applet-config.json)
const firebaseConfig = {
  apiKey: "AIzaSyC_9rl_7btg6GpYCy8UzuqDxMrR9nmgIrc",
  authDomain: "dutysync-keshav-2026.firebaseapp.com",
  projectId: "dutysync-keshav-2026",
  storageBucket: "dutysync-keshav-2026.firebasestorage.app",
  messagingSenderId: "278517967230",
  appId: "1:278517967230:web:21e8112cc0a97fb8c72b2f"
};
// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with settings to avoid potential tab-sync issues and connect to the custom database
// Initialize Firestore for your own Firebase project
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Default Seed Data - Emptied for real-world production testing
const DEFAULT_USERS: AppUser[] = [];
const DEFAULT_TASKS: Task[] = [];
const DEFAULT_NOTIFICATIONS: Notification[] = [];

// Helper to manage localStorage fallback state
const getLocal = <T>(key: string, def: T): T => {
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : def;
};

const setLocal = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Seed Local Storage
const initLocalState = () => {
  if (!localStorage.getItem('duty_users')) setLocal('duty_users', DEFAULT_USERS);
  if (!localStorage.getItem('duty_tasks')) setLocal('duty_tasks', DEFAULT_TASKS);
  if (!localStorage.getItem('duty_notifications')) setLocal('duty_notifications', DEFAULT_NOTIFICATIONS);
};

initLocalState();

// Firestore & Memory Unified Data Service
export const dbService = {
  // Sync memory/local structures with Firestore for standard users, tasks, etc.
  async seedFirestore() {
    // Empty placeholder to prevent seeding demo data during live tests
    console.log("No seed execution - live testing mode active.");
  },

  // Users
  async getUsers(): Promise<AppUser[]> {
    try {
      const q = await getDocs(collection(db, "users"));
      if (!q.empty) {
        const list: AppUser[] = [];
        q.forEach(d => list.push(d.data() as AppUser));
        setLocal('duty_users', list);
        return list;
      }
    } catch (e) {
      console.warn("Firestore getUsers failed, using local fallback", e);
    }
    return getLocal<AppUser[]>('duty_users', DEFAULT_USERS);
  },

  async saveUser(user: AppUser): Promise<void> {
    try {
      await setDoc(doc(db, "users", user.uid), user);
    } catch (e) {
      console.warn("Firestore saveUser failed, saving locally", e);
    }
    const current = getLocal<AppUser[]>('duty_users', DEFAULT_USERS);
    const index = current.findIndex(u => u.uid === user.uid);
    if (index >= 0) current[index] = user;
    else current.push(user);
    setLocal('duty_users', current);
  },

  async getUser(uid: string): Promise<AppUser | null> {
    try {
      const d = await getDoc(doc(db, "users", uid));
      if (d.exists()) {
        return d.data() as AppUser;
      }
    } catch (e) {
      console.warn("Firestore getUser failed, using local fallback", e);
    }
    const current = getLocal<AppUser[]>('duty_users', DEFAULT_USERS);
    return current.find(u => u.uid === uid) || null;
  },

  // Tasks
  async getTasks(): Promise<Task[]> {
    try {
      const q = await getDocs(collection(db, "tasks"));
      const list: Task[] = [];
      q.forEach(d => list.push(d.data() as Task));
      if (list.length > 0) {
        // Also run a deadline checker before returning
        const updated = this.checkAndProcessDeadlines(list);
        setLocal('duty_tasks', updated);
        return updated;
      }
    } catch (e) {
      console.warn("Firestore getTasks failed, using local fallback", e);
    }
    const localTasks = getLocal<Task[]>('duty_tasks', DEFAULT_TASKS);
    return this.checkAndProcessDeadlines(localTasks);
  },

  checkAndProcessDeadlines(tasks: Task[]): Task[] {
    let changed = false;
    const now = new Date();
    
    const updated = tasks.map(t => {
      if (t.status === 'Pending') {
        // Parse due date and due time
        const dueDateTime = new Date(`${t.dueDate}T${t.dueTime || '23:59'}:00`);
        if (dueDateTime < now) {
          changed = true;
          return { ...t, status: 'Incomplete' as const };
        }
      }
      return t;
    });

    if (changed) {
      setLocal('duty_tasks', updated);
      // Try to update Firestore in background
      updated.forEach(async t => {
        if (t.status === 'Incomplete') {
          try {
            await updateDoc(doc(db, "tasks", t.id), { status: "Incomplete" });
            // Add a notification for admin
            await this.addNotification({
              id: `notif-inc-${t.id}`,
              sender: "System",
              receiver: t.assignedBy,
              message: `${t.assignedToName} missed the deadline for '${t.title}'. Status auto-updated to Incomplete.`,
              type: "status_change",
              createdAt: new Date().toISOString(),
              read: false,
              taskId: t.id
            });
          } catch (e) {
            // Ignore background error
          }
        }
      });
    }

    return updated;
  },

  async saveTask(task: Task): Promise<void> {
    try {
      await setDoc(doc(db, "tasks", task.id), task);
    } catch (e) {
      console.warn("Firestore saveTask failed, saving locally", e);
    }
    const current = getLocal<Task[]>('duty_tasks', DEFAULT_TASKS);
    const index = current.findIndex(t => t.id === task.id);
    if (index >= 0) current[index] = task;
    else current.push(task);
    setLocal('duty_tasks', current);
  },

  async deleteTask(taskId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "tasks", taskId));
    } catch (e) {
      console.warn("Firestore deleteTask failed, deleting locally", e);
    }
    const current = getLocal<Task[]>('duty_tasks', DEFAULT_TASKS);
    const filtered = current.filter(t => t.id !== taskId);
    setLocal('duty_tasks', filtered);
  },

  // Notifications
  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      const q = await getDocs(collection(db, "notifications"));
      const list: Notification[] = [];
      q.forEach(d => {
        const n = d.data() as Notification;
        if (n.receiver === userId || n.receiver === 'all') {
          list.push(n);
        }
      });
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e) {
      console.warn("Firestore getNotifications failed, using local", e);
    }
    const local = getLocal<Notification[]>('duty_notifications', DEFAULT_NOTIFICATIONS);
    return local
      .filter(n => n.receiver === userId || n.receiver === 'all')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async addNotification(notif: Notification): Promise<void> {
    try {
      await setDoc(doc(db, "notifications", notif.id), notif);
    } catch (e) {
      console.warn("Firestore addNotification failed, adding locally", e);
    }
    const current = getLocal<Notification[]>('duty_notifications', DEFAULT_NOTIFICATIONS);
    current.push(notif);
    setLocal('duty_notifications', current);
  },

  async markNotificationRead(notifId: string): Promise<void> {
    try {
      await updateDoc(doc(db, "notifications", notifId), { read: true });
    } catch (e) {
      console.warn("Firestore markNotificationRead failed, updating locally", e);
    }
    const current = getLocal<Notification[]>('duty_notifications', DEFAULT_NOTIFICATIONS);
    const index = current.findIndex(n => n.id === notifId);
    if (index >= 0) {
      current[index].read = true;
      setLocal('duty_notifications', current);
    }
  }
};

// Run seed on load
dbService.seedFirestore();

export { auth, db };
