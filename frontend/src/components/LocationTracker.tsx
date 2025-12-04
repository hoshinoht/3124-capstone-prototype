import { useState, useEffect } from "react";
import { MapPin, Search, CheckCircle, Loader2 } from "lucide-react";
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
  location: string;
  checkIn: string;
  checkOut: string;
}

export function LocationTracker() {
  const { user } = useAuth();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showCheckoutConfirmation, setShowCheckoutConfirmation] = useState(false);
  const [searchMember, setSearchMember] = useState("");
  const [searchDate, setSearchDate] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));
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

        // Fetch today's records (both active and completed - for the Clock In/Out table)
        try {
          const todayResponse = await locationsApi.getTodayRecords();
          if (todayResponse.data?.records) {
            const records = todayResponse.data.records || [];

            setClockInOutRecords(records.map((l: any) => ({
              memberName: l.userName || "Unknown",
              location: l.location || "Unknown",
              checkIn: formatTime(l.checkInTime || ""),
              checkOut: formatTime(l.checkOutTime || ""),
            })));
          }
        } catch (err) {
          console.error("Failed to fetch today's records:", err);
        }
      } catch (err) {
        console.error("Failed to fetch locations:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

        // Refresh today's records for the Clock In/Out table
        const todayResponse = await locationsApi.getTodayRecords();
        if (todayResponse.data?.records) {
          const records = todayResponse.data.records || [];
          setClockInOutRecords(records.map((l: any) => ({
            memberName: l.userName || "Unknown",
            location: l.location || "Unknown",
            checkIn: formatTime(l.checkInTime || ""),
            checkOut: formatTime(l.checkOutTime || ""),
          })));
        }
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

      // Refresh today's records (user will still appear with check-out time)
      const todayResponse = await locationsApi.getTodayRecords();
      if (todayResponse.data?.records) {
        const records = todayResponse.data.records || [];
        setClockInOutRecords(records.map((l: any) => ({
          memberName: l.userName || "Unknown",
          location: l.location || "Unknown",
          checkIn: formatTime(l.checkInTime || ""),
          checkOut: formatTime(l.checkOutTime || ""),
        })));
      }
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

  const filteredRecords = clockInOutRecords.filter(record =>
    record.memberName.toLowerCase().includes(searchMember.toLowerCase())
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

      {/* Hi-Fi Prototype Section */}
      <div className="mt-8">

        {/* Clock In/Out Table */}
        <Card>
          <CardHeader>
            <CardTitle>Clock In/Out</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block mb-2 text-sm">Search</label>
                <div className="relative">
                  <Input
                    placeholder="Search member name"
                    value={searchMember}
                    onChange={(e) => setSearchMember(e.target.value)}
                    className="pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block mb-2 text-sm">Select Date</label>
                <div className="relative">
                  <Input
                    value={searchDate}
                    readOnly
                    className="pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="border-2 border-black rounded overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-4 border-b-2 border-black bg-gray-50">
                <div className="p-3 border-r-2 border-black">Member name</div>
                <div className="p-3 border-r-2 border-black">Location</div>
                <div className="p-3 border-r-2 border-black">Check In</div>
                <div className="p-3">Check Out</div>
              </div>

              {/* Rows */}
              {filteredRecords.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No records found
                </div>
              ) : (
                filteredRecords.map((record, index) => (
                  <div key={index} className="grid grid-cols-4 border-b-2 border-black last:border-b-0 bg-white hover:bg-gray-50 transition-colors">
                    <div className="p-3 border-r-2 border-black">{record.memberName}</div>
                    <div className="p-3 border-r-2 border-black">{record.location}</div>
                    <div className="p-3 border-r-2 border-black">{record.checkIn}</div>
                    <div className="p-3">{record.checkOut || '-'}</div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
