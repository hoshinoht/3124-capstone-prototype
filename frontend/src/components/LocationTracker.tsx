import { useState } from "react";
import { MapPin, Search, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

interface CheckInRecord {
  name: string;
  location: string;
  checkInTime: string;
  checkOutTime?: string;
}

export function LocationTracker() {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [searchMember, setSearchMember] = useState("");
  const [searchDate, setSearchDate] = useState("Today, 01 October 2025");

  const [checkInRecords] = useState<CheckInRecord[]>([
    { name: "Peter Tan", location: "Punggol", checkInTime: "02 Oct 2025, 09:45 AM" },
    { name: "Siti Ahmad", location: "Little India", checkInTime: "02 Oct 2025, 09:50 AM" },
    { name: "David Wong", location: "Tampines", checkInTime: "02 Oct 2025, 09:55 AM" },
    { name: "Jessica Lim", location: "Kallang", checkInTime: "02 Oct 2025, 10:00 AM" },
  ]);

  const [clockInOutRecords] = useState([
    { memberName: "Abigail Tan", location: "SIT", checkIn: "8:51am", checkOut: "" },
    { memberName: "Bryan Ho", location: "NUHS", checkIn: "8:54am", checkOut: "" },
    { memberName: "Cindy Lim", location: "AMK hub", checkIn: "8:58am", checkOut: "" },
    { memberName: "Nur Indra", location: "MBS", checkIn: "8:47am", checkOut: "" },
  ]);

  const handleCheckIn = () => {
    setIsCheckedIn(true);
    setShowConfirmation(true);
    setTimeout(() => setShowConfirmation(false), 3000);
  };

  const handleCheckOut = () => {
    setIsCheckedIn(false);
  };

  const filteredRecords = clockInOutRecords.filter(record =>
    record.memberName.toLowerCase().includes(searchMember.toLowerCase())
  );

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
                    <span className="text-lg">John Parker</span>
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">You have successfully checked in at 8:53am</p>
                  <p className="text-sm flex items-center gap-1 text-red-600 mt-1">
                    <MapPin className="w-4 h-4" />
                    Singapore Institute of Technology
                  </p>
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
