import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Trash2, Bell, Calendar as CalendarIcon, Download, MapPin, Building, Factory, Users } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Search } from "lucide-react";

interface Task {
  id: number;
  title: string;
  description: string;
  urgency: "urgent" | "low";
  deadline: string;
  completed: boolean;
}

interface EquipmentBooking {
  id: number;
  equipmentName: string;
  startTime: string;
  endTime: string;
  bookedBy: string;
  purpose: string;
  date: string;
}

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

type TabType = "tasks" | "addTask" | "equipmentBooking" | "personnel";

export function TaskManagement() {
  const [activeTab, setActiveTab] = useState<TabType>("tasks");
  const [currentDate, setCurrentDate] = useState(new Date(2025, 10, 20)); // November 20, 2025

  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 1,
      title: "Submit Use Case Report to Client",
      description: "Final review and submission of the use case documentation for the IAQ sensor project",
      urgency: "urgent",
      deadline: "Today",
      completed: false,
    },
    {
      id: 2,
      title: "Prepare for New Intern Interview",
      description: "Review candidate resumes and prepare interview questions",
      urgency: "urgent",
      deadline: "Tomorrow",
      completed: false,
    },
    {
      id: 3,
      title: "Send Monthly Status Report",
      description: "Compile and send monthly progress report to stakeholders",
      urgency: "low",
      deadline: "Nov 30, 2025",
      completed: false,
    },
    {
      id: 4,
      title: "Update Project Documentation",
      description: "Ensure all technical documentation is up to date in the wiki",
      urgency: "low",
      deadline: "Dec 04, 2025",
      completed: false,
    },
  ]);

  const [bookings, setBookings] = useState<EquipmentBooking[]>([
    {
      id: 1,
      equipmentName: "Conference Room A",
      startTime: "09:30",
      endTime: "11:00",
      bookedBy: "Sarah Chen",
      purpose: "Meeting with NUHS partners",
      date: "November 20, 2025",
    },
    {
      id: 2,
      equipmentName: "Conference Room A",
      startTime: "13:30",
      endTime: "15:00",
      bookedBy: "John Smith",
      purpose: "Interview with new intern applicant",
      date: "November 20, 2025",
    },
  ]);

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    deadline: "",
    urgency: "medium" as "urgent" | "low" | "medium",
  });

  const [newBooking, setNewBooking] = useState({
    equipmentName: "",
    startTime: "",
    endTime: "",
    bookedBy: "",
    purpose: "",
  });

  const [personnelRecords] = useState<PersonnelRecord[]>([
    {
      id: 1,
      name: "Michael Chen",
      role: "Field Engineer",
      location: "Client Site - TechCorp",
      checkIn: "09:28 AM",
      checkOut: null,
      hours: 0.2,
      method: "Mobile",
      status: "Active",
      avatar: "MC",
      locationIcon: "client",
    },
    {
      id: 2,
      name: "Sarah Johnson",
      role: "Senior Engineer",
      location: "Corporate Headquarters",
      checkIn: "08:30 AM",
      checkOut: null,
      hours: 1.2,
      method: "Mobile",
      status: "Active",
      avatar: "SJ",
      locationIcon: "corporate",
    },
    {
      id: 3,
      name: "David Park",
      role: "Field Technician",
      location: "Manufacturing Plant North",
      checkIn: "07:45 AM",
      checkOut: null,
      hours: 1.9,
      method: "Mobile",
      status: "Active",
      avatar: "DP",
      locationIcon: "manufacturing",
    },
    {
      id: 4,
      name: "Emily Rodriguez",
      role: "Project Manager",
      location: "Client Site - TechCorp",
      checkIn: "09:00 AM",
      checkOut: "05:30 PM",
      hours: 8.5,
      method: "Mobile",
      status: "Completed",
      avatar: "ER",
      locationIcon: "client",
    },
    {
      id: 5,
      name: "James Wilson",
      role: "Equipment Specialist",
      location: "Distribution Center",
      checkIn: "08:15 AM",
      checkOut: null,
      hours: 1.4,
      method: "Mobile",
      status: "Active",
      avatar: "JW",
      locationIcon: "distribution",
    },
    {
      id: 6,
      name: "Lisa Anderson",
      role: "Field Engineer",
      location: "Corporate Headquarters",
      checkIn: "08:50 AM",
      checkOut: "12:20 PM",
      hours: 3.5,
      method: "Mobile",
      status: "Completed",
      avatar: "LA",
      locationIcon: "corporate",
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [siteFilter, setSiteFilter] = useState("All Sites");
  const [statusFilter, setStatusFilter] = useState("All Status");

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

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const handleToggleTask = (taskId: number) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const handleDeleteTask = (taskId: number) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const handleCreateTask = () => {
    if (!newTask.title || !newTask.deadline) return;
    
    const task: Task = {
      id: tasks.length + 1,
      title: newTask.title,
      description: newTask.description,
      urgency: newTask.urgency === "medium" ? "low" : newTask.urgency,
      deadline: newTask.deadline,
      completed: false,
    };
    
    setTasks([...tasks, task]);
    setNewTask({ title: "", description: "", deadline: "", urgency: "medium" });
    setActiveTab("tasks");
  };

  const handleBookEquipment = () => {
    if (!newBooking.equipmentName || !newBooking.startTime || !newBooking.endTime || !newBooking.bookedBy) return;
    
    const booking: EquipmentBooking = {
      id: bookings.length + 1,
      ...newBooking,
      date: "November 20, 2025",
    };
    
    setBookings([...bookings, booking]);
    setNewBooking({ equipmentName: "", startTime: "", endTime: "", bookedBy: "", purpose: "" });
  };

  const handleDeleteBooking = (bookingId: number) => {
    setBookings(bookings.filter(booking => booking.id !== bookingId));
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "urgent":
        return "bg-red-100 text-red-700 border-red-300";
      case "low":
        return "bg-green-100 text-green-700 border-green-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

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

  return (
    <div className="bg-gray-50 rounded-lg p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl text-gray-900 mb-1">Task & Schedule Manager</h1>
          <p className="text-sm text-gray-600">Manage your tasks and equipment bookings efficiently</p>
        </div>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-600" />
          <Badge className="bg-black text-white hover:bg-black">Notifications On</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px,1fr] gap-6">
        {/* Calendar Section */}
        <Card className="p-6 h-fit">
          <div className="mb-4">
            <h3 className="text-sm mb-1">Calendar</h3>
            <p className="text-xs text-gray-600">Select a date to view or add bookings</p>
          </div>

          <div className="flex items-center justify-between mb-4">
            <span className="text-sm">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
            <div className="flex gap-1">
              <button
                onClick={previousMonth}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <div key={day} className="text-center text-xs text-gray-600 py-1">
                {day}
              </div>
            ))}
            
            {/* Empty cells before month starts */}
            {Array.from({ length: startingDayOfWeek }).map((_, index) => (
              <div key={`empty-${index}`} className="aspect-square"></div>
            ))}
            
            {/* Calendar days */}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const isSelected = day === 20; // Highlighting Nov 20
              
              return (
                <button
                  key={day}
                  className={`aspect-square flex items-center justify-center text-sm rounded transition-colors ${
                    isSelected 
                      ? 'bg-black text-white' 
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Main Content Area with Tabs */}
        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setActiveTab("tasks")}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm transition-colors ${
                activeTab === "tasks"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Tasks
            </button>
            <button
              onClick={() => setActiveTab("addTask")}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm transition-colors ${
                activeTab === "addTask"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Add Task
            </button>
            <button
              onClick={() => setActiveTab("equipmentBooking")}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm transition-colors ${
                activeTab === "equipmentBooking"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Equipment Booking
            </button>
            <button
              onClick={() => setActiveTab("personnel")}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm transition-colors ${
                activeTab === "personnel"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Personnel
            </button>
          </div>

          {/* Tab Content */}
          <Card className="p-6">
            {/* Tasks Tab */}
            {activeTab === "tasks" && (
              <div>
                <div className="mb-4">
                  <h2 className="text-lg mb-1">All Tasks</h2>
                  <p className="text-sm text-gray-600">View and manage your tasks</p>
                </div>

                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => handleToggleTask(task.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1">
                          <h3 className={`text-sm ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {task.title}
                          </h3>
                          <Badge className={`${getUrgencyColor(task.urgency)} text-xs px-2 py-0`}>
                            {task.urgency}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{task.description}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>Due: {task.deadline}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Task Tab */}
            {activeTab === "addTask" && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg mb-1">Create New Task</h2>
                  <p className="text-sm text-gray-600">Add a task with urgency level and deadline</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="task-title">Task Title *</Label>
                    <Input
                      id="task-title"
                      placeholder="Enter task title"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="task-description">Description</Label>
                    <Textarea
                      id="task-description"
                      placeholder="Enter task description"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="task-deadline">Deadline *</Label>
                    <div className="relative mt-1">
                      <Input
                        id="task-deadline"
                        type="date"
                        value={newTask.deadline}
                        onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                        className="pr-10"
                      />
                      <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="task-urgency">Urgency Level *</Label>
                    <Select
                      value={newTask.urgency}
                      onValueChange={(value: "urgent" | "low" | "medium") => setNewTask({ ...newTask, urgency: value })}
                    >
                      <SelectTrigger id="task-urgency" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleCreateTask}
                    disabled={!newTask.title || !newTask.deadline}
                    className="w-full bg-black hover:bg-gray-800"
                  >
                    Create Task
                  </Button>
                </div>
              </div>
            )}

            {/* Equipment Booking Tab */}
            {activeTab === "equipmentBooking" && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg mb-1">Equipment Booking</h2>
                  <p className="text-sm text-gray-600">Book equipment and prevent scheduling conflicts</p>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <Label htmlFor="equipment-name">Equipment Name *</Label>
                    <Input
                      id="equipment-name"
                      placeholder="e.g., Projector, Laptop, Conference Room"
                      value={newBooking.equipmentName}
                      onChange={(e) => setNewBooking({ ...newBooking, equipmentName: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start-time">Start Time *</Label>
                      <Input
                        id="start-time"
                        type="time"
                        value={newBooking.startTime}
                        onChange={(e) => setNewBooking({ ...newBooking, startTime: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-time">End Time *</Label>
                      <Input
                        id="end-time"
                        type="time"
                        value={newBooking.endTime}
                        onChange={(e) => setNewBooking({ ...newBooking, endTime: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="booked-by">Booked By *</Label>
                    <Input
                      id="booked-by"
                      placeholder="Your name"
                      value={newBooking.bookedBy}
                      onChange={(e) => setNewBooking({ ...newBooking, bookedBy: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="purpose">Purpose</Label>
                    <Input
                      id="purpose"
                      placeholder="What is this equipment needed for?"
                      value={newBooking.purpose}
                      onChange={(e) => setNewBooking({ ...newBooking, purpose: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <Button
                    onClick={handleBookEquipment}
                    disabled={!newBooking.equipmentName || !newBooking.startTime || !newBooking.endTime || !newBooking.bookedBy}
                    className="w-full bg-black hover:bg-gray-800"
                  >
                    Book Equipment
                  </Button>
                </div>

                {/* Bookings List */}
                <div>
                  <h3 className="text-sm mb-3">Bookings for November 20, 2025</h3>
                  <div className="space-y-3">
                    {bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                      >
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <CalendarIcon className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-sm text-gray-900">{booking.equipmentName}</h4>
                            <span className="text-xs text-gray-600 whitespace-nowrap">
                              {booking.startTime} - {booking.endTime}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">Booked by: {booking.bookedBy}</p>
                          <p className="text-xs text-gray-600">Purpose: {booking.purpose}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteBooking(booking.id)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Personnel Tab */}
            {activeTab === "personnel" && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg mb-1">Personnel Location Tracker</h2>
                  <p className="text-sm text-gray-600">Real-time visibility of team member locations and work hours</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card className="p-4 bg-green-50 border-green-200">
                    <p className="text-sm text-green-800 mb-1">Clocked In</p>
                    <p className="text-3xl text-green-900">{activePersonnel}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-gray-600 mb-1">Total Hours</p>
                    <p className="text-3xl text-gray-900">{totalHours.toFixed(1)}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-gray-600 mb-1">Average Hours</p>
                    <p className="text-3xl text-gray-900">{avgHours}</p>
                  </Card>
                </div>

                {/* Export Button */}
                <div className="flex items-center justify-between mb-4">
                  <div />
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-3 gap-4 mb-6">
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

                {/* Personnel List */}
                <div className="space-y-3">
                  {filteredPersonnel.map((person) => (
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
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}