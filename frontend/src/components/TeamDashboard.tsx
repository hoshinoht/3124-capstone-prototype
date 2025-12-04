import { TrendingUp, Users, Target, Video, ExternalLink, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

export function TeamDashboard() {
  const meetings = [
    {
      id: 1,
      title: "Math Weekly Meeting",
      host: "Robert",
      date: "Today at 10:30 AM",
      duration: "1 hour",
      participants: 7,
      status: "Upcoming",
      badgeColor: "bg-blue-100 text-blue-700",
    },
    {
      id: 2,
      title: "AMK Hub Project Sync",
      host: "David",
      date: "Today at 2:00 PM",
      duration: "1 hour",
      participants: 12,
      status: "Completed",
      badgeColor: "bg-green-100 text-green-700",
    },
    {
      id: 3,
      title: "Sports Hub Coordination",
      host: "John",
      date: "Today at 11:38 AM",
      duration: "2 hours",
      participants: 15,
      status: "Upcoming",
      badgeColor: "bg-blue-100 text-blue-700",
    },
    {
      id: 4,
      title: "VenCity Client Review",
      host: "Veronica",
      date: "Tomorrow at 11:30 AM",
      duration: "1 hour",
      participants: 9,
      status: "Upcoming",
      badgeColor: "bg-blue-100 text-blue-700",
    },
    {
      id: 5,
      title: "AMK Hub Engineering Sync",
      host: "David",
      date: "Friday at 10:00 AM",
      duration: "1 hour",
      participants: 12,
      status: "Upcoming",
      badgeColor: "bg-blue-100 text-blue-700",
    },
  ];

  const quickLinks = [
    {
      id: 1,
      title: "Math Weekly Meeting",
      subtitle: "Meeting on Wednesday at 1:15 PM EST",
      host: "Robert",
      status: "Pinned",
      badgeColor: "bg-gray-900 text-white",
    },
    {
      id: 2,
      title: "AMK Hub Project Sync",
      subtitle: "Check-in meeting on 07:57 AM",
      host: "Sarah",
      status: "Pinned",
      badgeColor: "bg-gray-900 text-white",
    },
    {
      id: 3,
      title: "Sports Hub Coordination",
      subtitle: "Team standup at 3:25 PM EST",
      host: "Sarah",
      status: "Pinned",
      badgeColor: "bg-gray-900 text-white",
    },
    {
      id: 4,
      title: "VenCity Client Review",
      subtitle: "Meeting on Wednesday at 1:25 PM EST",
      host: "Brandon",
      status: "",
      badgeColor: "",
    },
    {
      id: 5,
      title: "Project Documentation",
      subtitle: "Access to all project documents",
      host: "",
      status: "",
      badgeColor: "",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl text-gray-900 mb-1">Team Dashboard</h1>
        <p className="text-sm text-gray-600">Thursday, November 21, 2025</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Projects</p>
                <p className="text-3xl text-gray-900">12</p>
                <p className="text-xs text-gray-500 mt-1">In this month</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Team Members</p>
                <p className="text-3xl text-gray-900">24</p>
                <p className="text-xs text-gray-500 mt-1">Across 2 departments</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed Tasks</p>
                <p className="text-3xl text-gray-900">87</p>
                <p className="text-xs text-gray-500 mt-1">In this week</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Meetings Today</p>
                <p className="text-3xl text-gray-900">3</p>
                <p className="text-xs text-gray-500 mt-1">3 upcoming</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-between">
                <Video className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-6">
        {/* Recent Meetings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Meetings</CardTitle>
                <CardDescription>Upcoming and past meetings</CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
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
                      <Badge className={meeting.badgeColor}>{meeting.status}</Badge>
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
                        <Badge className={link.badgeColor} variant="secondary">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
