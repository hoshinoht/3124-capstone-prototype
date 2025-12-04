import { useState, useEffect } from "react";
import { Download, MapPin, Building, Factory, Search, Loader2, Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { locationsApi } from "../services/api";

interface PersonnelRecord {
  id: number;
  name: string;
  role: string;
  location: string;
  checkIn: string;
  checkOut: string | null;
  hours: number;
  method: string;
  status: "Active" | "Completed";
  avatar: string;
  locationIcon: "client" | "corporate" | "manufacturing" | "distribution";
}

export function Personnel() {
  const [loading, setLoading] = useState(true);
  const [personnelRecords, setPersonnelRecords] = useState<PersonnelRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [siteFilter, setSiteFilter] = useState("All Sites");
  const [statusFilter, setStatusFilter] = useState("All Status");

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch today's check-in records (both active and completed)
        try {
          const response = await locationsApi.getTodayRecords();
          console.log("Today records response:", response);

          const records = response.data?.records || [];

          if (records.length > 0) {
            setPersonnelRecords(records.map((l: any) => {
              // Calculate hours worked
              const checkInTime = new Date(l.checkInTime || l.check_in_time);
              const checkOutTime = l.checkOutTime || l.check_out_time ? new Date(l.checkOutTime || l.check_out_time) : new Date();
              const hoursWorked = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

              return {
                id: l.id || l.userId || l.user_id,
                name: l.userName || l.user_name || "Unknown",
                role: l.department || l.role || "Staff",
                location: l.location || "Unknown",
                checkIn: new Date(l.checkInTime || l.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                checkOut: (l.checkOutTime || l.check_out_time) ? new Date(l.checkOutTime || l.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
                hours: Math.round(hoursWorked * 10) / 10,
                method: "Mobile",
                status: (l.status === "active" || !(l.checkOutTime || l.check_out_time)) ? "Active" as const : "Completed" as const,
                avatar: ((l.userName || l.user_name || "UN").split(" ").map((n: string) => n[0]).join("").toUpperCase()),
                locationIcon: "client" as const,
              };
            }));
          }
        } catch (err) {
          console.error("Failed to fetch today's records:", err);
        }

      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredPersonnel = personnelRecords.filter((person) => {
    const matchesSearch = person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSite = siteFilter === "All Sites" || person.location.includes(siteFilter);
    const matchesStatus = statusFilter === "All Status" || person.status === statusFilter;
    return matchesSearch && matchesSite && matchesStatus;
  });

  const activePersonnel = personnelRecords.filter(p => p.status === "Active").length;
  const totalHours = personnelRecords.filter(p => p.status === "Active").reduce((sum, p) => sum + p.hours, 0);
  const avgHours = activePersonnel > 0 ? (totalHours / activePersonnel).toFixed(1) : "0";

  const getLocationIcon = (type: string) => {
    switch (type) {
      case "client":
        return <Building className="w-4 h-4 text-orange-600" />;
      case "corporate":
        return <Building className="w-4 h-4 text-blue-600" />;
      case "manufacturing":
        return <Factory className="w-4 h-4 text-gray-600" />;
      case "distribution":
        return <MapPin className="w-4 h-4 text-green-600" />;
      default:
        return <MapPin className="w-4 h-4 text-gray-600" />;
    }
  };

  const getAvatarColor = (avatar: string) => {
    const colors = [
      "bg-purple-500",
      "bg-pink-500",
      "bg-green-500",
      "bg-orange-500",
      "bg-blue-500",
      "bg-rose-500",
    ];
    const index = avatar.charCodeAt(0) % colors.length;
    return colors[index];
  };

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
                <Users className="w-6 h-6" />
                Personnel Location Tracker
              </CardTitle>
              <CardDescription>
                Real-time visibility of team member locations and work hours
              </CardDescription>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-green-50 border-green-200">
          <p className="text-sm text-green-800 mb-1">Clocked In</p>
          <p className="text-3xl text-green-900">{activePersonnel}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-600 mb-1">Total Hours</p>
          <p className="text-3xl text-gray-900">{totalHours.toFixed(1)}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-600 mb-1">Average Hours</p>
          <p className="text-3xl text-gray-900">{avgHours}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Sites">All Sites</SelectItem>
              <SelectItem value="Client Site">Client Site</SelectItem>
              <SelectItem value="Corporate">Corporate Headquarters</SelectItem>
              <SelectItem value="Manufacturing">Manufacturing Plant</SelectItem>
              <SelectItem value="Distribution">Distribution Center</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Status">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Personnel List */}
      <Card className="p-6">
        <div className="space-y-3">
          {filteredPersonnel.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No personnel records found</p>
              <p className="text-sm text-gray-400 mt-1">
                Personnel location data will appear here once team members check in
              </p>
            </div>
          ) : (
            filteredPersonnel.map((person) => (
              <div
                key={person.id}
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className={`w-10 h-10 ${getAvatarColor(person.avatar)} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <span className="text-sm text-white">{person.avatar}</span>
                </div>
                <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                  <div>
                    <p className="text-sm text-gray-900">{person.name}</p>
                    <p className="text-xs text-gray-500">{person.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getLocationIcon(person.locationIcon)}
                    <p className="text-xs text-gray-700">{person.location}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Check In</p>
                    <p className="text-sm text-gray-900">{person.checkIn}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Check Out</p>
                    <p className="text-sm text-gray-900">{person.checkOut || "-"}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Hours</p>
                    <p className="text-sm text-gray-900">{person.hours}h</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Method</p>
                      <p className="text-sm text-gray-900">{person.method}</p>
                    </div>
                    <Badge
                      className={
                        person.status === "Active"
                          ? "bg-green-100 text-green-700 border-green-300"
                          : "bg-gray-100 text-gray-700 border-gray-300"
                      }
                    >
                      {person.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
