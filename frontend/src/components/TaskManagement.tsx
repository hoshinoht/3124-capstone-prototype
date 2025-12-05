import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Clock, Trash2, Bell, Calendar as CalendarIcon, Loader2, FolderKanban, Users, X } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { tasksApi, equipmentApi, projectsApi, Project, TaskAssignee } from "../services/api";

interface Task {
  id: number;
  title: string;
  description: string;
  urgency: "urgent" | "medium" | "low";
  deadline: string;
  completed: boolean;
  projectId?: string;
  projectName?: string;
  taskType?: "task" | "meeting";
  assignees?: TaskAssignee[];
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

type TabType = "tasks" | "addTask" | "equipmentBooking";

const COMPLETED_TASKS_PAGE_SIZE = 10;

export function TaskManagement() {
  const [activeTab, setActiveTab] = useState<TabType>("tasks");
  const [currentDate, setCurrentDate] = useState(new Date()); // Today's date
  const [selectedDate, setSelectedDate] = useState(new Date()); // Selected date for bookings
  const [showAllTasks, setShowAllTasks] = useState(false); // Toggle to show all tasks
  const [showCompletedTasks, setShowCompletedTasks] = useState(false); // Toggle to show completed tasks
  const [loading, setLoading] = useState(true);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [completedTasksPage, setCompletedTasksPage] = useState(1);
  const [completedTasksTotal, setCompletedTasksTotal] = useState(0);
  const [loadingCompletedTasks, setLoadingCompletedTasks] = useState(false);

  // Task detail modal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const [bookings, setBookings] = useState<EquipmentBooking[]>([]);

  const [projects, setProjects] = useState<Project[]>([]);

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    deadline: "",
    urgency: "medium" as "urgent" | "low" | "medium",
    projectId: "",
    taskType: "task" as "task" | "meeting",
  });

  const [newBooking, setNewBooking] = useState({
    equipmentName: "",
    startTime: "",
    endTime: "",
    bookedBy: "",
    purpose: "",
  });

  // Function to fetch completed tasks with pagination
  const fetchCompletedTasks = async (page: number) => {
    try {
      setLoadingCompletedTasks(true);
      const offset = (page - 1) * COMPLETED_TASKS_PAGE_SIZE;
      const response = await tasksApi.getAll({
        isCompleted: true,
        limit: COMPLETED_TASKS_PAGE_SIZE,
        offset: offset,
      });
      if (response.data?.tasks) {
        setCompletedTasks(response.data.tasks.map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description || "",
          urgency: t.priority === "high" || t.urgency === "urgent" ? "urgent" : (t.urgency === "medium" ? "medium" : "low"),
          deadline: t.due_date || t.deadline || "No deadline",
          completed: true,
          projectId: t.projectId || t.project_id,
          projectName: t.projectName || t.project_name,
          taskType: t.task_type || t.taskType || "task",
          assignees: t.assignees || [],
        })));
        setCompletedTasksTotal(response.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch completed tasks:", err);
    } finally {
      setLoadingCompletedTasks(false);
    }
  };

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch active (non-completed) tasks
        try {
          const response = await tasksApi.getAll({ isCompleted: false });
          if (response.data?.tasks) {
            setTasks(response.data.tasks.map((t: any) => ({
              id: t.id,
              title: t.title,
              description: t.description || "",
              urgency: t.priority === "high" || t.urgency === "urgent" ? "urgent" : (t.urgency === "medium" ? "medium" : "low"),
              deadline: t.due_date || t.deadline || "No deadline",
              completed: t.is_completed || t.isCompleted || false,
              projectId: t.projectId || t.project_id,
              projectName: t.projectName || t.project_name,
              taskType: t.task_type || t.taskType || "task",
              assignees: t.assignees || [],
            })));
          }
        } catch (err) {
          console.error("Failed to fetch tasks:", err);
        }

        // Fetch equipment bookings
        try {
          const response = await equipmentApi.getMyBookings();
          if (response.data?.bookings) {
            setBookings(response.data.bookings.map((b: any) => ({
              id: b.id,
              equipmentName: b.equipment_name || b.equipmentName || "Unknown Equipment",
              startTime: b.start_time || b.startTime || "",
              endTime: b.end_time || b.endTime || "",
              bookedBy: b.booked_by || b.bookedBy || "Unknown",
              purpose: b.purpose || "",
              date: b.date || b.start_date || b.startDate || "",
            })));
          }
        } catch (err) {
          console.error("Failed to fetch equipment bookings:", err);
        }

        // Fetch projects
        try {
          const response = await projectsApi.getAll();
          if (response.data?.projects) {
            setProjects(response.data.projects);
          }
        } catch (err) {
          console.error("Failed to fetch projects:", err);
        }

      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch completed tasks when toggling view or changing page
  useEffect(() => {
    if (showCompletedTasks) {
      fetchCompletedTasks(completedTasksPage);
    }
  }, [showCompletedTasks, completedTasksPage]);

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

  // Format date for display
  const formatSelectedDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  // Filter tasks by selected date
  const getTasksForDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = formatSelectedDate(date);

    // Format date as YYYY-MM-DD for comparison with ISO dates (use local date parts to avoid timezone issues)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const isoDateStr = `${year}-${month}-${day}`;

    return tasks.filter(task => {
      if (!task.deadline) return false;
      const deadline = task.deadline.toLowerCase();
      // Check for "Today", "Tomorrow", or exact date match
      if (dateStr === "Today" && deadline === "today") return true;
      if (dateStr === "Tomorrow" && deadline === "tomorrow") return true;
      // Check if deadline matches ISO format (YYYY-MM-DD)
      if (task.deadline === isoDateStr) return true;
      // Check if deadline starts with the ISO date (handles datetime strings)
      if (task.deadline.startsWith(isoDateStr)) return true;
      // Check if deadline contains the formatted date
      if (task.deadline.includes(`${monthNames[date.getMonth()]} ${date.getDate()}`)) return true;
      // Try parsing deadline as a date
      const taskDate = new Date(task.deadline);
      if (!isNaN(taskDate.getTime())) {
        return taskDate.toDateString() === date.toDateString();
      }
      return false;
    });
  };

  const filteredTasks = getTasksForDate(selectedDate);

  // Pagination for completed tasks
  const completedTasksTotalPages = Math.ceil(completedTasksTotal / COMPLETED_TASKS_PAGE_SIZE);
  const handleCompletedTasksPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= completedTasksTotalPages) {
      setCompletedTasksPage(newPage);
    }
  };

  // Get the highest severity task for a given date (for calendar dots)
  const getHighestSeverityForDate = (date: Date): "urgent" | "medium" | "low" | null => {
    const tasksForDate = getTasksForDate(date).filter(t => !t.completed);
    if (tasksForDate.length === 0) return null;

    // Priority: urgent > medium > low
    if (tasksForDate.some(t => t.urgency === "urgent")) return "urgent";
    if (tasksForDate.some(t => t.urgency === "medium")) return "medium";
    return "low";
  };

  // Get dot color based on severity
  const getSeverityDotColor = (severity: "urgent" | "medium" | "low" | null): string => {
    switch (severity) {
      case "urgent": return "bg-red-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "";
    }
  };

  const handleToggleTask = async (taskId: number, isFromCompletedList: boolean = false) => {
    const taskList = isFromCompletedList ? completedTasks : tasks;
    const task = taskList.find(t => t.id === taskId);
    if (!task) return;

    // Optimistic update
    if (isFromCompletedList) {
      setCompletedTasks(completedTasks.filter(t => t.id !== taskId));
      setTasks([...tasks, { ...task, completed: false }]);
    } else {
      setTasks(tasks.filter(t => t.id !== taskId));
    }

    try {
      await tasksApi.update(String(taskId), { isCompleted: !task.completed });
      // Refresh completed tasks if viewing them
      if (showCompletedTasks) {
        fetchCompletedTasks(completedTasksPage);
      }
    } catch (err) {
      console.error("Failed to update task:", err);
      // Revert on error
      if (isFromCompletedList) {
        setCompletedTasks([...completedTasks]);
        setTasks(tasks.filter(t => t.id !== taskId));
      } else {
        setTasks([...tasks, task]);
      }
    }
  };

  const handleDeleteTask = async (taskId: number, isFromCompletedList: boolean = false) => {
    if (isFromCompletedList) {
      const originalCompletedTasks = [...completedTasks];
      setCompletedTasks(completedTasks.filter(task => task.id !== taskId));

      try {
        await tasksApi.delete(String(taskId));
        // Refresh to update pagination
        fetchCompletedTasks(completedTasksPage);
      } catch (err) {
        console.error("Failed to delete task:", err);
        setCompletedTasks(originalCompletedTasks);
      }
    } else {
      const originalTasks = [...tasks];
      setTasks(tasks.filter(task => task.id !== taskId));

      try {
        await tasksApi.delete(String(taskId));
      } catch (err) {
        console.error("Failed to delete task:", err);
        setTasks(originalTasks);
      }
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.deadline) return;

    const tempId = Date.now();
    const selectedProject = projects.find(p => p.id === newTask.projectId);
    const task: Task = {
      id: tempId,
      title: newTask.title,
      description: newTask.description,
      urgency: newTask.urgency,
      deadline: newTask.deadline,
      completed: false,
      projectId: newTask.projectId || undefined,
      projectName: selectedProject?.name,
      taskType: newTask.taskType,
    };

    // Optimistic update
    setTasks([...tasks, task]);
    setNewTask({ title: "", description: "", deadline: "", urgency: "medium", projectId: "", taskType: "task" });
    setActiveTab("tasks");

    try {
      const response = await tasksApi.create({
        title: newTask.title,
        description: newTask.description,
        urgency: newTask.urgency,
        department: "IT",
        deadline: newTask.deadline,
        projectId: newTask.projectId || undefined,
      });

      // Update with real ID
      if (response.success && response.data?.task) {
        setTasks(prev => prev.map(t =>
          t.id === tempId ? { ...t, id: response.data.task.id } : t
        ));
      }
    } catch (err) {
      console.error("Failed to create task:", err);
      setTasks(prev => prev.filter(t => t.id !== tempId));
    }
  };

  const handleBookEquipment = async () => {
    if (!newBooking.equipmentName || !newBooking.startTime || !newBooking.endTime || !newBooking.bookedBy) return;

    const tempId = Date.now();
    const bookingDate = selectedDate.toISOString().split('T')[0];
    const booking: EquipmentBooking = {
      id: tempId,
      ...newBooking,
      date: selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    };

    // Create a corresponding task for the booking
    const taskTempId = tempId + 1;
    const bookingTask: Task = {
      id: taskTempId,
      title: `Equipment: ${newBooking.equipmentName}`,
      description: `Booked by ${newBooking.bookedBy}${newBooking.purpose ? ` - ${newBooking.purpose}` : ''}\nTime: ${newBooking.startTime} - ${newBooking.endTime}`,
      urgency: "low",
      deadline: bookingDate,
      completed: false,
      taskType: "meeting",
    };

    // Optimistic update for both booking and task
    setBookings([...bookings, booking]);
    setTasks([...tasks, bookingTask]);
    setNewBooking({ equipmentName: "", startTime: "", endTime: "", bookedBy: "", purpose: "" });

    try {
      // Create booking
      const response = await equipmentApi.createBooking({
        equipmentId: "temp", // The API should handle this
        startDate: bookingDate,
        endDate: bookingDate,
        purpose: newBooking.purpose,
        department: "IT",
      });

      if (response.data?.booking) {
        setBookings(prev => prev.map(b =>
          b.id === tempId ? { ...b, id: response.data.booking.id } : b
        ));
      }

      // Create task for the booking
      const taskResponse = await tasksApi.create({
        title: `Equipment: ${newBooking.equipmentName}`,
        description: `Booked by ${newBooking.bookedBy}${newBooking.purpose ? ` - ${newBooking.purpose}` : ''}\nTime: ${newBooking.startTime} - ${newBooking.endTime}`,
        urgency: "low",
        department: "IT",
        deadline: bookingDate,
      });

      if (taskResponse.success && taskResponse.data?.task) {
        setTasks(prev => prev.map(t =>
          t.id === taskTempId ? { ...t, id: taskResponse.data.task.id } : t
        ));
      }
    } catch (err) {
      console.error("Failed to create booking:", err);
      // Keep local booking and task on error (graceful degradation)
    }
  };

  const handleDeleteBooking = async (bookingId: number) => {
    const originalBookings = [...bookings];
    setBookings(bookings.filter(booking => booking.id !== bookingId));

    try {
      await equipmentApi.deleteBooking(String(bookingId));
    } catch (err) {
      console.error("Failed to delete booking:", err);
      setBookings(originalBookings);
    }
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

  const formatAssignees = (assignees?: TaskAssignee[]) => {
    if (!assignees || assignees.length === 0) return null;
    if (assignees.length <= 2) {
      return assignees.map(a => a.firstName || a.name?.split(' ')[0] || 'Unknown').join(', ');
    }
    return `${assignees[0].firstName || assignees[0].name?.split(' ')[0] || 'Unknown'} +${assignees.length - 1}`;
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
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
          <h1 className="text-2xl text-gray-900 mb-1">Task & Schedule Manager</h1>
          <p className="text-sm text-gray-600">Manage your tasks and equipment bookings efficiently</p>
        </div>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-600" />
          <Badge className="bg-black text-white hover:bg-black">Notifications On</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-[300px,1fr] gap-6">
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
              const dateForDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
              const isSelected = selectedDate.getDate() === day &&
                selectedDate.getMonth() === currentDate.getMonth() &&
                selectedDate.getFullYear() === currentDate.getFullYear();
              const isToday = new Date().getDate() === day &&
                new Date().getMonth() === currentDate.getMonth() &&
                new Date().getFullYear() === currentDate.getFullYear();
              const severity = getHighestSeverityForDate(dateForDay);

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(dateForDay)}
                  className={`aspect-square flex items-center justify-center text-sm rounded transition-colors relative ${isSelected
                    ? 'bg-black text-white'
                    : isToday
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'hover:bg-gray-100 text-gray-700'
                    }`}
                >
                  {day}
                  {severity && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '2px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: severity === 'urgent' ? '#ef4444' : severity === 'medium' ? '#eab308' : '#22c55e'
                      }}
                    />
                  )}
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
              className={`flex-1 py-2.5 px-4 rounded-md text-sm transition-colors ${activeTab === "tasks"
                ? "bg-gray-100 text-gray-900"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              Tasks
            </button>
            <button
              onClick={() => setActiveTab("addTask")}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm transition-colors ${activeTab === "addTask"
                ? "bg-gray-100 text-gray-900"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              Add Task
            </button>
            <button
              onClick={() => setActiveTab("equipmentBooking")}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm transition-colors ${activeTab === "equipmentBooking"
                ? "bg-gray-100 text-gray-900"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              Equipment Booking
            </button>
          </div>

          {/* Tab Content */}
          <Card className="p-6">
            {/* Tasks Tab */}
            {activeTab === "tasks" && (
              <div>
                {/* View Toggle */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => { setShowCompletedTasks(false); setShowAllTasks(false); }}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${!showCompletedTasks && !showAllTasks
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                  >
                    By Date
                  </button>
                  <button
                    onClick={() => { setShowCompletedTasks(false); setShowAllTasks(true); }}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${!showCompletedTasks && showAllTasks
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                  >
                    All Active
                  </button>
                  <button
                    onClick={() => { setShowCompletedTasks(true); setShowAllTasks(false); setCompletedTasksPage(1); }}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${showCompletedTasks
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                  >
                    Completed
                  </button>
                </div>

                {/* Completed Tasks View with Pagination */}
                {showCompletedTasks ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg mb-1">Completed Tasks</h2>
                        <p className="text-sm text-gray-600">
                          {completedTasksTotal} completed task{completedTasksTotal === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>

                    {loadingCompletedTasks ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      </div>
                    ) : completedTasks.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No completed tasks yet</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {completedTasks.map((task) => (
                            <div
                              key={task.id}
                              onClick={() => handleTaskClick(task)}
                              className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-gray-50 cursor-pointer"
                            >
                              <Checkbox
                                checked={true}
                                onCheckedChange={(e) => {
                                  e.stopPropagation?.();
                                  handleToggleTask(task.id, true);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2 mb-1 flex-wrap">
                                  <span className="text-sm">{task.taskType === "meeting" ? "📅" : "📋"}</span>
                                  <h3 className="text-sm line-through text-gray-500">
                                    {task.title}
                                  </h3>
                                  {task.taskType === "meeting" && (
                                    <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs px-2 py-0">
                                      Meeting
                                    </Badge>
                                  )}
                                  <Badge className={`${getUrgencyColor(task.urgency)} text-xs px-2 py-0`}>
                                    {task.urgency}
                                  </Badge>
                                  {task.projectName && (
                                    <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-xs px-2 py-0">
                                      <FolderKanban className="w-3 h-3 mr-1" />
                                      {task.projectName}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mb-2">{task.description}</p>
                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{task.taskType === "meeting" ? "Date:" : "Due:"} {task.deadline}</span>
                                  </div>
                                  {task.assignees && task.assignees.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Users className="w-3 h-3" />
                                      <span>{formatAssignees(task.assignees)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTask(task.id, true);
                                }}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Pagination Controls */}
                        {completedTasksTotalPages > 1 && (
                          <div className="flex items-center justify-center gap-2 mt-6">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCompletedTasksPageChange(completedTasksPage - 1)}
                              disabled={completedTasksPage === 1}
                              className="px-3"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: completedTasksTotalPages }, (_, i) => i + 1).map((page) => (
                                <Button
                                  key={page}
                                  variant={page === completedTasksPage ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleCompletedTasksPageChange(page)}
                                  className={`w-8 h-8 p-0 ${page === completedTasksPage ? 'bg-gray-900' : ''}`}
                                >
                                  {page}
                                </Button>
                              ))}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCompletedTasksPageChange(completedTasksPage + 1)}
                              disabled={completedTasksPage === completedTasksTotalPages}
                              className="px-3"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        )}

                        {/* Page Info */}
                        <p className="text-center text-xs text-gray-500 mt-2">
                          Page {completedTasksPage} of {completedTasksTotalPages} ({completedTasksTotal} total)
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  /* Active Tasks View */
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg mb-1">
                          {showAllTasks ? "All Active Tasks" : `Tasks for ${formatSelectedDate(selectedDate)}`}
                        </h2>
                        <p className="text-sm text-gray-600">
                          {showAllTasks
                            ? `${tasks.length} active task${tasks.length === 1 ? '' : 's'}`
                            : filteredTasks.length === 0
                              ? "No tasks scheduled for this date"
                              : `${filteredTasks.length} task${filteredTasks.length === 1 ? '' : 's'} scheduled`}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {!showAllTasks && filteredTasks.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No tasks for {formatSelectedDate(selectedDate)}</p>
                          <button
                            onClick={() => setActiveTab("addTask")}
                            className="mt-2 text-sm text-blue-600 hover:underline"
                          >
                            + Add a task for this date
                          </button>
                        </div>
                      ) : (
                        (showAllTasks ? tasks : filteredTasks).map((task) => (
                          <div
                            key={task.id}
                            onClick={() => handleTaskClick(task)}
                            className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <Checkbox
                              checked={task.completed}
                              onCheckedChange={(e) => {
                                e.stopPropagation?.();
                                handleToggleTask(task.id);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 mb-1 flex-wrap">
                                <span className="text-sm">{task.taskType === "meeting" ? "📅" : "📋"}</span>
                                <h3 className={`text-sm ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                  {task.title}
                                </h3>
                                {task.taskType === "meeting" && (
                                  <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs px-2 py-0">
                                    Meeting
                                  </Badge>
                                )}
                                <Badge className={`${getUrgencyColor(task.urgency)} text-xs px-2 py-0`}>
                                  {task.urgency}
                                </Badge>
                                {task.projectName && (
                                  <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-xs px-2 py-0">
                                    <FolderKanban className="w-3 h-3 mr-1" />
                                    {task.projectName}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mb-2">{task.description}</p>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{task.taskType === "meeting" ? "Date:" : "Due:"} {task.deadline}</span>
                                </div>
                                {task.assignees && task.assignees.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    <span>{formatAssignees(task.assignees)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task.id);
                              }}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        )))
                      }
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Add Task Tab */}
            {activeTab === "addTask" && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg mb-1">Create New Task</h2>
                  <p className="text-sm text-gray-600">Add a task or meeting with urgency level and deadline</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="task-type">Task Type *</Label>
                    <Select
                      value={newTask.taskType}
                      onValueChange={(value: "task" | "meeting") => setNewTask({ ...newTask, taskType: value })}
                    >
                      <SelectTrigger id="task-type" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="task">📋 Task</SelectItem>
                        <SelectItem value="meeting">📅 Meeting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="task-title">{newTask.taskType === "meeting" ? "Meeting Title *" : "Task Title *"}</Label>
                    <Input
                      id="task-title"
                      placeholder={newTask.taskType === "meeting" ? "Enter meeting title" : "Enter task title"}
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="task-description">Description</Label>
                    <Textarea
                      id="task-description"
                      placeholder={newTask.taskType === "meeting" ? "Enter meeting agenda or notes" : "Enter task description"}
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="task-deadline">{newTask.taskType === "meeting" ? "Meeting Date *" : "Deadline *"}</Label>
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

                  <div>
                    <Label htmlFor="task-project">Project (Optional)</Label>
                    <Select
                      value={newTask.projectId || "none"}
                      onValueChange={(value) => setNewTask({ ...newTask, projectId: value === "none" ? undefined : value })}
                    >
                      <SelectTrigger id="task-project" className="mt-1">
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Project</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleCreateTask}
                    disabled={!newTask.title || !newTask.deadline}
                    className="w-full bg-black hover:bg-gray-800"
                  >
                    {newTask.taskType === "meeting" ? "Create Meeting" : "Create Task"}
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
          </Card>
        </div>
      </div>

      {/* Task Detail Modal */}
      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{selectedTask?.taskType === "meeting" ? "📅" : "📋"}</span>
              {selectedTask?.title}
            </DialogTitle>
            <DialogDescription>
              Task Details
            </DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-4 mt-4">
              {/* Status & Urgency */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={selectedTask.completed ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
                  {selectedTask.completed ? "Completed" : "Active"}
                </Badge>
                <Badge className={`${getUrgencyColor(selectedTask.urgency)}`}>
                  {selectedTask.urgency}
                </Badge>
                {selectedTask.taskType === "meeting" && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                    Meeting
                  </Badge>
                )}
              </div>

              {/* Description */}
              {selectedTask.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {selectedTask.description}
                  </p>
                </div>
              )}

              {/* Deadline */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  {selectedTask.taskType === "meeting" ? "Date" : "Deadline"}
                </h4>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{selectedTask.deadline}</span>
                </div>
              </div>

              {/* Project */}
              {selectedTask.projectName && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Project</h4>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                      <FolderKanban className="w-3 h-3 mr-1" />
                      {selectedTask.projectName}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Assignees */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Assigned To</h4>
                {selectedTask.assignees && selectedTask.assignees.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTask.assignees.map((assignee, index) => (
                      <div
                        key={assignee.id || index}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-700">
                            {(assignee.firstName?.[0] || assignee.name?.[0] || '?').toUpperCase()}
                            {(assignee.lastName?.[0] || assignee.name?.split(' ')[1]?.[0] || '').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {assignee.name || `${assignee.firstName || ''} ${assignee.lastName || ''}`.trim() || 'Unknown'}
                          </p>
                          {assignee.email && (
                            <p className="text-xs text-gray-500">{assignee.email}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No assignees</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsTaskModalOpen(false)}
                >
                  Close
                </Button>
                <Button
                  variant={selectedTask.completed ? "outline" : "default"}
                  onClick={() => {
                    handleToggleTask(selectedTask.id, selectedTask.completed);
                    setIsTaskModalOpen(false);
                  }}
                >
                  {selectedTask.completed ? "Mark as Active" : "Mark as Complete"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}