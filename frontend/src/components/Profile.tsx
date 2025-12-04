import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Building2,
  Shield,
  Calendar,
  Clock,
  Save,
  X,
  Edit,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { usersApi, User as UserType } from "../services/api";

interface ProfileProps {
  user: UserType | null;
  onUserUpdate: (user: UserType) => void;
  onBack: () => void;
}

export function Profile({ user, onUserUpdate, onBack }: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    department: user?.department || "",
  });

  // Refresh user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const response = await usersApi.getMe();
        if (response.success && response.data?.user) {
          const userData = response.data.user;
          setFormData({
            firstName: userData.firstName,
            lastName: userData.lastName,
            department: userData.department,
          });
          onUserUpdate(userData);
        }
      } catch (err) {
        console.error("Failed to fetch user data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleSave = async () => {
    if (!formData.firstName || !formData.lastName) {
      setMessage({ type: "error", text: "First name and last name are required" });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const response = await usersApi.updateMe({
        firstName: formData.firstName,
        lastName: formData.lastName,
        department: formData.department,
      });

      if (response.success && response.data?.user) {
        onUserUpdate(response.data.user);
        setMessage({ type: "success", text: "Profile updated successfully!" });
        setIsEditing(false);
      } else {
        setMessage({ type: "error", text: "Failed to update profile" });
      }
    } catch (err) {
      console.error("Failed to update profile:", err);
      setMessage({ type: "error", text: "Failed to update profile. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      department: user?.department || "",
    });
    setIsEditing(false);
    setMessage(null);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "bg-purple-100 text-purple-700";
      case "manager":
        return "bg-blue-100 text-blue-700";
      case "member":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl text-gray-900 mb-1">My Profile</h1>
          <p className="text-sm text-gray-600">View and manage your account information</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <X className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg mb-6 ${message.type === "success"
            ? "bg-green-50 border border-green-200 text-green-800"
            : "bg-red-50 border border-red-200 text-red-800"
            }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="text-center">
              {/* Avatar */}
              <div
                style={{ width: "96px", height: "96px", borderRadius: "50%" }}
                className="bg-blue-100 flex items-center justify-center mx-auto mb-4"
              >
                <span className="text-3xl font-semibold text-blue-600">
                  {formData.firstName?.charAt(0)}
                  {formData.lastName?.charAt(0)}
                </span>
              </div>

              {/* Name */}
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                {formData.firstName} {formData.lastName}
              </h2>

              {/* Role Badge */}
              <Badge className={`${getRoleBadgeColor(user?.role || "")} mb-4`}>
                {user?.role || "Member"}
              </Badge>

              {/* Department */}
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <Building2 className="w-4 h-4" />
                <span className="text-sm">{formData.department || "No department"}</span>
              </div>
            </div>

            <div className="border-t border-gray-200 mt-6 pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm text-gray-900">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Member Since</p>
                  <p className="text-sm text-gray-900">{formatDate(user?.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Last Login</p>
                  <p className="text-sm text-gray-900">{formatDateTime(user?.lastLogin)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Account Status</p>
                  <Badge className={user?.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                    {user?.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </div>
              {!isEditing && (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="mt-1 bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email address cannot be changed
                </p>
              </div>

              <div>
                <Label htmlFor="department">Department</Label>
                {isEditing ? (
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                  >
                    <SelectTrigger id="department" className="mt-1">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IT">IT</SelectItem>
                      <SelectItem value="Engineering">Engineering</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Management">Management</SelectItem>
                      <SelectItem value="Support">Support</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="department"
                    value={formData.department}
                    disabled
                    className="mt-1"
                  />
                )}
              </div>

              <div>
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={user?.role || ""}
                  disabled
                  className="mt-1 bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Role can only be changed by an administrator
                </p>
              </div>

              {isEditing && (
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={saving}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
