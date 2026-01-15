import { useState, useEffect } from "react";
import { UserPlus, UserMinus, Bell, Search, Loader2, Users, MapPin, Clock, BellRing } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { trackingApi, usersApi, User, TrackedUser } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useWebPush } from "../services/webPushService";

interface UserTrackingProps {
  onNotification?: (message: string) => void;
}

export function UserTracking({ onNotification }: UserTrackingProps) {
  const { user: currentUser } = useAuth();
  const { permission, isSupported, requestPermission } = useWebPush();
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [trackedUsers, setTrackedUsers] = useState<TrackedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all users
      const usersResponse = await usersApi.getAll();
      setAllUsers(usersResponse.data?.users || []);

      // Fetch tracked users
      const trackedResponse = await trackingApi.getTrackedUsers();
      setTrackedUsers(trackedResponse.data?.trackedUsers || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackUser = async (userId: string) => {
    try {
      setActionLoading(userId);
      const response = await trackingApi.trackUser(userId);
      if (response.success) {
        // Refresh tracked users list
        const trackedResponse = await trackingApi.getTrackedUsers();
        setTrackedUsers(trackedResponse.data?.trackedUsers || []);
        onNotification?.(`Now tracking user`);
      }
    } catch (err) {
      console.error("Failed to track user:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUntrackUser = async (userId: string) => {
    try {
      setActionLoading(userId);
      const response = await trackingApi.untrackUser(userId);
      if (response.success) {
        setTrackedUsers(trackedUsers.filter((u: TrackedUser) => u.trackedUserId !== userId));
        onNotification?.(`Stopped tracking user`);
      }
    } catch (err) {
      console.error("Failed to untrack user:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const isTracking = (userId: string) => {
    return trackedUsers.some((t: TrackedUser) => t.trackedUserId === userId);
  };

  // Filter users excluding current user
  const availableUsers = allUsers.filter((u: User) =>
    u.id !== currentUser?.id &&
    (u.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-6 h-6" />
                User Tracking
              </CardTitle>
              <CardDescription>
                Track team members to receive notifications when they check in
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{trackedUsers.length}</p>
                <p className="text-sm text-gray-500">Users You're Tracking</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{allUsers.length - 1}</p>
                <p className="text-sm text-gray-500">Available to Track</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Currently Tracking */}
      {trackedUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Currently Tracking</CardTitle>
            <CardDescription>
              You'll receive notifications when these users check in
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trackedUsers.map((tracked: TrackedUser) => (
                <div
                  key={tracked.id}
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                      {tracked.trackedUserName
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{tracked.trackedUserName}</p>
                      <p className="text-sm text-gray-500">{tracked.trackedUserEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-white">
                      {tracked.trackedUserDepartment}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleUntrackUser(tracked.trackedUserId)}
                      disabled={actionLoading === tracked.trackedUserId}
                    >
                      {actionLoading === tracked.trackedUserId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserMinus className="w-4 h-4 mr-1" />
                          Untrack
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team Members</CardTitle>
          <CardDescription>
            Select team members to track their check-in activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* User List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {availableUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No users found</p>
              </div>
            ) : (
              availableUsers.map((user) => {
                const tracking = isTracking(user.id);
                return (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${tracking
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white border-gray-200 hover:border-gray-300"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${tracking ? "bg-blue-500" : "bg-gray-400"
                          }`}
                      >
                        {`${user.firstName[0]}${user.lastName[0]}`.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{user.department}</Badge>
                      {tracking ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleUntrackUser(user.id)}
                          disabled={actionLoading === user.id}
                        >
                          {actionLoading === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <UserMinus className="w-4 h-4 mr-1" />
                              Untrack
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleTrackUser(user.id)}
                          disabled={actionLoading === user.id}
                        >
                          {actionLoading === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 mr-1" />
                              Track
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900 mb-1">How Tracking Works</h3>
              <p className="text-sm text-blue-700">
                When you track a team member, you'll receive a notification in the Notification Center
                whenever they check in to a location. The notification includes their location and
                check-in time, helping you stay informed about your team's whereabouts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Push Notification Setup Card */}
      {isSupported && (
        <Card className={`border ${permission === 'granted' ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${permission === 'granted' ? 'bg-green-100' : 'bg-orange-100'
                }`}>
                <BellRing className={`w-5 h-5 ${permission === 'granted' ? 'text-green-600' : 'text-orange-600'}`} />
              </div>
              <div className="flex-1">
                <h3 className={`font-medium mb-1 ${permission === 'granted' ? 'text-green-900' : 'text-orange-900'}`}>
                  {permission === 'granted' ? 'Browser Notifications Enabled' : 'Enable Browser Notifications'}
                </h3>
                <p className={`text-sm mb-3 ${permission === 'granted' ? 'text-green-700' : 'text-orange-700'}`}>
                  {permission === 'granted'
                    ? "You'll receive Chrome notifications when tracked users check in, even if this tab isn't in focus."
                    : "Enable browser notifications to receive instant alerts when tracked team members check in."}
                </p>
                {permission !== 'granted' && permission !== 'denied' && (
                  <Button
                    onClick={() => requestPermission()}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                    size="sm"
                  >
                    <BellRing className="w-4 h-4 mr-2" />
                    Enable Notifications
                  </Button>
                )}
                {permission === 'denied' && (
                  <p className="text-sm text-red-600">
                    Notifications are blocked. Please enable them in your browser settings.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
