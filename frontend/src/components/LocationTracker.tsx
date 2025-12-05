import { useState, useEffect, useRef } from "react";
import { MapPin, Search, CheckCircle, Loader2, Download, Smartphone, Monitor, Users, Clock, TrendingUp } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { locationsApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

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
            {/* Map Placeholder */}
            <div className="relative mb-4 h-64 bg-gray-100 rounded-lg border-2 border-gray-300 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                <p className="text-gray-600">Map Placeholder</p>
                <p className="text-sm text-gray-500">No actual GPS tracking</p>
              </div>
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
    </div>
  );
}
