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
import { ChevronLeft, ChevronRight, Video, Package, FileText, Loader2, Calendar, Plus, UserMinus, Users } from "lucide-react";
import { eventsApi, usersApi, User } from "../services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface EventAttendee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface CalendarEvent {
  id: string;
  time: string;
  title: string;
  description: string;
  type: "deadline" | "meeting" | "delivery";
  date: Date;
  attendees?: EventAttendee[];
}

export function DashboardCalendar() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [currentMonth, setCurrentMonth] = useState<Date>(today);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Event detail modal state
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [addingAttendee, setAddingAttendee] = useState(false);
  const [removingAttendeeId, setRemovingAttendeeId] = useState<string | null>(null);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  // Fetch users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await usersApi.getAll();
        if (response.data?.users) {
          setAllUsers(response.data.users);
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };
    fetchUsers();
  }, []);

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

  // Open event detail modal and fetch attendees
  const handleEventClick = async (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventModalOpen(true);
    setLoadingAttendees(true);

    try {
      const response = await eventsApi.getEventAttendees(event.id);
      if (response.data?.attendees) {
        setSelectedEvent({
          ...event,
          attendees: response.data.attendees.map((a: any) => ({
            id: a.id,
            firstName: a.firstName,
            lastName: a.lastName,
            email: a.email,
          })),
        });
      }
    } catch (err) {
      console.error("Failed to fetch attendees:", err);
    } finally {
      setLoadingAttendees(false);
    }
  };

  // Add attendee to event
  const handleAddAttendee = async (eventId: string, userId: string) => {
    if (!userId) return;

    setAddingAttendee(true);
    try {
      await eventsApi.addEventAttendees(eventId, [userId]);

      // Find the user and add to the selected event's attendees
      const user = allUsers.find(u => u.id === userId);
      if (user && selectedEvent) {
        const newAttendee: EventAttendee = {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        };
        const updatedEvent = {
          ...selectedEvent,
          attendees: [...(selectedEvent.attendees || []), newAttendee],
        };
        setSelectedEvent(updatedEvent);

        // Update the event in the events list
        setEvents(events.map(e => e.id === eventId ? updatedEvent : e));
      }

      setSelectedUserId("");
    } catch (err) {
      console.error("Failed to add attendee:", err);
    } finally {
      setAddingAttendee(false);
    }
  };

  // Remove attendee from event
  const handleRemoveAttendee = async (eventId: string, userId: string) => {
    setRemovingAttendeeId(userId);
    try {
      await eventsApi.removeEventAttendee(eventId, userId);

      // Remove the attendee from the selected event
      if (selectedEvent) {
        const updatedEvent = {
          ...selectedEvent,
          attendees: (selectedEvent.attendees || []).filter(a => a.id !== userId),
        };
        setSelectedEvent(updatedEvent);

        // Update the event in the events list
        setEvents(events.map(e => e.id === eventId ? updatedEvent : e));
      }
    } catch (err) {
      console.error("Failed to remove attendee:", err);
    } finally {
      setRemovingAttendeeId(null);
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
                      onClick={() => handleEventClick(event)}
                      className={`grid grid-cols-3 border-b border-gray-200 last:border-b-0 cursor-pointer hover:opacity-80 transition-opacity ${getEventBackgroundColor(event.type)}`}
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

      {/* Event Detail Modal */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && getEventIcon(selectedEvent.type)}
              {selectedEvent?.title}
            </DialogTitle>
            <DialogDescription>
              Event Details
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4 mt-4">
              {/* Event Type & Time */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-1 text-xs font-medium rounded capitalize ${selectedEvent.type === 'meeting' ? 'bg-green-100 text-green-700' :
                    selectedEvent.type === 'deadline' ? 'bg-red-100 text-red-700' :
                      selectedEvent.type === 'delivery' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                  }`}>
                  {selectedEvent.type}
                </span>
                <span className="text-sm text-gray-600">
                  {selectedEvent.time} • {format(selectedEvent.date, "MMMM d, yyyy")}
                </span>
              </div>

              {/* Description */}
              {selectedEvent.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {/* Attendees */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Attendees
                </h4>

                {loadingAttendees ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  </div>
                ) : selectedEvent.attendees && selectedEvent.attendees.length > 0 ? (
                  <div className="space-y-2">
                    {selectedEvent.attendees.map((attendee, index) => (
                      <div
                        key={attendee.id || index}
                        className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-700">
                              {attendee.firstName?.[0]?.toUpperCase() || '?'}
                              {attendee.lastName?.[0]?.toUpperCase() || ''}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {`${attendee.firstName || ''} ${attendee.lastName || ''}`.trim() || 'Unknown'}
                            </p>
                            {attendee.email && (
                              <p className="text-xs text-gray-500">{attendee.email}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRemoveAttendee(selectedEvent.id, attendee.id)}
                          disabled={removingAttendeeId === attendee.id}
                        >
                          {removingAttendeeId === attendee.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <UserMinus className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No attendees</p>
                )}

                {/* Add Attendee */}
                <div className="mt-3 flex gap-2">
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a user to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {allUsers
                        .filter(user => !selectedEvent.attendees?.some(a => a.id === user.id))
                        .map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => handleAddAttendee(selectedEvent.id, selectedUserId)}
                    disabled={!selectedUserId || addingAttendee}
                  >
                    {addingAttendee ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsEventModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}