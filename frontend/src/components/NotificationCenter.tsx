import { useState, useEffect } from "react";
import { Bell, AlertCircle, Calendar, Package, CheckCircle, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { notificationsApi } from "../services/api";

interface Notification {
  id: number;
  message: string;
  type: "urgent" | "meeting" | "shipping" | "info" | "success";
  read: boolean;
  timestamp?: Date;
}

interface NotificationCenterProps {
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
}

export function NotificationCenter({ notifications, setNotifications }: NotificationCenterProps) {
  const [loading, setLoading] = useState(false);

  // Check if notification ID is from database (UUID) vs locally generated (number)
  const isDbNotification = (id: number | string) => {
    return typeof id === 'string' && id.includes('-');
  };

  const handleMarkAsRead = async (notificationId: number) => {
    // Optimistic update
    setNotifications(
      notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );

    // Only call API for database notifications (UUIDs)
    if (isDbNotification(notificationId as any)) {
      try {
        await notificationsApi.markAsRead(String(notificationId));
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
        // Revert on error
        setNotifications(
          notifications.map(n =>
            n.id === notificationId ? { ...n, read: false } : n
          )
        );
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    const previousNotifications = [...notifications];
    // Optimistic update
    setNotifications(notifications.map(n => ({ ...n, read: true })));

    // Only call API if there are database notifications
    const hasDbNotifications = notifications.some(n => isDbNotification(n.id as any));
    if (hasDbNotifications) {
      try {
        await notificationsApi.markAllAsRead();
      } catch (err) {
        console.error("Failed to mark all as read:", err);
        // Revert on error
        setNotifications(previousNotifications);
      }
    }
  };

  const handleDeleteNotification = (notificationId: number) => {
    setNotifications(notifications.filter(n => n.id !== notificationId));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "urgent":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "meeting":
        return <Calendar className="w-5 h-5 text-blue-500" />;
      case "shipping":
        return <Package className="w-5 h-5 text-green-500" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "urgent":
        return "border-l-4 border-l-red-500 bg-red-50";
      case "meeting":
        return "border-l-4 border-l-blue-500 bg-blue-50";
      case "shipping":
        return "border-l-4 border-l-green-500 bg-green-50";
      case "success":
        return "border-l-4 border-l-green-500 bg-green-50";
      default:
        return "border-l-4 border-l-gray-500 bg-gray-50";
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-6 h-6" />
                Notifications & Reminders
              </CardTitle>
              <CardDescription>
                Automated alerts for tasks, meetings, and equipment deliveries
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {unreadNotifications.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                  Mark All as Read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleClearAll}>
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Urgent</p>
                <p className="text-2xl text-gray-900">
                  {notifications.filter(n => n.type === "urgent").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Meetings</p>
                <p className="text-2xl text-gray-900">
                  {notifications.filter(n => n.type === "meeting").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Deliveries</p>
                <p className="text-2xl text-gray-900">
                  {notifications.filter(n => n.type === "shipping").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Unread</p>
                <p className="text-2xl text-gray-900">{unreadNotifications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unread Notifications */}
      {unreadNotifications.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Unread Notifications</CardTitle>
              <Badge className="bg-red-500 text-white">{unreadNotifications.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unreadNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg ${getNotificationColor(notification.type)} transition-all`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1">
                        <p className="text-gray-900">{notification.message}</p>
                        {notification.timestamp && (
                          <p className="text-xs text-gray-600 mt-1">
                            {notification.timestamp.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        Mark Read
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteNotification(notification.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Read Notifications */}
      {readNotifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Read Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {readNotifications.map(notification => (
                <div
                  key={notification.id}
                  className="p-4 rounded-lg bg-gray-50 border border-gray-200 opacity-60"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1">
                        <p className="text-gray-700">{notification.message}</p>
                        {notification.timestamp && (
                          <p className="text-xs text-gray-500 mt-1">
                            {notification.timestamp.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteNotification(notification.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {notifications.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No notifications at the moment</p>
            <p className="text-sm text-gray-400 mt-1">
              You'll receive automated alerts for tasks, meetings, and deliveries
            </p>
          </CardContent>
        </Card>
      )}

      {/* Notification Settings Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Automated Reminder System</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>✓ Urgent tasks are automatically highlighted 2 hours before deadline</p>
            <p>✓ Meeting reminders sent 30 minutes before scheduled time</p>
            <p>✓ Equipment delivery notifications on day of expected arrival</p>
            <p>✓ Location updates trigger availability notifications to team members</p>
            <p>✓ Equipment booking conflicts generate instant warnings</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
