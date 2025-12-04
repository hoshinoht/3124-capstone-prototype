import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Search, Video, Package, FileText, PartyPopper, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { eventsApi } from "../services/api";

interface CalendarEvent {
  id: number;
  time: string;
  title: string;
  description: string;
  type: "deadline" | "meeting" | "delivery";
  date: Date;
}

export function DashboardCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 8)); // January 8, 2026
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 0, 8));
  const [loading, setLoading] = useState(true);

  // Default mock events
  const [events, setEvents] = useState<CalendarEvent[]>([
    { id: 1, time: "9:30am", title: "MsTeams", description: "Meeting with NUHS", type: "meeting", date: new Date(2026, 0, 8) },
    { id: 2, time: "1:30pm", title: "MsTeams", description: "Interview - New Intern Applicant", type: "meeting", date: new Date(2026, 0, 8) },
    { id: 3, time: "3:00pm", title: "Delivery", description: "Delivery of IAQ sensors", type: "delivery", date: new Date(2026, 0, 8) },
    { id: 4, time: "6:00pm", title: "Use Case", description: "Submission of Use Case report to client", type: "deadline", date: new Date(2026, 0, 8) },
  ]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const eventsData = await eventsApi.getEvents();
        if (eventsData && eventsData.length > 0) {
          setEvents(eventsData.map((e: any) => ({
            id: e.id,
            time: e.time || new Date(e.start_time || e.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            title: e.title,
            description: e.description || "",
            type: e.type || "meeting",
            date: new Date(e.date || e.start_time),
          })));
        }
      } catch (err) {
        console.error("Failed to fetch events:", err);
        // Keep default mock data
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const hasEventOnDate = (day: number) => {
    return events.some(event =>
      event.date.getDate() === day &&
      event.date.getMonth() === currentDate.getMonth() &&
      event.date.getFullYear() === currentDate.getFullYear()
    );
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event =>
      event.date.getDate() === date.getDate() &&
      event.date.getMonth() === date.getMonth() &&
      event.date.getFullYear() === date.getFullYear()
    );
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

  const getEventBackgroundColor = (type: string) => {
    switch (type) {
      case "meeting":
        return "bg-green-400";
      case "delivery":
        return "bg-blue-400";
      case "deadline":
        return "bg-red-400";
      default:
        return "bg-gray-400";
    }
  };

  const getEventIcon = (event: CalendarEvent) => {
    if (event.type === "meeting") {
      return <Video className="w-4 h-4" />;
    } else if (event.type === "delivery") {
      return <Package className="w-4 h-4" />;
    } else {
      return <FileText className="w-4 h-4" />;
    }
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Calendar Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
            <div className="flex gap-2">
              <button
                onClick={previousMonth}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {/* Day headers */}
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center py-2">
                {day}
              </div>
            ))}

            {/* Empty cells before month starts */}
            {Array.from({ length: startingDayOfWeek }).map((_, index) => (
              <div key={`empty-${index}`}></div>
            ))}

            {/* Calendar days */}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const hasEvent = hasEventOnDate(day);
              const isNewYear = day === 1 && currentDate.getMonth() === 0;
              const isSelected = selectedDate.getDate() === day &&
                selectedDate.getMonth() === currentDate.getMonth();

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                  className={`aspect-square flex items-center justify-center text-2xl relative hover:bg-gray-100 rounded transition-colors ${isSelected ? 'bg-blue-100 border-2 border-blue-500' : ''
                    }`}
                >
                  {day}
                  {isNewYear && (
                    <div className="absolute top-0 right-0">
                      <PartyPopper className="w-3 h-3 text-yellow-500" />
                    </div>
                  )}
                  {hasEvent && !isNewYear && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Events Panel */}
        <div>
          <div className="mb-4">
            <label className="block mb-2">Select Date</label>
            <div className="relative">
              <Input
                value={selectedDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                readOnly
                className="pr-10"
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-500" />
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
            {/* Table Header */}
            <div className="grid grid-cols-3 border-b border-gray-200 bg-gray-50">
              <div className="p-3 border-r border-gray-200 font-medium">Time</div>
              <div className="p-3 border-r border-gray-200 font-medium">Event</div>
              <div className="p-3 font-medium">Description</div>
            </div>

            {/* Table Rows */}
            {selectedDateEvents.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No events for this date
              </div>
            ) : (
              selectedDateEvents.map((event) => (
                <div key={event.id} className={`grid grid-cols-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors ${getEventBackgroundColor(event.type)}`}>
                  <div className="p-3 border-r border-gray-200">{event.time}</div>
                  <div className="p-3 border-r border-gray-200 flex items-center gap-2">
                    {getEventIcon(event)}
                    <span>{event.title}</span>
                  </div>
                  <div className="p-3">{event.description}</div>
                </div>
              ))
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-400 rounded-full"></div>
              <span>Deadline</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-400 rounded-full"></div>
              <span>Meeting</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-400 rounded-full"></div>
              <span>Delivery</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}