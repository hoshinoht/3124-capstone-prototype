import { useState, useEffect } from "react";
import { Search, Calendar as CalendarIcon, AlertCircle, Loader2, Plus, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { equipmentApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

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
  userId?: string;
}

export function EquipmentBooking() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [showBookDialog, setShowBookDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);

  const [bookings, setBookings] = useState<Booking[]>([]);

  const [newBooking, setNewBooking] = useState({
    startDate: "",
    endDate: "",
    purpose: "",
  });

  const [newEquipment, setNewEquipment] = useState({
    name: "",
    category: "",
    location: "",
    serialNumber: "",
    notes: "",
  });

  // Fetch equipment and bookings from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch equipment
        try {
          const response = await equipmentApi.getAll();
          if (response.data?.equipment) {
            setEquipment(response.data.equipment.map((e: any) => ({
              id: e.id,
              name: e.name,
              category: e.category || "General",
              location: e.location || "Unknown",
              status: e.status || "available",
            })));
          }
        } catch (err) {
          console.error("Failed to fetch equipment:", err);
        }

        // Fetch all bookings (to check what's booked)
        try {
          const response = await equipmentApi.getAllBookings();
          if (response.data?.bookings) {
            setAllBookings(response.data.bookings.map((b: any) => ({
              id: b.id,
              equipmentId: b.equipment_id || b.equipmentId,
              equipmentName: b.equipment_name || b.equipmentName || "Unknown",
              bookedBy: b.booked_by || b.bookedBy || "Unknown",
              userId: b.user_id || b.userId,
              department: b.department || "IT",
              startDate: b.start_date || b.startDate || "",
              endDate: b.end_date || b.endDate || "",
              purpose: b.purpose || "",
            })));
          }
        } catch (err) {
          console.error("Failed to fetch all bookings:", err);
        }

        // Fetch user's bookings
        try {
          const response = await equipmentApi.getMyBookings();
          if (response.data?.bookings) {
            setBookings(response.data.bookings.map((b: any) => ({
              id: b.id,
              equipmentId: b.equipment_id || b.equipmentId,
              equipmentName: b.equipment_name || b.equipmentName || "Unknown",
              bookedBy: b.booked_by || b.bookedBy || "Unknown",
              department: b.department || "IT",
              startDate: b.start_date || b.startDate || "",
              endDate: b.end_date || b.endDate || "",
              purpose: b.purpose || "",
            })));
          }
        } catch (err) {
          console.error("Failed to fetch bookings:", err);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredEquipment = equipment.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if equipment is currently booked (today falls within a booking period)
  const isCurrentlyBooked = (equipmentId: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allBookings.some(booking => {
      if (String(booking.equipmentId) !== String(equipmentId)) return false;
      const startDate = new Date(booking.startDate);
      const endDate = new Date(booking.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      return today >= startDate && today <= endDate;
    });
  };

  // Get current booking for equipment
  const getCurrentBooking = (equipmentId: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allBookings.find(booking => {
      if (String(booking.equipmentId) !== String(equipmentId)) return false;
      const startDate = new Date(booking.startDate);
      const endDate = new Date(booking.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      return today >= startDate && today <= endDate;
    });
  };

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

  const handleDateChange = async (field: "startDate" | "endDate", value: string) => {
    const updatedBooking = { ...newBooking, [field]: value };
    setNewBooking(updatedBooking);

    const start = field === "startDate" ? value : newBooking.startDate;
    const end = field === "endDate" ? value : newBooking.endDate;

    if (selectedEquipment && start && end) {
      try {
        // Use API to check availability
        const response = await equipmentApi.checkAvailability(
          String(selectedEquipment.id),
          start,
          end
        );

        if (!response.data.isAvailable && response.data.conflicts.length > 0) {
          const conflict = response.data.conflicts[0];
          setConflictWarning(
            `Warning: This equipment is already booked from ${conflict.startDate} to ${conflict.endDate}`
          );
        } else {
          setConflictWarning("");
        }
      } catch (err) {
        console.error("Failed to check availability:", err);
        // Fallback to local conflict detection
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
    }
  };

  const handleSubmitBooking = async () => {
    if (!selectedEquipment || conflictWarning) return;

    const tempId = Date.now();
    const userName = user ? `${user.firstName} ${user.lastName}` : "Unknown";
    const booking: Booking = {
      id: tempId,
      equipmentId: selectedEquipment.id,
      equipmentName: selectedEquipment.name,
      bookedBy: userName,
      department: user?.department || "IT",
      startDate: newBooking.startDate,
      endDate: newBooking.endDate,
      purpose: newBooking.purpose,
    };

    // Optimistic update
    setBookings([...bookings, booking]);
    setShowBookDialog(false);
    setNewBooking({
      startDate: "",
      endDate: "",
      purpose: "",
    });
    setSelectedEquipment(null);
    setConflictWarning("");

    try {
      const response = await equipmentApi.createBooking(
        String(selectedEquipment.id),
        {
          startDate: newBooking.startDate,
          endDate: newBooking.endDate,
          purpose: newBooking.purpose,
        }
      );

      if (response.data?.booking) {
        // Update booking with server response data
        setBookings(prev => prev.map(b =>
          b.id === tempId ? {
            ...b,
            id: response.data.booking.id,
            bookedBy: response.data.booking.bookedBy || b.bookedBy,
            department: response.data.booking.department || b.department,
          } : b
        ));
      }
    } catch (err) {
      console.error("Failed to create booking:", err);
      // Revert optimistic update on error
      setBookings(prev => prev.filter(b => b.id !== tempId));
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    const originalBookings = [...bookings];
    const originalAllBookings = [...allBookings];
    setBookings(bookings.filter(b => b.id !== bookingId));
    setAllBookings(allBookings.filter(b => b.id !== bookingId));

    try {
      await equipmentApi.cancelBooking(String(bookingId));
    } catch (err) {
      console.error("Failed to cancel booking:", err);
      setBookings(originalBookings);
      setAllBookings(originalAllBookings);
    }
  };

  const handleCreateEquipment = async () => {
    if (!newEquipment.name || !newEquipment.category || !newEquipment.location) return;

    try {
      setCreating(true);
      const response = await equipmentApi.create({
        name: newEquipment.name,
        category: newEquipment.category,
        location: newEquipment.location,
        serialNumber: newEquipment.serialNumber || undefined,
        notes: newEquipment.notes || undefined,
      });

      if (response.data?.equipment) {
        const created = response.data.equipment;
        setEquipment([...equipment, {
          id: created.id,
          name: created.name,
          category: created.category,
          location: created.location,
          status: created.status || "available",
        }]);
        setShowCreateDialog(false);
        setNewEquipment({
          name: "",
          category: "",
          location: "",
          serialNumber: "",
          notes: "",
        });
      }
    } catch (err) {
      console.error("Failed to create equipment:", err);
    } finally {
      setCreating(false);
    }
  };

  const getEquipmentBookings = (equipmentId: number) => {
    return allBookings.filter(b => String(b.equipmentId) === String(equipmentId));
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
      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Equipment Booking System</CardTitle>
              <CardDescription>
                Book equipment and view availability to prevent scheduling conflicts
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Equipment
            </Button>
          </div>
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
          const currentlyBooked = isCurrentlyBooked(item.id);
          const currentBooking = getCurrentBooking(item.id);

          return (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <CardDescription>{item.category}</CardDescription>
                  </div>
                  <Badge className={getStatusColor(currentlyBooked ? "booked" : item.status)}>
                    {currentlyBooked ? "booked" : item.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentlyBooked && currentBooking && (
                    <div className="text-sm">
                      <p className="font-medium text-gray-700 mb-1">Currently Booked By:</p>
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                        <p className="text-gray-900">{currentBooking.bookedBy}</p>
                        <p className="text-xs text-gray-600">
                          Until {new Date(currentBooking.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {itemBookings.length > 0 && !currentlyBooked && (
                    <div className="text-sm">
                      <p className="font-medium text-gray-700 mb-1">Upcoming Bookings:</p>
                      {itemBookings.slice(0, 2).map(booking => (
                        <div key={booking.id} className="bg-blue-50 border border-blue-200 rounded p-2 mb-2">
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
                    disabled={currentlyBooked || item.status === "maintenance" || item.status === "in-use"}
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {currentlyBooked ? "Currently Booked" :
                      item.status === "available" ? "Book Equipment" :
                        item.status === "maintenance" || item.status === "in-use" ? "Not Available" :
                          "Book Equipment"}
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
              <Label>Booked By</Label>
              <Input value={user ? `${user.firstName} ${user.lastName}` : ""} disabled />
            </div>
            <div>
              <Label>Department</Label>
              <Input value={user?.department || "IT"} disabled />
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
              disabled={!newBooking.startDate || !newBooking.endDate || !newBooking.purpose || !!conflictWarning}
            >
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Equipment Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Add New Equipment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="equipmentName">Equipment Name *</Label>
              <Input
                id="equipmentName"
                placeholder="e.g., Dell Laptop XPS 15"
                value={newEquipment.name}
                onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                value={newEquipment.category}
                onValueChange={(value) => setNewEquipment({ ...newEquipment, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="laptop">Laptop</SelectItem>
                  <SelectItem value="desktop">Desktop</SelectItem>
                  <SelectItem value="monitor">Monitor</SelectItem>
                  <SelectItem value="projector">Projector</SelectItem>
                  <SelectItem value="camera">Camera</SelectItem>
                  <SelectItem value="networking">Networking Equipment</SelectItem>
                  <SelectItem value="server">Server</SelectItem>
                  <SelectItem value="peripheral">Peripheral</SelectItem>
                  <SelectItem value="mobile">Mobile Device</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                placeholder="e.g., IT Room, Floor 2"
                value={newEquipment.location}
                onChange={(e) => setNewEquipment({ ...newEquipment, location: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                placeholder="Optional"
                value={newEquipment.serialNumber}
                onChange={(e) => setNewEquipment({ ...newEquipment, serialNumber: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes about this equipment..."
                value={newEquipment.notes}
                onChange={(e) => setNewEquipment({ ...newEquipment, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateEquipment}
              disabled={creating || !newEquipment.name || !newEquipment.category || !newEquipment.location}
            >
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Equipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
