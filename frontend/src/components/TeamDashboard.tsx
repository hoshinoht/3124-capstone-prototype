import { useState, useEffect } from "react";
import { TrendingUp, Users, Target, Video, ExternalLink, Clock, Loader2, AlertTriangle, ArrowLeft, Search, Download, MapPin, Smartphone, CheckCircle, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { dashboardApi, projectsApi, usersApi, tasksApi, eventsApi } from "../services/api";

interface DashboardStats {
  activeProjects: number;
  teamMembers: number;
  departmentsCount: number;
  completedTasks: number;
  meetingsToday: number;
  pendingTasks: number;
  urgentTasks: number;
}

interface Meeting {
  id: number;
  title: string;
  host: string;
  date: string;
  duration: string;
  participants: number;
  status: string;
}

interface QuickLink {
  id: number;
  title: string;
  subtitle: string;
  host?: string;
  status?: string;
}

type DetailView = "projects" | "members" | "tasks" | "meetings" | null;

interface TeamDashboardProps {
  onNavigate?: (tab: string) => void;
}

export function TeamDashboard({ onNavigate }: TeamDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    activeProjects: 0,
    teamMembers: 0,
    departmentsCount: 0,
    completedTasks: 0,
    meetingsToday: 0,
    pendingTasks: 0,
    urgentTasks: 0,
  });
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail view state
  const [activeDetail, setActiveDetail] = useState<DetailView>(null);
  const [detailData, setDetailData] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterValue, setFilterValue] = useState("all");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await dashboardApi.getData();

        if (response.data?.stats) {
          setStats(response.data.stats);
        }
        if (response.data?.recentMeetings) {
          setMeetings(response.data.recentMeetings.map((m: any) => ({
            id: m.id,
            title: m.title,
            host: m.host || "Unknown",
            date: m.date || "",
            duration: m.duration || "1 hour",
            participants: m.participants || 0,
            status: m.status || "Upcoming",
          })));
        }
        if (response.data?.quickLinks) {
          setQuickLinks(response.data.quickLinks.map((l: any) => ({
            id: l.id,
            title: l.title,
            subtitle: l.subtitle || l.schedule || l.description || "",
            host: l.host,
            status: l.status,
          })));
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Handle stat card click
  const handleCardClick = async (view: DetailView) => {
    setActiveDetail(view);
    setDetailLoading(true);
    setSearchQuery("");
    setFilterValue("all");

    try {
      switch (view) {
        case "projects":
          const projectsRes = await projectsApi.getAll({ status: "active" });
          setDetailData(projectsRes.data?.projects || []);
          break;
        case "members":
          const usersRes = await usersApi.getAll();
          setDetailData(usersRes.data?.users || []);
          break;
        case "tasks":
          const tasksRes = await tasksApi.getAll({ isCompleted: true });
          setDetailData(tasksRes.data?.tasks || []);
          break;
        case "meetings":
          const today = new Date().toISOString().split('T')[0];
          const eventsRes = await eventsApi.getAll({ startDate: today, endDate: today });
          setDetailData(eventsRes.data?.events || []);
          break;
      }
    } catch (err) {
      console.error("Failed to fetch detail data:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBackToOverview = () => {
    setActiveDetail(null);
    setDetailData([]);
    setSearchQuery("");
    setFilterValue("all");
  };

  // Filter detail data based on search and filter
  const filteredDetailData = detailData.filter((item: any) => {
    const searchLower = searchQuery.toLowerCase();
    let matchesSearch = true;
    let matchesFilter = true;

    if (searchQuery) {
      if (activeDetail === "projects") {
        matchesSearch = item.name?.toLowerCase().includes(searchLower);
      } else if (activeDetail === "members") {
        matchesSearch =
          item.firstName?.toLowerCase().includes(searchLower) ||
          item.lastName?.toLowerCase().includes(searchLower) ||
          item.email?.toLowerCase().includes(searchLower);
      } else if (activeDetail === "tasks") {
        matchesSearch = item.title?.toLowerCase().includes(searchLower);
      } else if (activeDetail === "meetings") {
        matchesSearch = item.title?.toLowerCase().includes(searchLower);
      }
    }

    if (filterValue !== "all") {
      if (activeDetail === "members") {
        matchesFilter = item.department === filterValue;
      } else if (activeDetail === "tasks") {
        matchesFilter = item.urgency === filterValue;
      } else if (activeDetail === "projects") {
        matchesFilter = item.status === filterValue;
      }
    }

    return matchesSearch && matchesFilter;
  });

  const getDetailTitle = () => {
    switch (activeDetail) {
      case "projects": return "Active Projects";
      case "members": return "Team Members";
      case "tasks": return "Completed Tasks";
      case "meetings": return "Today's Meetings";
      default: return "";
    }
  };

  const getDetailSubtitle = () => {
    switch (activeDetail) {
      case "projects": return "All active projects in this month";
      case "members": return "Real-time team member overview";
      case "tasks": return "Tasks completed this week";
      case "meetings": return "Scheduled meetings for today";
      default: return "";
    }
  };

  const getBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "upcoming":
        return "bg-blue-100 text-blue-700";
      case "in progress":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getQuickLinkBadgeColor = (status?: string) => {
    if (!status) return "";
    if (status.toLowerCase() === "pinned") return "bg-gray-900 text-white";
    return "bg-gray-100 text-gray-700";
  };

  const getAvatarColor = (name?: string) => {
    const colors = [
      "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444",
      "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1"
    ];
    if (!name) return colors[0];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl text-gray-900 mb-1">Team Dashboard</h1>
        <p className="text-sm text-gray-600">{today}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className={`cursor-pointer transition-all hover:shadow-lg hover:border-blue-300 ${activeDetail === "projects" ? "ring-2 ring-blue-500 bg-blue-50" : ""}`}
          onClick={() => handleCardClick("projects")}
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Projects</p>
                <p className="text-3xl text-gray-900">{stats.activeProjects}</p>
                <p className="text-xs text-gray-500 mt-1">In this month</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-lg hover:border-green-300 ${activeDetail === "members" ? "ring-2 ring-green-500 bg-green-50" : ""}`}
          onClick={() => handleCardClick("members")}
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Team Members</p>
                <p className="text-3xl text-gray-900">{stats.teamMembers}</p>
                <p className="text-xs text-gray-500 mt-1">Across {stats.departmentsCount} department{stats.departmentsCount !== 1 ? 's' : ''}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-lg hover:border-purple-300 ${activeDetail === "tasks" ? "ring-2 ring-purple-500 bg-purple-50" : ""}`}
          onClick={() => handleCardClick("tasks")}
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed Tasks</p>
                <p className="text-3xl text-gray-900">{stats.completedTasks}</p>
                <p className="text-xs text-gray-500 mt-1">In this week</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-lg hover:border-orange-300 ${activeDetail === "meetings" ? "ring-2 ring-orange-500 bg-orange-50" : ""}`}
          onClick={() => handleCardClick("meetings")}
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Meetings Today</p>
                <p className="text-3xl text-gray-900">{stats.meetingsToday}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.pendingTasks} pending tasks</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Video className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail View Panel */}
      {activeDetail && (
        <Card className="mt-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={handleBackToOverview}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <CardTitle>{getDetailTitle()}</CardTitle>
                  <CardDescription>{getDetailSubtitle()}</CardDescription>
                </div>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Filters */}
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={`Search ${activeDetail}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {activeDetail === "members" && (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="IT">IT</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Both">Both</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {activeDetail === "tasks" && (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Urgency</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {activeDetail === "projects" && (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Detail Table */}
            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : filteredDetailData.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No {activeDetail} found</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full border-collapse">
                  {/* Table Header */}
                  <thead className="bg-gray-50 border-b">
                    {activeDetail === "members" && (
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: "30%" }}>Personnel</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    )}
                    {activeDetail === "projects" && (
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: "40%" }}>Project</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasks</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    )}
                    {activeDetail === "tasks" && (
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: "40%" }}>Task</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Urgency</th>
                      </tr>
                    )}
                    {activeDetail === "meetings" && (
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: "35%" }}>Meeting</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    )}
                  </thead>

                  {/* Table Body */}
                  <tbody className="bg-white">
                    {activeDetail === "members" && filteredDetailData.map((member: any) => (
                      <tr key={member.id} className="hover:bg-gray-50 border-b border-gray-100">
                        <td className="px-6 text-sm text-gray-600" style={{ paddingTop: "20px", paddingBottom: "20px" }}>
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                              style={{ backgroundColor: getAvatarColor(member.firstName) }}
                            >
                              {member.firstName?.[0]}{member.lastName?.[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{member.firstName} {member.lastName}</p>
                              <p className="text-xs text-gray-500">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 text-sm text-gray-600" style={{ paddingTop: "20px", paddingBottom: "20px" }}>{member.department}</td>
                        <td className="px-6 text-sm text-gray-600 capitalize" style={{ paddingTop: "20px", paddingBottom: "20px" }}>{member.role}</td>
                        <td className="px-6 text-sm text-gray-500" style={{ paddingTop: "20px", paddingBottom: "20px" }}>
                          {member.lastLogin ? new Date(member.lastLogin).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-6" style={{ paddingTop: "20px", paddingBottom: "20px" }}>
                          <Badge className={member.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                            {member.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                      </tr>
                    ))}

                    {activeDetail === "projects" && filteredDetailData.map((project: any) => (
                      <tr key={project.id} className="hover:bg-gray-50 border-b border-gray-100">
                        <td className="px-6" style={{ paddingTop: "20px", paddingBottom: "20px" }}>
                          <p className="text-sm font-medium text-gray-900">{project.name}</p>
                          <p className="text-xs text-gray-500 line-clamp-1">{project.description || 'No description'}</p>
                        </td>
                        <td className="px-6" style={{ paddingTop: "20px", paddingBottom: "20px" }}>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Users className="w-4 h-4" />
                            {project.memberCount || 0}
                          </div>
                        </td>
                        <td className="px-6" style={{ paddingTop: "20px", paddingBottom: "20px" }}>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Target className="w-4 h-4" />
                            {project.taskCount || 0}
                          </div>
                        </td>
                        <td className="px-6" style={{ paddingTop: "20px", paddingBottom: "20px" }}>
                          <Badge className={
                            project.status === 'active' ? "bg-green-100 text-green-700" :
                              project.status === 'completed' ? "bg-blue-100 text-blue-700" :
                                "bg-gray-100 text-gray-700"
                          }>
                            {project.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}

                    {activeDetail === "tasks" && filteredDetailData.map((task: any) => (
                      <tr key={task.id} className="hover:bg-gray-50 border-b border-gray-100">
                        <td className="px-6" style={{ paddingTop: "20px", paddingBottom: "20px" }}>
                          <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{task.title}</p>
                              <p className="text-xs text-gray-500 line-clamp-1">{task.description || 'No description'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 text-sm text-gray-600" style={{ paddingTop: "20px", paddingBottom: "20px" }}>{task.projectName || 'No project'}</td>
                        <td className="px-6 text-sm text-gray-500" style={{ paddingTop: "20px", paddingBottom: "20px" }}>
                          {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6" style={{ paddingTop: "20px", paddingBottom: "20px" }}>
                          <Badge className={
                            task.urgency === 'urgent' ? "bg-red-100 text-red-700" :
                              task.urgency === 'high' ? "bg-orange-100 text-orange-700" :
                                task.urgency === 'medium' ? "bg-yellow-100 text-yellow-700" :
                                  "bg-gray-100 text-gray-700"
                          }>
                            {task.urgency}
                          </Badge>
                        </td>
                      </tr>
                    ))}

                    {activeDetail === "meetings" && filteredDetailData.map((meeting: any) => (
                      <tr key={meeting.id} className="hover:bg-gray-50 border-b border-gray-100">
                        <td className="px-6" style={{ paddingTop: "20px", paddingBottom: "20px" }}>
                          <p className="text-sm font-medium text-gray-900">{meeting.title}</p>
                          <p className="text-xs text-gray-500">{meeting.description || 'No description'}</p>
                        </td>
                        <td className="px-6 text-sm text-gray-600" style={{ paddingTop: "20px", paddingBottom: "20px" }}>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {meeting.startTime} {meeting.endTime ? `- ${meeting.endTime}` : ''}
                          </div>
                        </td>
                        <td className="px-6 text-sm text-gray-600" style={{ paddingTop: "20px", paddingBottom: "20px" }}>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {meeting.location || 'TBD'}
                          </div>
                        </td>
                        <td className="px-6" style={{ paddingTop: "20px", paddingBottom: "20px" }}>
                          <Badge className={
                            meeting.status === 'completed' ? "bg-gray-100 text-gray-700" :
                              "bg-blue-100 text-blue-700"
                          }>
                            {meeting.status || 'Upcoming'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-6">
        {/* Recent Meetings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Meetings</CardTitle>
                <CardDescription>Upcoming and past meetings</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate?.("tasks")}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {meetings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No meetings scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {meetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Video className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm text-gray-900">{meeting.title}</h4>
                        <Badge className={getBadgeColor(meeting.status)}>{meeting.status}</Badge>
                      </div>
                      <p className="text-xs text-gray-600">Hosted by {meeting.host}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {meeting.date}
                        </span>
                        <span>•</span>
                        <span>{meeting.duration}</span>
                        <span>•</span>
                        <span>{meeting.participants} participants</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Join Meeting
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Quick Links</CardTitle>
                <CardDescription>One-click access to important resources</CardDescription>
              </div>
              <Button variant="ghost" size="icon">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {quickLinks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ExternalLink className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No quick links available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quickLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Video className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <h4 className="text-sm text-gray-900">{link.title}</h4>
                        {link.status && (
                          <Badge className={getQuickLinkBadgeColor(link.status)} variant="secondary">
                            {link.status}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">{link.subtitle}</p>
                      {link.host && (
                        <p className="text-xs text-gray-500 mt-1">Host: {link.host}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1">
                      Open
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
