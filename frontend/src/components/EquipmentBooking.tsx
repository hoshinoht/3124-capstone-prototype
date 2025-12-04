import { useState } from "react";
import { Plus, Search, Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";

interface Equipment {
  id: number;
  name: string;
  category: string;
  location: string;
  status: "available" | "booked" | "in-use" | "maintenance";
}

interface Booking {
  id: number;
  equipmentId: number;
  equipmentName: string;
  bookedBy: string;
  department: string;
  startDate: string;
  endDate: string;
  purpose: string;
}

export function EquipmentBooking() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showBookDialog, setShowBookDialog] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string>("");

  const [equipment] = useState<Equipment[]>([
    { id: 1, name: "Oscilloscope OSC-2000", category: "Testing", location: "Lab 3", status: "available" },
    { id: 2, name: "Network Analyzer NA-500", category: "Testing", location: "Lab 1", status: "booked" },
    { id: 3, name: "Laptop - Dell XPS 15", category: "Computing", location: "IT Storage", status: "available" },
    { id: 4, name: "Multimeter DMM-100", category: "Testing", location: "Lab 3", status: "available" },
    { id: 5, name: "Cisco Switch 48-Port", category: "Networking", location: "Server Room", status: "in-use" },
    { id: 6, name: "Spectrum Analyzer SA-2500", category: "Testing", location: "Lab 2", status: "maintenance" },
    { id: 7, name: "Thermal Camera TC-300", category: "Inspection", location: "Lab 1", status: "available" },
    { id: 8, name: "Cable Tester CT-800", category: "Networking", location: "IT Storage", status: "booked" },
  ]);

  const [bookings, setBookings] = useState<Booking[]>([
    {
      id: 1,
      equipmentId: 2,
      equipmentName: "Network Analyzer NA-500",
      bookedBy: "Sarah Chen",
      department: "Engineering",
      startDate: "2024-09-08",
      endDate: "2024-09-12",
      purpose: "Network performance testing for Building B",
    },
    {
      id: 2,
      equipmentId: 8,
      equipmentName: "Cable Tester CT-800",
      bookedBy: "Mike Johnson",
      department: "IT",
      startDate: "2024-09-10",
      endDate: "2024-09-15",
      purpose: "New cable installation verification",
    },
  ]);

  const [newBooking, setNewBooking] = useState({
    bookedBy: "",
    department: "IT",
    startDate: "",
    endDate: "",
    purpose: "",
  });

  const filteredEquipment = equipment.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-700";
      case "booked":
        return "bg-yellow-100 text-yellow-700";
      case "in-use":
        return "bg-blue-100 text-blue-700";
      case "maintenance":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const checkConflict = (equipmentId: number, startDate: string, endDate: string) => {
    const conflicts = bookings.filter(booking => {
      if (booking.equipmentId !== equipmentId) return false;
      
      const bookingStart = new Date(booking.startDate);
      const bookingEnd = new Date(booking.endDate);
      const newStart = new Date(startDate);
      const newEnd = new Date(endDate);

      return (newStart <= bookingEnd && newEnd >= bookingStart);
    });

    return conflicts;
  };

  const handleBookEquipment = (equipment: Equipment) => {
    if (equipment.status === "maintenance" || equipment.status === "in-use") {
      return;
    }
    setSelectedEquipment(equipment);
    setShowBookDialog(true);
    setConflictWarning("");
  };

  const handleDateChange = (field: "startDate" | "endDate", value: string) => {
    setNewBooking({ ...newBooking, [field]: value });
    
    if (selectedEquipment && newBooking.startDate && newBooking.endDate) {
      const start = field === "startDate" ? value : newBooking.startDate;
      const end = field === "endDate" ? value : newBooking.endDate;
      
      const conflicts = checkConflict(selectedEquipment.id, start, end);
      if (conflicts.length > 0) {
        const conflict = conflicts[0];
        setConflictWarning(
          `Warning: This equipment is already booked by ${conflict.bookedBy} from ${conflict.startDate} to ${conflict.endDate}`
        );
      } else {
        setConflictWarning("");
      }
    }
  };

  const handleSubmitBooking = () => {
    if (!selectedEquipment || conflictWarning) return;

    const booking: Booking = {
      id: bookings.length + 1,
      equipmentId: selectedEquipment.id,
      equipmentName: selectedEquipment.name,
      ...newBooking,
    };

    setBookings([...bookings, booking]);
    setShowBookDialog(false);
    setNewBooking({
      bookedBy: "",
      department: "IT",
      startDate: "",
      endDate: "",
      purpose: "",
    });
    setSelectedEquipment(null);
    setConflictWarning("");
  };

  const handleCancelBooking = (bookingId: number) => {
    setBookings(bookings.filter(b => b.id !== bookingId));
  };

  const getEquipmentBookings = (equipmentId: number) => {
    return bookings.filter(b => b.equipmentId === equipmentId);
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment Booking System</CardTitle>
          <CardDescription>
            Book equipment and view availability to prevent scheduling conflicts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search equipment by name, category, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Equipment Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredEquipment.map(item => {
          const itemBookings = getEquipmentBookings(item.id);
          
          return (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <CardDescription>{item.category}</CardDescription>
                  </div>
                  <Badge className={getStatusColor(item.status)}>
                    {item.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Location:</span> {item.location}
                  </div>

                  {itemBookings.length > 0 && (
                    <div className="text-sm">
                      <p className="font-medium text-gray-700 mb-1">Current Bookings:</p>
                      {itemBookings.map(booking => (
                        <div key={booking.id} className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-2">
                          <p className="text-gray-900">{booking.bookedBy}</p>
                          <p className="text-xs text-gray-600">
                            {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={() => handleBookEquipment(item)}
                    disabled={item.status === "maintenance" || item.status === "in-use"}
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {item.status === "available" ? "Book Equipment" : 
                     item.status === "booked" ? "View Bookings" : 
                     "Not Available"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* My Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>All Active Bookings</CardTitle>
          <CardDescription>
            Manage current equipment reservations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-sm text-gray-500">No active bookings</p>
          ) : (
            <div className="space-y-3">
              {bookings.map(booking => (
                <div key={booking.id} className="border border-gray-200 rounded-lg p-4 flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-gray-900">{booking.equipmentName}</h4>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p><span className="font-medium">Booked by:</span> {booking.bookedBy} ({booking.department})</p>
                      <p><span className="font-medium">Period:</span> {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}</p>
                      <p><span className="font-medium">Purpose:</span> {booking.purpose}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancelBooking(booking.id)}
                  >
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Book Equipment Dialog */}
      <Dialog open={showBookDialog} onOpenChange={setShowBookDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book Equipment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Equipment</Label>
              <Input value={selectedEquipment?.name || ""} disabled />
            </div>
            <div>
              <Label htmlFor="bookedBy">Your Name</Label>
              <Input
                id="bookedBy"
                placeholder="Enter your name"
                value={newBooking.bookedBy}
                onChange={(e) => setNewBooking({ ...newBooking, bookedBy: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <select
                id="department"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={newBooking.department}
                onChange={(e) => setNewBooking({ ...newBooking, department: e.target.value })}
              >
                <option value="IT">IT</option>
                <option value="Engineering">Engineering</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={newBooking.startDate}
                  onChange={(e) => handleDateChange("startDate", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={newBooking.endDate}
                  onChange={(e) => handleDateChange("endDate", e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="purpose">Purpose</Label>
              <Input
                id="purpose"
                placeholder="Why do you need this equipment?"
                value={newBooking.purpose}
                onChange={(e) => setNewBooking({ ...newBooking, purpose: e.target.value })}
              />
            </div>

            {conflictWarning && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{conflictWarning}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitBooking}
              disabled={!newBooking.bookedBy || !newBooking.startDate || !newBooking.endDate || !newBooking.purpose || !!conflictWarning}
            >
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
