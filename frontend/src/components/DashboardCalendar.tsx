import { useState, useEffect } from "react";
import {
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isToday as checkIsToday
} from "date-fns";
import { ChevronLeft, ChevronRight, Video, Package, FileText, Loader2, Calendar } from "lucide-react";
import { eventsApi } from "../services/api";

interface CalendarEvent {
  id: string;
  time: string;
  title: string;
  description: string;
  type: "deadline" | "meeting" | "delivery";
  date: Date;
}

export function DashboardCalendar() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [currentMonth, setCurrentMonth] = useState<Date>(today);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Fetch events when month changes
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
        const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

        const response = await eventsApi.getAll({ startDate, endDate });

        if (response.data?.events) {
          const mappedEvents = response.data.events.map((e: any) => {
            const eventDate = e.eventDate || e.event_date || e.date;
            const startTime = e.startTime || e.start_time || "09:00";

            return {
              id: e.id,
              time: formatTime(startTime),
              title: e.title,
              description: e.description || "",
              type: (e.eventType || e.event_type || e.type || "meeting") as CalendarEvent["type"],
              date: parseISO(eventDate),
            };
          });
          setEvents(mappedEvents);
        } else {
          setEvents([]);
        }
      } catch (err) {
        console.error("Failed to fetch events:", err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [currentMonth]);

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(":");
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? "pm" : "am";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes}${ampm}`;
    } catch {
      return time;
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date));
  };

  const hasEventsOnDate = (date: Date) => {
    return events.some(event => isSameDay(event.date, date));
  };

  const getEventBackgroundColor = (type: string) => {
    switch (type) {
      case "meeting":
        return "bg-green-100 border-l-4 border-green-500";
      case "delivery":
        return "bg-blue-100 border-l-4 border-blue-500";
      case "deadline":
        return "bg-red-100 border-l-4 border-red-500";
      default:
        return "bg-gray-100 border-l-4 border-gray-500";
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "meeting":
        return <Video className="w-4 h-4 text-green-600" />;
      case "delivery":
        return <Package className="w-4 h-4 text-blue-600" />;
      case "deadline":
        return <FileText className="w-4 h-4 text-red-600" />;
      default:
        return <Calendar className="w-4 h-4 text-gray-600" />;
    }
  };

  // Calendar grid generation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const selectedDateEvents = getEventsForDate(selectedDate);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleDateClick = (date: Date) => setSelectedDate(date);

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Calendar Section */}
        <div className="flex flex-col">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <div className="flex gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Week day headers */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: startDayOfWeek }).map((_, index) => (
              <div key={`empty-${index}`} className="aspect-square" />
            ))}

            {/* Days of the month */}
            {daysInMonth.map((date) => {
              const isSelected = isSameDay(date, selectedDate);
              const isToday = checkIsToday(date);
              const hasEvents = hasEventsOnDate(date);

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => handleDateClick(date)}
                  className={`
                    aspect-square flex flex-col items-center justify-center rounded-lg text-sm
                    transition-all duration-150 relative cursor-pointer
                    ${isSelected
                      ? "bg-blue-600 text-white font-semibold"
                      : isToday
                        ? "bg-blue-100 text-blue-700 font-semibold"
                        : "hover:bg-gray-100 text-gray-700"
                    }
                  `}
                >
                  <span>{format(date, "d")}</span>
                  {hasEvents && !isSelected && (
                    <div className="absolute bottom-1 w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  )}
                  {hasEvents && isSelected && (
                    <div className="absolute bottom-1 w-1.5 h-1.5 bg-white rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Today button */}
          <button
            onClick={() => {
              setCurrentMonth(today);
              setSelectedDate(today);
            }}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Go to Today
          </button>
        </div>

        {/* Events Panel */}
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Selected Date</label>
            <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-gray-900 font-medium">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                {/* Table Header */}
                <div className="grid grid-cols-3 border-b border-gray-200 bg-gray-50">
                  <div className="p-3 border-r border-gray-200 font-medium text-sm text-gray-700">Time</div>
                  <div className="p-3 border-r border-gray-200 font-medium text-sm text-gray-700">Event</div>
                  <div className="p-3 font-medium text-sm text-gray-700">Description</div>
                </div>

                {/* Table Rows */}
                {selectedDateEvents.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No events for this date</p>
                  </div>
                ) : (
                  selectedDateEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`grid grid-cols-3 border-b border-gray-200 last:border-b-0 ${getEventBackgroundColor(event.type)}`}
                    >
                      <div className="p-3 border-r border-gray-200 text-sm font-medium">{event.time}</div>
                      <div className="p-3 border-r border-gray-200 flex items-center gap-2 text-sm">
                        {getEventIcon(event.type)}
                        <span className="font-medium">{event.title}</span>
                      </div>
                      <div className="p-3 text-sm text-gray-600">{event.description}</div>
                    </div>
                  ))
                )}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-gray-600">Deadline</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Meeting</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600">Delivery</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}