import { useState, useEffect } from "react";
import { Calendar, CheckSquare, Package, MapPin, BookOpen, Bell, LogOut, User } from "lucide-react";
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
import { notificationsApi } from "./services/api";

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
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 1, message: "Urgent task: Server Migration due in 2 hours", type: "urgent", read: false },
    { id: 2, message: "Equipment booking: Oscilloscope available tomorrow", type: "info", read: false },
    { id: 3, message: "Meeting in 30 minutes: Client Sync", type: "meeting", read: false },
  ]);

  // Fetch notifications from API when authenticated
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!isAuthenticated) return;

      try {
        const data = await notificationsApi.getNotifications();
        if (data && data.length > 0) {
          setNotifications(data.map((n: any) => ({
            id: n.id,
            message: n.message || n.title,
            type: n.type || "info",
            read: n.read || n.is_read || false,
            timestamp: n.created_at ? new Date(n.created_at) : undefined,
          })));
        }
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
        // Keep default mock data
      }
    };

    fetchNotifications();
  }, [isAuthenticated]);

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: Calendar },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
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
          {activeTab === "dashboard" && <TeamDashboard />}
          {activeTab === "tasks" && <TaskManagement />}
          {activeTab === "equipment" && <EquipmentBooking />}
          {activeTab === "location" && <LocationTracker />}
          {activeTab === "glossary" && <Glossary />}
          {activeTab === "notifications" && (
            <NotificationCenter
              notifications={notifications}
              setNotifications={setNotifications}
            />
          )}
        </div>
      </div>
    </div>
  );
}