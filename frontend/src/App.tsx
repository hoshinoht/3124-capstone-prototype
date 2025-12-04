import { useState, useEffect } from "react";
import { Calendar, CheckSquare, Package, MapPin, BookOpen, Bell, LogOut, User, Users, FolderKanban } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import { TeamDashboard } from "./components/TeamDashboard";
import { DashboardCalendar } from "./components/DashboardCalendar";
import { TaskManagement } from "./components/TaskManagement";
import { EquipmentBooking } from "./components/EquipmentBooking";
import { LocationTracker } from "./components/LocationTracker";
import { QuickLinks } from "./components/QuickLinks";
import { Glossary } from "./components/Glossary";
import { NotificationCenter } from "./components/NotificationCenter";
import { Personnel } from "./components/Personnel";
import { Projects } from "./components/Projects";
import { tasksApi, eventsApi, equipmentApi } from "./services/api";

interface Notification {
  id: number;
  message: string;
  type: "urgent" | "meeting" | "shipping" | "info" | "success";
  read: boolean;
  timestamp?: Date;
}

export default function App() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [authView, setAuthView] = useState<"login" | "register">("login");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());

  // Generate notifications from tasks and events
  useEffect(() => {
    const generateNotifications = async () => {
      if (!isAuthenticated) return;

      const generatedNotifications: Notification[] = [];
      let notificationId = 1;

      try {
        // Fetch urgent/upcoming tasks
        const tasksResponse = await tasksApi.getAll({ isCompleted: false });
        if (tasksResponse.data?.tasks) {
          const now = new Date();

          tasksResponse.data.tasks.forEach((task: any) => {
            const deadline = new Date(task.deadline);
            const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
            const taskKey = `task-${task.id}`;

            // Skip dismissed notifications
            if (dismissedNotifications.has(taskKey)) return;

            // Urgent tasks or tasks due within 24 hours
            if (task.urgency === 'urgent' || hoursUntilDeadline <= 24) {
              let message = "";
              if (hoursUntilDeadline <= 2 && hoursUntilDeadline > 0) {
                message = `Urgent task: ${task.title} due in ${Math.round(hoursUntilDeadline * 60)} minutes`;
              } else if (hoursUntilDeadline <= 24 && hoursUntilDeadline > 0) {
                message = `Task deadline: ${task.title} due in ${Math.round(hoursUntilDeadline)} hours`;
              } else if (hoursUntilDeadline <= 0) {
                message = `Overdue task: ${task.title} was due ${Math.abs(Math.round(hoursUntilDeadline))} hours ago`;
              } else if (task.urgency === 'urgent') {
                message = `Urgent task: ${task.title} - ${task.description || 'No description'}`;
              }

              if (message) {
                generatedNotifications.push({
                  id: notificationId++,
                  message,
                  type: "urgent",
                  read: false,
                  timestamp: new Date(task.createdAt || task.created_at || now),
                });
              }
            }
          });
        }
      } catch (err) {
        console.error("Failed to fetch tasks for notifications:", err);
      }

      try {
        // Fetch upcoming events/meetings
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        const eventsResponse = await eventsApi.getAll({
          startDate: today.toISOString().split('T')[0],
          endDate: nextWeek.toISOString().split('T')[0],
        });

        if (eventsResponse.data?.events) {
          const now = new Date();

          eventsResponse.data.events.forEach((event: any) => {
            const eventDate = new Date(`${event.eventDate || event.event_date}T${event.startTime || event.start_time}`);
            const minutesUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60);
            const eventKey = `event-${event.id}`;

            // Skip dismissed notifications
            if (dismissedNotifications.has(eventKey)) return;

            // Events within the next 2 hours
            if (minutesUntilEvent > 0 && minutesUntilEvent <= 120) {
              const message = minutesUntilEvent <= 60
                ? `Meeting in ${Math.round(minutesUntilEvent)} minutes: ${event.title}`
                : `Upcoming meeting: ${event.title} at ${event.startTime || event.start_time}`;

              generatedNotifications.push({
                id: notificationId++,
                message,
                type: "meeting",
                read: false,
                timestamp: new Date(event.createdAt || event.created_at || now),
              });
            }
          });
        }
      } catch (err) {
        console.error("Failed to fetch events for notifications:", err);
      }

      try {
        // Fetch equipment bookings
        const bookingsResponse = await equipmentApi.getMyBookings();
        if (bookingsResponse.data?.bookings) {
          const now = new Date();
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);

          bookingsResponse.data.bookings.forEach((booking: any) => {
            const startDate = new Date(booking.startDate || booking.start_date);
            const bookingKey = `booking-${booking.id}`;

            // Skip dismissed notifications
            if (dismissedNotifications.has(bookingKey)) return;

            // Bookings starting tomorrow or today
            if (startDate.toDateString() === tomorrow.toDateString()) {
              generatedNotifications.push({
                id: notificationId++,
                message: `Equipment booking: ${booking.equipmentName || booking.equipment_name || 'Equipment'} available tomorrow`,
                type: "info",
                read: false,
                timestamp: new Date(booking.createdAt || booking.created_at || now),
              });
            } else if (startDate.toDateString() === now.toDateString()) {
              generatedNotifications.push({
                id: notificationId++,
                message: `Equipment ready: ${booking.equipmentName || booking.equipment_name || 'Equipment'} booking starts today`,
                type: "shipping",
                read: false,
                timestamp: new Date(booking.createdAt || booking.created_at || now),
              });
            }
          });
        }
      } catch (err) {
        console.error("Failed to fetch bookings for notifications:", err);
      }

      setNotifications(generatedNotifications);
    };

    generateNotifications();

    // Refresh notifications every 5 minutes
    const interval = setInterval(generateNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, dismissedNotifications]);

  // Handle notification updates (marking as read, dismissing)
  const handleSetNotifications = (newNotifications: Notification[]) => {
    // Track dismissed notifications (ones that were deleted)
    const currentIds = new Set(notifications.map(n => n.id));
    const newIds = new Set(newNotifications.map(n => n.id));

    currentIds.forEach(id => {
      if (!newIds.has(id)) {
        // This notification was removed, track it
        const notification = notifications.find(n => n.id === id);
        if (notification) {
          // Create a key based on the message to prevent regeneration
          const key = notification.message.includes('task:') ? `task-dismissed-${id}` :
            notification.message.includes('Meeting') ? `event-dismissed-${id}` :
              `booking-dismissed-${id}`;
          setDismissedNotifications(prev => new Set([...prev, key]));
        }
      }
    });

    setNotifications(newNotifications);
  };

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: Calendar },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "projects", label: "Projects", icon: FolderKanban },
    { id: "personnel", label: "Personnel", icon: Users },
    { id: "equipment", label: "Equipment", icon: Package },
    { id: "location", label: "Location", icon: MapPin },
    { id: "glossary", label: "Glossary", icon: BookOpen },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-7 h-7 text-white animate-pulse" />
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login/register
  if (!isAuthenticated) {
    if (authView === "login") {
      return <Login onSwitchToRegister={() => setAuthView("register")} />;
    }
    return <Register onSwitchToLogin={() => setAuthView("login")} />;
  }

  // Authenticated - show main app
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-gray-900">IT-Engineering Collaboration Hub</h1>
                <p className="text-sm text-gray-500">Streamlined coordination & communication</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* User info */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                  {user?.role}
                </span>
              </div>

              {/* Notifications */}
              <button
                onClick={() => setActiveTab("notifications")}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Bell className="w-6 h-6 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Logout */}
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-2">
          <nav className="flex flex-wrap gap-2">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${activeTab === item.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
                  }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {activeTab === "dashboard" && <TeamDashboard onNavigate={setActiveTab} />}
          {activeTab === "tasks" && <TaskManagement />}
          {activeTab === "projects" && <Projects />}
          {activeTab === "personnel" && <Personnel />}
          {activeTab === "equipment" && <EquipmentBooking />}
          {activeTab === "location" && <LocationTracker />}
          {activeTab === "glossary" && <Glossary />}
          {activeTab === "notifications" && (
            <NotificationCenter
              notifications={notifications}
              setNotifications={handleSetNotifications}
            />
          )}
        </div>
      </div>
    </div>
  );
}