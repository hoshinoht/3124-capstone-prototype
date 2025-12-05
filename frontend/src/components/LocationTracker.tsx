import { useState, useEffect, useRef } from "react";
import { MapPin, Search, CheckCircle, Loader2, Download, Smartphone, Monitor, Users, Clock, TrendingUp, ChevronLeft, ChevronRight, Filter, Calendar, History } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { locationsApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

interface HistoryRecord {
  id: number;
  location: string;
  checkInTime: string;
  checkOutTime?: string;
  status: string;
  hoursWorked: string;
}

interface CheckInRecord {
  name: string;
  location: string;
  checkInTime: string;
  checkOutTime?: string;
}

interface ClockInOutRecord {
  memberName: string;
  department: string;
  location: string;
  checkIn: string;
  checkOut: string;
  deviceType: string;
  status: string;
  hoursWorked: string;
}

export function LocationTracker() {
  const { user } = useAuth();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showCheckoutConfirmation, setShowCheckoutConfirmation] = useState(false);
  const [searchMember, setSearchMember] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState("");
  const [checkInTime, setCheckInTime] = useState("");

  const [checkInRecords, setCheckInRecords] = useState<CheckInRecord[]>([]);
  const [clockInOutRecords, setClockInOutRecords] = useState<ClockInOutRecord[]>([]);

  // Check-in history state
  const [myCheckInHistory, setMyCheckInHistory] = useState<HistoryRecord[]>([]);
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [historyFilterLocation, setHistoryFilterLocation] = useState("");
  const [historyFilterStatus, setHistoryFilterStatus] = useState("");
  const [historyFilterDateFrom, setHistoryFilterDateFrom] = useState("");
  const [historyFilterDateTo, setHistoryFilterDateTo] = useState("");
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const HISTORY_ITEMS_PER_PAGE = 5;

  // Fetch location data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch user's current check-in status
        try {
          const statusResponse = await locationsApi.getMyStatus();
          if (statusResponse.data?.history && statusResponse.data.history.length > 0) {
            const latestRecord = statusResponse.data.history[0];
            // If there's no check-out time, user is currently checked in
            if (latestRecord.status === 'active' || !latestRecord.checkOutTime) {
              setIsCheckedIn(true);
              setCurrentLocation(latestRecord.location);
              setCheckInTime(latestRecord.checkInTime);
            }

            // Set up my check-in history
            setMyCheckInHistory(statusResponse.data.history.map((h: any, index: number) => ({
              id: h.id || index,
              location: h.location || "Unknown",
              checkInTime: h.checkInTime || "",
              checkOutTime: h.checkOutTime || undefined,
              status: h.status || (h.checkOutTime ? "completed" : "active"),
              hoursWorked: calculateHours(h.checkInTime, h.checkOutTime),
            })));
          }
        } catch (err) {
          console.error("Failed to fetch user status:", err);
        }

        // Fetch current locations (active users only - for the "Checked In Personnel" card)
        try {
          const response = await locationsApi.getCurrent();
          if (response.data?.activeCheckIns) {
            const locations = response.data.activeCheckIns || [];

            setCheckInRecords(locations.map((l: any) => ({
              name: l.userName || "Unknown",
              location: l.location || "Unknown",
              checkInTime: l.checkInTime || "",
              checkOutTime: l.checkOutTime || undefined,
            })));
          }
        } catch (err) {
          console.error("Failed to fetch current locations:", err);
        }

        // Fetch ALL records (for the Personnel table with filters)
        await fetchAllRecords();
      } catch (err) {
        console.error("Failed to fetch locations:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch all records with current filters
  const fetchAllRecords = async () => {
    try {
      const params: { location?: string; status?: string; search?: string } = {};
      if (filterLocation) params.location = filterLocation;
      if (filterStatus) params.status = filterStatus;
      if (searchMember) params.search = searchMember;

      const allResponse = await locationsApi.getAllRecords(params);
      if (allResponse.data?.records) {
        const records = allResponse.data.records || [];

        // Extract unique locations for the filter dropdown
        const uniqueLocations = [...new Set(records.map((r: any) => r.location))].filter(Boolean) as string[];
        setAvailableLocations(uniqueLocations);

        setClockInOutRecords(records.map((l: any) => ({
          memberName: l.userName || "Unknown",
          department: l.department || "Unknown",
          location: l.location || "Unknown",
          checkIn: formatTime(l.checkInTime || ""),
          checkOut: formatTime(l.checkOutTime || ""),
          deviceType: l.deviceType || "desktop",
          status: l.status || "active",
          hoursWorked: calculateHours(l.checkInTime, l.checkOutTime),
        })));
      }
    } catch (err) {
      console.error("Failed to fetch all records:", err);
    }
  };

  // Re-fetch when filters change
  useEffect(() => {
    if (!loading) {
      fetchAllRecords();
    }
  }, [filterLocation, filterStatus]);

  const calculateHours = (checkInTime: string, checkOutTime?: string): string => {
    if (!checkInTime) return "0 hrs";
    try {
      const checkIn = new Date(checkInTime);
      const checkOut = checkOutTime ? new Date(checkOutTime) : new Date();
      const diffMs = checkOut.getTime() - checkIn.getTime();
      const hours = diffMs / (1000 * 60 * 60);
      return `${hours.toFixed(1)} hrs`;
    } catch {
      return "0 hrs";
    }
  };

  const formatTime = (timeStr: string): string => {
    if (!timeStr) return "";
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return timeStr;
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
    } catch {
      return timeStr;
    }
  };

  const handleCheckIn = async () => {
    try {
      const location = "Singapore Institute of Technology"; // This would typically come from GPS or user selection
      const response = await locationsApi.checkIn(location);

      if (response.success) {
        const checkInData = response.data?.checkIn;
        setIsCheckedIn(true);
        setCurrentLocation(location);
        setCheckInTime(checkInData?.checkInTime || new Date().toISOString());
        setShowConfirmation(true);
        setTimeout(() => setShowConfirmation(false), 3000);

        // Refresh the records
        const currentResponse = await locationsApi.getCurrent();
        if (currentResponse.data?.activeCheckIns) {
          const locations = currentResponse.data.activeCheckIns || [];
          setCheckInRecords(locations.map((l: any) => ({
            name: l.userName || "Unknown",
            location: l.location || "Unknown",
            checkInTime: l.checkInTime || "",
          })));
        }

        // Refresh all records
        await fetchAllRecords();
      }
    } catch (err) {
      console.error("Failed to check in:", err);
      // Still show check-in for demo purposes
      setIsCheckedIn(true);
      setCurrentLocation("Singapore Institute of Technology");
      setCheckInTime(new Date().toISOString());
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 3000);
    }
  };

  const handleCheckOut = async () => {
    try {
      await locationsApi.checkOut();
      setIsCheckedIn(false);
      setShowCheckoutConfirmation(true);
      setTimeout(() => setShowCheckoutConfirmation(false), 3000);
      setCurrentLocation("");
      setCheckInTime("");

      // Refresh the active check-ins (user will be removed from this list)
      const currentResponse = await locationsApi.getCurrent();
      if (currentResponse.data?.activeCheckIns) {
        const locations = currentResponse.data.activeCheckIns || [];
        setCheckInRecords(locations.map((l: any) => ({
          name: l.userName || "Unknown",
          location: l.location || "Unknown",
          checkInTime: l.checkInTime || "",
        })));
      }

      // Refresh all records
      await fetchAllRecords();
    } catch (err) {
      console.error("Failed to check out:", err);
      // Still show checkout for demo purposes
      setIsCheckedIn(false);
      setShowCheckoutConfirmation(true);
      setTimeout(() => setShowCheckoutConfirmation(false), 3000);
      setCurrentLocation("");
      setCheckInTime("");
    }
  };

  // Calculate stats
  const totalPersonnel = clockInOutRecords.length;
  const activeCount = clockInOutRecords.filter(r => r.status === 'active').length;
  const totalHours = clockInOutRecords.reduce((sum, r) => {
    const hours = parseFloat(r.hoursWorked) || 0;
    return sum + hours;
  }, 0);
  const avgHours = clockInOutRecords.length > 0 ? totalHours / clockInOutRecords.length : 0;

  // Filter records based on selected stat card
  const getFilteredByStatRecords = () => {
    let records = clockInOutRecords;

    // Apply stat card filter
    if (selectedStat === 'active') {
      records = records.filter(r => r.status === 'active');
    } else if (selectedStat === 'completed') {
      records = records.filter(r => r.status === 'completed');
    }
    // 'total' and 'hours' show all records

    // Apply search filter
    return records.filter(record =>
      record.memberName.toLowerCase().includes(searchMember.toLowerCase()) ||
      record.location.toLowerCase().includes(searchMember.toLowerCase())
    );
  };

  const filteredRecords = getFilteredByStatRecords();

  // Filter and paginate check-in history
  const getFilteredHistory = () => {
    let records = myCheckInHistory;

    // Apply location filter
    if (historyFilterLocation) {
      records = records.filter(r =>
        r.location.toLowerCase().includes(historyFilterLocation.toLowerCase())
      );
    }

    // Apply status filter
    if (historyFilterStatus) {
      records = records.filter(r => r.status === historyFilterStatus);
    }

    // Apply date range filter
    if (historyFilterDateFrom) {
      const fromDate = new Date(historyFilterDateFrom);
      records = records.filter(r => new Date(r.checkInTime) >= fromDate);
    }
    if (historyFilterDateTo) {
      const toDate = new Date(historyFilterDateTo);
      toDate.setHours(23, 59, 59, 999);
      records = records.filter(r => new Date(r.checkInTime) <= toDate);
    }

    // Apply search query
    if (historySearchQuery) {
      records = records.filter(r =>
        r.location.toLowerCase().includes(historySearchQuery.toLowerCase())
      );
    }

    return records;
  };

  const filteredHistory = getFilteredHistory();
  const historyTotalPages = Math.ceil(filteredHistory.length / HISTORY_ITEMS_PER_PAGE);
  const paginatedHistory = filteredHistory.slice(
    (historyCurrentPage - 1) * HISTORY_ITEMS_PER_PAGE,
    historyCurrentPage * HISTORY_ITEMS_PER_PAGE
  );

  // Get unique locations from history for filter dropdown
  const historyLocations = [...new Set(myCheckInHistory.map(r => r.location))];

  const handleHistoryPageChange = (page: number) => {
    setHistoryCurrentPage(page);
  };

  const resetHistoryFilters = () => {
    setHistoryFilterLocation("");
    setHistoryFilterStatus("");
    setHistoryFilterDateFrom("");
    setHistoryFilterDateTo("");
    setHistorySearchQuery("");
    setHistoryCurrentPage(1);
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setHistoryCurrentPage(1);
  }, [historyFilterLocation, historyFilterStatus, historyFilterDateFrom, historyFilterDateTo, historySearchQuery]);

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const handleStatClick = (stat: string) => {
    if (selectedStat === stat) {
      setSelectedStat(null); // Toggle off if already selected
      setFilterStatus("");
    } else {
      setSelectedStat(stat);
      if (stat === 'active') {
        setFilterStatus("active");
      } else if (stat === 'completed') {
        setFilterStatus("");
      } else {
        setFilterStatus("");
      }
    }
  };

  const handleExportCSV = () => {
    // Create CSV content
    const headers = ["Personnel", "Department", "Location", "Clock In", "Clock Out", "Hours", "Method", "Status"];
    const csvRows = [
      headers.join(","),
      ...filteredRecords.map(record =>
        [
          `"${record.memberName}"`,
          `"${record.department}"`,
          `"${record.location}"`,
          `"${record.checkIn}"`,
          `"${record.checkOut || ''}"`,
          `"${record.hoursWorked}"`,
          `"${record.deviceType}"`,
          `"${record.status}"`
        ].join(",")
      )
    ];
    const csvContent = csvRows.join("\n");

    // Create and download file
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
      {/* Header with Prototype Badge */}
      <div>
        <h2 className="text-xl underline">Streamlined Personnel Coordination</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map Section with Check In/Out */}
        <Card>
          <CardHeader>
            <CardTitle>Location Check In/Out</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Map */}
            <div className="relative mb-4 rounded-lg overflow-hidden">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.6040159112813!2d103.90967081118802!3d1.4136303985670917!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31da1515bfb2d263%3A0xc71c56458ac08497!2sSingapore%20Institute%20of%20Technology%20(Campus%20Court)!5e0!3m2!1sen!2ssg!4v1764933009482!5m2!1sen!2ssg"
                width="100%"
                height="256"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            {/* Check In/Out Buttons */}
            <div className="flex gap-2 mb-4">
              <Button
                onClick={handleCheckIn}
                disabled={isCheckedIn}
                className="flex-1"
              >
                Check In
              </Button>
              <Button
                onClick={handleCheckOut}
                disabled={!isCheckedIn}
                variant="outline"
                className="flex-1"
              >
                Check Out
              </Button>
            </div>

            {/* Confirmation Message */}
            {showConfirmation && (
              <Card className="border-green-500 bg-green-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg">{user?.firstName} {user?.lastName}</span>
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">You have successfully checked in at {formatTime(checkInTime)}</p>
                  <p className="text-sm flex items-center gap-1 text-red-600 mt-1">
                    <MapPin className="w-4 h-4" />
                    {currentLocation}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Checkout Confirmation Message */}
            {showCheckoutConfirmation && (
              <Card className="border-blue-500 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg">{user?.firstName} {user?.lastName}</span>
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">You have successfully checked out at {formatTime(new Date().toISOString())}</p>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Checked In Personnel List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Checked In Personnel</CardTitle>
              <Badge variant="outline">{checkInRecords.length} Active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {checkInRecords.map((record, index) => (
                <Card key={index} className="border-gray-200">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{record.name}</p>
                          <p className="text-sm text-gray-600">{record.location}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">{record.checkInTime}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Check-In History Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              <CardTitle>My Check-In History</CardTitle>
            </div>
            <Badge variant="outline">{filteredHistory.length} Records</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 space-y-3">
            <div className="flex flex-wrap gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by location..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Location Filter */}
              <select
                value={historyFilterLocation}
                onChange={(e) => setHistoryFilterLocation(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm min-w-[150px]"
              >
                <option value="">All Locations</option>
                {historyLocations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={historyFilterStatus}
                onChange={(e) => setHistoryFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm min-w-[120px]"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              {/* Date Range */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <Input
                  type="date"
                  value={historyFilterDateFrom}
                  onChange={(e) => setHistoryFilterDateFrom(e.target.value)}
                  className="w-[140px]"
                  placeholder="From"
                />
                <span className="text-gray-400">to</span>
                <Input
                  type="date"
                  value={historyFilterDateTo}
                  onChange={(e) => setHistoryFilterDateTo(e.target.value)}
                  className="w-[140px]"
                  placeholder="To"
                />
              </div>

              {/* Reset Filters */}
              <Button
                variant="outline"
                size="sm"
                onClick={resetHistoryFilters}
                className="ml-auto"
              >
                <Filter className="w-4 h-4 mr-1" />
                Reset Filters
              </Button>
            </div>
          </div>

          {/* History Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Location</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Check In</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Check Out</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Hours</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedHistory.length > 0 ? (
                  paginatedHistory.map((record) => (
                    <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 text-gray-900">{formatDate(record.checkInTime)}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <span className="text-gray-900">{record.location}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-gray-600">{formatTime(record.checkInTime)}</td>
                      <td className="py-3 px-2 text-gray-600">{record.checkOutTime ? formatTime(record.checkOutTime) : "-"}</td>
                      <td className="py-3 px-2 text-gray-600">{record.hoursWorked}</td>
                      <td className="py-3 px-2">
                        <Badge
                          variant={record.status === 'active' ? 'default' : 'secondary'}
                          className={record.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}
                        >
                          {record.status === 'active' ? 'Active' : 'Completed'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No check-in history found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {historyTotalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing {((historyCurrentPage - 1) * HISTORY_ITEMS_PER_PAGE) + 1} to {Math.min(historyCurrentPage * HISTORY_ITEMS_PER_PAGE, filteredHistory.length)} of {filteredHistory.length} entries
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleHistoryPageChange(historyCurrentPage - 1)}
                  disabled={historyCurrentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: historyTotalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={historyCurrentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleHistoryPageChange(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleHistoryPageChange(historyCurrentPage + 1)}
                  disabled={historyCurrentPage === historyTotalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
