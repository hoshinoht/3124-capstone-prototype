import { useState, useEffect, useMemo } from "react";
import { Download, MapPin, Building, Factory, Search, Loader2, Users, Clock, TrendingUp, Smartphone, Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts";
import { locationsApi, usersApi, User } from "../services/api";

interface PersonnelRecord {
  id: number;
  name: string;
  role: string;
  location: string;
  checkIn: string;
  checkInDate: string;
  checkOut: string | null;
  checkOutDate: string | null;
  hours: number;
  method: string;
  status: "Active" | "Completed";
  avatar: string;
  locationIcon: "client" | "corporate" | "manufacturing" | "distribution";
}

export function Personnel() {
  const [loading, setLoading] = useState(true);
  const [personnelRecords, setPersonnelRecords] = useState<PersonnelRecord[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [siteFilter, setSiteFilter] = useState("All Sites");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [activeStatFilter, setActiveStatFilter] = useState<"all" | "active" | "total" | "hours" | "average">("active");

  // Pagination state for total personnel view
  const [personnelPage, setPersonnelPage] = useState(1);
  const personnelPerPage = 10;

  // Generate mock historical data for charts
  const historicalData = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Generate realistic mock data
      const baseHours = 40 + Math.random() * 30;
      const basePersonnel = 8 + Math.floor(Math.random() * 6);

      days.push({
        day: dayName,
        date: dateStr,
        totalHours: Math.round(baseHours + (i === 0 ? personnelRecords.reduce((sum, p) => sum + p.hours, 0) : 0)),
        averageHours: Math.round((baseHours / basePersonnel) * 10) / 10,
        personnel: i === 0 ? personnelRecords.length : basePersonnel,
      });
    }
    // Update today's data with actual values
    if (days.length > 0 && personnelRecords.length > 0) {
      const totalHours = personnelRecords.reduce((sum, p) => sum + p.hours, 0);
      days[days.length - 1].totalHours = Math.round(totalHours);
      days[days.length - 1].averageHours = personnelRecords.length > 0
        ? Math.round((totalHours / personnelRecords.length) * 10) / 10
        : 0;
      days[days.length - 1].personnel = personnelRecords.length;
    }
    return days;
  }, [personnelRecords]);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch all users
        try {
          const usersResponse = await usersApi.getAll();
          const users = usersResponse.data?.users || [];
          setAllUsers(users);
        } catch (err) {
          console.error("Failed to fetch users:", err);
        }

        // Fetch all check-in records (both active and completed)
        try {
          const response = await locationsApi.getAllRecords({ limit: 500 });
          console.log("All records response:", response);

          const records = response.data?.records || [];

          if (records.length > 0) {
            setPersonnelRecords(records.map((l: any, index: number) => {
              // Calculate hours worked
              const checkInTime = new Date(l.checkInTime || l.check_in_time);
              const checkOutTime = l.checkOutTime || l.check_out_time ? new Date(l.checkOutTime || l.check_out_time) : new Date();
              const hoursWorked = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

              const formatDate = (date: Date) => {
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              };

              return {
                id: l.id || l.userId || l.user_id || index,
                name: l.userName || l.user_name || "Unknown",
                role: l.department || l.role || "Staff",
                location: l.location || "Unknown",
                checkIn: new Date(l.checkInTime || l.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                checkInDate: formatDate(new Date(l.checkInTime || l.check_in_time)),
                checkOut: (l.checkOutTime || l.check_out_time) ? new Date(l.checkOutTime || l.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
                checkOutDate: (l.checkOutTime || l.check_out_time) ? formatDate(new Date(l.checkOutTime || l.check_out_time)) : null,
                hours: Math.round(hoursWorked * 10) / 10,
                method: "Mobile",
                status: (l.status === "active" || !(l.checkOutTime || l.check_out_time)) ? "Active" as const : "Completed" as const,
                avatar: ((l.userName || l.user_name || "UN").split(" ").map((n: string) => n[0]).join("").toUpperCase()),
                locationIcon: "client" as const,
              };
            }));
          }
        } catch (err) {
          console.error("Failed to fetch records:", err);
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

    // When "Active Now" card is selected, only show active personnel
    const matchesStatFilter = activeStatFilter !== "active" || person.status === "Active";

    return matchesSearch && matchesSite && matchesStatus && matchesStatFilter;
  });

  const handleStatCardClick = (filter: "all" | "active" | "total" | "hours" | "average") => {
    // Reset pagination when switching views
    setPersonnelPage(1);

    // Toggle filter
    if (activeStatFilter === filter) {
      setActiveStatFilter("active"); // Default back to active view
    } else {
      setActiveStatFilter(filter);
    }
  };

  // Pagination for Total Personnel view (uses allUsers)
  const paginatedPersonnel = useMemo(() => {
    const startIndex = (personnelPage - 1) * personnelPerPage;
    return allUsers.slice(startIndex, startIndex + personnelPerPage);
  }, [allUsers, personnelPage]);

  const totalPages = Math.ceil(allUsers.length / personnelPerPage);

  // Chart config
  const chartConfig = {
    totalHours: {
      label: "Total Hours",
      color: "#3b82f6",
    },
    averageHours: {
      label: "Average Hours",
      color: "#10b981",
    },
  };

  const activePersonnel = personnelRecords.filter(p => p.status === "Active").length;
  const totalPersonnel = allUsers.length || personnelRecords.length;
  const totalHours = personnelRecords.reduce((sum, p) => sum + p.hours, 0);
  const avgHours = personnelRecords.length > 0 ? (totalHours / personnelRecords.length).toFixed(0) : "0";

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

  const handleExportCSV = () => {
    const headers = ["Name", "Role", "Location", "Check In", "Check Out", "Hours Worked", "Status"];
    const csvRows = [
      headers.join(","),
      ...filteredPersonnel.map(person =>
        [
          `"${person.name.replace(/"/g, '""')}"`,
          `"${person.role.replace(/"/g, '""')}"`,
          `"${person.location.replace(/"/g, '""')}"`,
          `"${person.checkIn}"`,
          `"${person.checkOut || 'Still Active'}"`,
          person.hours.toFixed(1),
          `"${person.status}"`
        ].join(",")
      )
    ];
    const csvContent = csvRows.join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `personnel-records-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personnel Tracking Dashboard</h1>
          <p className="text-gray-500">Real-time attendance and location monitoring</p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={handleExportCSV}
          disabled={filteredPersonnel.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card
          className={`p-5 cursor-pointer transition-all hover:shadow-md ${activeStatFilter === "total"
            ? "!border-blue-500 ring-2 ring-blue-200 bg-blue-50"
            : "border border-gray-200 hover:border-gray-300"
            }`}
          onClick={() => handleStatCardClick("total")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Personnel</p>
              <p className={`text-2xl font-bold ${activeStatFilter === "total" ? "text-blue-600" : "text-gray-900"}`}>{totalPersonnel}</p>
              <p className="text-xs text-gray-400 mt-1">Today</p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeStatFilter === "total" ? "bg-blue-100" : "bg-gray-100"}`}>
              <Users className={`w-5 h-5 ${activeStatFilter === "total" ? "text-blue-600" : "text-gray-600"}`} />
            </div>
          </div>
        </Card>
        <Card
          className={`p-5 cursor-pointer transition-all hover:shadow-md ${activeStatFilter === "active"
            ? "!border-green-500 ring-2 ring-green-200 bg-green-50"
            : "border border-gray-200 hover:border-gray-300"
            }`}
          onClick={() => handleStatCardClick("active")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Active Now</p>
              <p className={`text-2xl font-bold ${activeStatFilter === "active" ? "text-green-600" : "text-gray-900"}`}>{activePersonnel}</p>
              <p className="text-xs text-gray-400 mt-1">Clocked in</p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeStatFilter === "active" ? "bg-green-100" : "bg-gray-100"}`}>
              <Activity className={`w-5 h-5 ${activeStatFilter === "active" ? "text-green-600" : "text-gray-600"}`} />
            </div>
          </div>
        </Card>
        <Card
          className={`p-5 cursor-pointer transition-all hover:shadow-md ${activeStatFilter === "hours"
            ? "!border-blue-500 ring-2 ring-blue-200 bg-blue-50"
            : "border border-gray-200 hover:border-gray-300"
            }`}
          onClick={() => handleStatCardClick("hours")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Hours</p>
              <p className={`text-2xl font-bold ${activeStatFilter === "hours" ? "text-blue-600" : "text-gray-900"}`}>{Math.round(totalHours)}</p>
              <p className="text-xs text-gray-400 mt-1">Combined today</p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeStatFilter === "hours" ? "bg-blue-100" : "bg-gray-100"}`}>
              <Clock className={`w-5 h-5 ${activeStatFilter === "hours" ? "text-blue-600" : "text-gray-600"}`} />
            </div>
          </div>
        </Card>
        <Card
          className={`p-5 cursor-pointer transition-all hover:shadow-md ${activeStatFilter === "average"
            ? "!border-blue-500 ring-2 ring-blue-200 bg-blue-50"
            : "border border-gray-200 hover:border-gray-300"
            }`}
          onClick={() => handleStatCardClick("average")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Average Hours</p>
              <p className={`text-2xl font-bold ${activeStatFilter === "average" ? "text-blue-600" : "text-gray-900"}`}>{avgHours}</p>
              <p className="text-xs text-gray-400 mt-1">Per person</p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeStatFilter === "average" ? "bg-blue-100" : "bg-gray-100"}`}>
              <TrendingUp className={`w-5 h-5 ${activeStatFilter === "average" ? "text-blue-600" : "text-gray-600"}`} />
            </div>
          </div>
        </Card>
      </div>

      {/* Content based on selected stat filter */}
      {activeStatFilter === "total" ? (
        /* Total Personnel View - All Users Paginated */
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">All Personnel</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Complete list of all personnel ({allUsers.length} total)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-6">Personnel</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-6">Department</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-6">Role</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedPersonnel.map((user) => {
                  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U';
                  const checkInRecord = personnelRecords.find(r => r.name === `${user.firstName} ${user.lastName}`);
                  const isActive = checkInRecord?.status === "Active";
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 ${getAvatarColor(initials)} rounded-full flex items-center justify-center`}>
                            <span className="text-sm font-medium text-white">{initials}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-sm text-gray-600">{user.department}</td>
                      <td className="px-6 py-6 text-sm text-gray-600">{user.role}</td>
                      <td className="px-6 py-6">
                        <Badge
                          className={
                            isActive
                              ? "bg-green-100 text-green-700 border-green-200"
                              : "bg-gray-100 text-gray-700 border-gray-200"
                          }
                        >
                          {isActive ? "Checked In" : "Not Checked In"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {allUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No personnel available</p>
              </div>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-gray-500">
                Showing {((personnelPage - 1) * personnelPerPage) + 1} to {Math.min(personnelPage * personnelPerPage, personnelRecords.length)} of {personnelRecords.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPersonnelPage(p => Math.max(1, p - 1))}
                  disabled={personnelPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {personnelPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPersonnelPage(p => Math.min(totalPages, p + 1))}
                  disabled={personnelPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      ) : activeStatFilter === "hours" ? (
        /* Total Hours View - Bar Chart */
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Total Hours Trend</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Combined work hours across all personnel over the past 7 days
            </p>
          </div>
          <div className="p-6">
            <div className="h-[300px]">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <BarChart data={historicalData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}h`}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value) => [`${value} hours`, "Total Hours"]}
                  />
                  <Bar
                    dataKey="totalHours"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    name="Total Hours"
                  />
                </BarChart>
              </ChartContainer>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {historicalData.reduce((sum, d) => sum + d.totalHours, 0)}
                </p>
                <p className="text-xs text-gray-500">Total (7 days)</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(historicalData.reduce((sum, d) => sum + d.totalHours, 0) / 7)}
                </p>
                <p className="text-xs text-gray-500">Daily Average</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {historicalData[historicalData.length - 1]?.totalHours || 0}
                </p>
                <p className="text-xs text-gray-500">Today</p>
              </div>
            </div>
          </div>
        </Card>
      ) : activeStatFilter === "average" ? (
        /* Average Hours View - Line Chart */
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Average Hours Trend</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Average work hours per person over the past 7 days
            </p>
          </div>
          <div className="p-6">
            <div className="h-[300px]">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <LineChart data={historicalData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}h`}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value) => [`${value} hours`, "Average Hours"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="averageHours"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Average Hours"
                  />
                </LineChart>
              </ChartContainer>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {(historicalData.reduce((sum, d) => sum + d.averageHours, 0) / 7).toFixed(1)}
                </p>
                <p className="text-xs text-gray-500">Weekly Average</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {Math.max(...historicalData.map(d => d.averageHours)).toFixed(1)}
                </p>
                <p className="text-xs text-gray-500">Peak Average</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {historicalData[historicalData.length - 1]?.averageHours || 0}
                </p>
                <p className="text-xs text-gray-500">Today</p>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        /* Default Active/All Personnel Table */

        <Card className="overflow-hidden">
          {/* Filters */}
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={siteFilter} onValueChange={setSiteFilter}>
                <SelectTrigger className="w-40">
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
              {/* <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Status">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select> */}
            </div>
          </Card>

          {filteredPersonnel.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No personnel records found</p>
              <p className="text-sm text-gray-400 mt-1">
                Personnel location data will appear here once team members check in
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-6">Personnel</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-6">Location</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-6">Clock In</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-6">Clock Out</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-6">Hours</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-6">Method</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPersonnel.map((person) => (
                    <tr key={person.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 ${getAvatarColor(person.avatar)} rounded-full flex items-center justify-center`}>
                            <span className="text-sm font-medium text-white">{person.avatar}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{person.name}</p>
                            <p className="text-xs text-gray-500">{person.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-2">
                          {getLocationIcon(person.locationIcon)}
                          <span className="text-sm text-gray-700">{person.location}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div>
                          <p className="text-sm text-gray-900">{person.checkIn}</p>
                          <p className="text-xs text-gray-500">{person.checkInDate}</p>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        {person.checkOut ? (
                          <div>
                            <p className="text-sm text-gray-900">{person.checkOut}</p>
                            <p className="text-xs text-gray-500">{person.checkOutDate}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{person.hours} hrs</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-1.5 text-sm text-blue-600">
                          <Smartphone className="w-4 h-4" />
                          <span>{person.method}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <Badge
                          className={
                            person.status === "Active"
                              ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-100"
                              : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100"
                          }
                        >
                          {person.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );


}
